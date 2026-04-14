import { NextRequest, NextResponse, after } from "next/server"
import crypto from "crypto"
import { createAdminClient } from "@/lib/supabase/admin"
import {
  adjustInventoryForOrderAsAdmin,
  restoreInventoryForOrderAsAdmin,
  getOrderByIdAsAdmin,
} from "@/lib/db/supabase"
import { sendOrderNotificationEmail } from "@/lib/email"
import { applyWebhook } from "@/lib/link-money/payment-service"
import type { LinkMoneyWebhookBody } from "@/lib/link-money/payment-types"
import {
  logWebhook,
  notifyWebhookReceived,
  type WebhookLogEntry,
} from "@/lib/link-money/webhook-log"

const MAX_TIMESTAMP_SKEW_MS = 5 * 60 * 1000
const processedUniqueIds = new Set<string>()
const PROCESSED_IDS_MAX = 5000

function rememberUniqueId(uniqueId: string): void {
  if (processedUniqueIds.size >= PROCESSED_IDS_MAX) {
    const oldest = processedUniqueIds.values().next().value
    if (oldest) processedUniqueIds.delete(oldest)
  }
  processedUniqueIds.add(uniqueId)
}

function verifySignature(params: {
  secret: string
  uniqueId: string
  timestamp: string
  rawBody: string
  signature: string
}): boolean {
  const { secret, uniqueId, timestamp, rawBody, signature } = params
  const payload = `${uniqueId}.${timestamp}.${rawBody}`
  const expected = crypto
    .createHmac("sha512", secret)
    .update(payload, "utf8")
    .digest("base64")

  const expectedBuf = Buffer.from(expected, "utf8")
  const actualBuf = Buffer.from(signature, "utf8")
  if (expectedBuf.length !== actualBuf.length) return false
  return crypto.timingSafeEqual(expectedBuf, actualBuf)
}

function isFreshTimestamp(timestampSeconds: string): boolean {
  const ts = Number(timestampSeconds)
  if (!Number.isFinite(ts)) return false
  const ageMs = Math.abs(Date.now() - ts * 1000)
  return ageMs <= MAX_TIMESTAMP_SKEW_MS
}

export async function POST(req: NextRequest) {
  const headers = headersToObject(req)
  const rawBody = await req.text()

  const signature = req.headers.get("x-signature")
  const timestamp = req.headers.get("x-signature-timestamp")
  const uniqueId = req.headers.get("x-signature-uniqueid")
  const webhookSecret = process.env.LINK_MONEY_WEBHOOK_SECRET

  const baseEntry = (overrides: Partial<WebhookLogEntry>): WebhookLogEntry => ({
    eventType: null,
    clientReferenceId: null,
    transactionId: null,
    signatureValid: false,
    headers,
    body: null,
    rawBody,
    statusCode: 200,
    error: null,
    ...overrides,
  })

  const finish = (
    statusCode: number,
    error: string | null,
    responseBody: Record<string, unknown>,
    entryOverrides: Partial<WebhookLogEntry> = {}
  ) => {
    const entry = baseEntry({ ...entryOverrides, statusCode, error })
    after(async () => {
      await Promise.allSettled([
        logWebhook(entry),
        notifyWebhookReceived(entry),
      ])
    })
    return NextResponse.json(responseBody, { status: statusCode })
  }

  if (!webhookSecret) {
    console.error("LINK_MONEY_WEBHOOK_SECRET not configured")
    return finish(500, "webhook secret not configured", {
      error: "Webhook not configured",
    })
  }

  if (!signature || !timestamp || !uniqueId) {
    return finish(400, "missing signature headers", {
      error: "Missing signature headers",
    })
  }

  if (!isFreshTimestamp(timestamp)) {
    return finish(401, "stale or invalid timestamp", {
      error: "Stale signature",
    })
  }

  const signatureValid = verifySignature({
    secret: webhookSecret,
    uniqueId,
    timestamp,
    rawBody,
    signature,
  })

  if (!signatureValid) {
    return finish(401, "invalid signature", { error: "Invalid signature" })
  }

  if (processedUniqueIds.has(uniqueId)) {
    return finish(
      200,
      null,
      { received: true, duplicate: true },
      { signatureValid: true }
    )
  }
  rememberUniqueId(uniqueId)

  let body: LinkMoneyWebhookBody
  try {
    body = JSON.parse(rawBody) as LinkMoneyWebhookBody
  } catch (err) {
    return finish(
      400,
      err instanceof Error ? err.message : "invalid JSON",
      { error: "Invalid JSON" },
      { signatureValid: true }
    )
  }

  const eventType = body.eventType ?? null
  const clientReferenceId =
    body.metadata?.clientReferenceId ?? body.clientReferenceId ?? null
  const resourceId =
    body.metadata?.resourceId ??
    body.resourceId ??
    body.metadata?.transactionId ??
    body.transactionId ??
    null

  console.log("Link Money webhook received", { eventType, resourceId, uniqueId })

  if (!eventType) {
    return finish(
      400,
      "missing eventType",
      { error: "Missing eventType" },
      {
        signatureValid: true,
        body,
        clientReferenceId,
        transactionId: resourceId,
      }
    )
  }

  after(async () => {
    try {
      const result = await applyWebhook(body)
      if (!result.payment) {
        console.warn("Link Money webhook: skipped", {
          eventType,
          reason: result.reason,
        })
        return
      }
      if (result.applied && result.payment.orderId) {
        await syncOrderFromPayment(
          result.payment.orderId,
          result.payment.status
        )
      }
    } catch (err) {
      console.error("Link Money webhook: background processing failed", err)
    }
  })

  return finish(
    200,
    null,
    { received: true },
    {
      signatureValid: true,
      eventType,
      clientReferenceId,
      transactionId: resourceId,
      body,
    }
  )
}

function headersToObject(req: NextRequest): Record<string, string> {
  const out: Record<string, string> = {}
  req.headers.forEach((value, key) => {
    if (key.toLowerCase() === "authorization") {
      out[key] = "[redacted]"
      return
    }
    out[key] = value
  })
  return out
}

async function syncOrderFromPayment(
  orderId: string,
  status: string
): Promise<void> {
  const supabase = createAdminClient()

  const { data: order } = await supabase
    .from("orders")
    .select("id, payment_status, status, order_number")
    .eq("id", orderId)
    .single()

  if (!order) return

  if (
    status === "AUTHORIZED" ||
    status === "INITIATED" ||
    status === "SUCCEEDED"
  ) {
    if (order.payment_status === "paid") return

    await adjustInventoryForOrderAsAdmin(order.id)

    await supabase
      .from("orders")
      .update({
        payment_status: "paid",
        status: order.status === "pending" ? "processing" : order.status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", order.id)

    getOrderByIdAsAdmin(order.id)
      .then((full) => full && sendOrderNotificationEmail(full))
      .catch((err) => console.error("notif email failed", err))

    return
  }

  if (status === "FAILED") {
    if (order.payment_status === "failed") return

    if (order.payment_status === "paid") {
      await restoreInventoryForOrderAsAdmin(order.id)
    }

    await supabase
      .from("orders")
      .update({
        payment_status: "failed",
        status: "cancelled",
        updated_at: new Date().toISOString(),
      })
      .eq("id", order.id)
  }
}
