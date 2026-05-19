import { NextRequest, NextResponse, after } from "next/server"
import crypto from "crypto"
import { createAdminClient } from "@/lib/supabase/admin"
import {
  adjustInventoryForOrderAsAdmin,
  restoreInventoryForOrderAsAdmin,
  getOrderByIdAsAdmin,
} from "@/lib/db/supabase"
import {
  sendOrderNotificationEmail,
  sendCustomerOrderConfirmedEmail,
} from "@/lib/email"
import { applyWebhook } from "@/lib/link-money/payment-service"
import type { LinkMoneyWebhookBody } from "@/lib/link-money/payment-types"
import {
  logWebhook,
  type WebhookLogEntry,
} from "@/lib/link-money/webhook-log"
import { reserveWebhookEvent } from "@/lib/payments/webhook-dedupe"

const MAX_TIMESTAMP_SKEW_MS = 5 * 60 * 1000
const PROVIDER = "link_money"

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
      await logWebhook(entry)
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

  const reservation = await reserveWebhookEvent(PROVIDER, uniqueId)
  if (reservation === "duplicate") {
    return finish(
      200,
      null,
      { received: true, duplicate: true },
      { signatureValid: true }
    )
  }
  if (reservation === "error") {
    // Returning 5xx tells Link Money to retry — preferable to silently
    // dropping the event when the dedupe layer is unavailable.
    return finish(
      503,
      "dedupe store unavailable",
      { error: "Dedupe store unavailable, please retry" },
      { signatureValid: true }
    )
  }

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

// Rank gates forward-only progression of orders.payment_status so an
// out-of-order webhook (e.g. authorized arriving after succeeded) can't
// regress visible state. FAILED is handled out-of-band below.
const ORDER_PAYMENT_STATUS_RANK: Record<string, number> = {
  pending: 0,
  authorized: 1,
  processing: 2,
  paid: 3,
  refunded: 4,
}

const PAYMENT_TO_ORDER_STATUS: Record<string, string> = {
  AUTHORIZED: "authorized",
  INITIATED: "processing",
  SUCCEEDED: "paid",
}

async function syncOrderFromPayment(
  orderId: string,
  status: string
): Promise<void> {
  // Load the FULL order once, up front. Earlier versions did a 4-field SELECT
  // here and re-fetched the full row after the UPDATE to feed the email
  // dispatch — any transient read failure on the re-fetch silently dropped
  // the notification email. We now use the in-memory copy throughout.
  const fullOrder = await getOrderByIdAsAdmin(orderId)
  if (!fullOrder) return

  const supabase = createAdminClient()

  if (status === "FAILED") {
    if (fullOrder.paymentStatus === "failed") return

    if (fullOrder.paymentStatus === "paid") {
      await restoreInventoryForOrderAsAdmin(fullOrder.id)
    }

    await supabase
      .from("orders")
      .update({
        payment_status: "failed",
        status: "cancelled",
        updated_at: new Date().toISOString(),
      })
      .eq("id", fullOrder.id)
    return
  }

  const nextOrderPaymentStatus = PAYMENT_TO_ORDER_STATUS[status]
  if (!nextOrderPaymentStatus) return

  const currentRank = ORDER_PAYMENT_STATUS_RANK[fullOrder.paymentStatus] ?? 0
  const nextRank = ORDER_PAYMENT_STATUS_RANK[nextOrderPaymentStatus] ?? 0
  if (nextRank <= currentRank) return

  if (nextOrderPaymentStatus === "paid") {
    // Idempotent atomic decrement. A redelivered webhook will see
    // already_adjusted=true and become a no-op.
    const adjustResult = await adjustInventoryForOrderAsAdmin(fullOrder.id)

    if (adjustResult.rpcError) {
      // Surface as an exception so the outer background handler logs it.
      // Link Money will redeliver the event because we never bumped status.
      console.error("Link Money: inventory rpc failed; will retry", {
        orderId: fullOrder.id,
      })
      throw new Error("inventory rpc failed")
    }

    if (!adjustResult.ok) {
      // Payment succeeded but stock was insufficient. Do NOT block the
      // payment_status update — admin needs to intervene (refund/restock),
      // and leaving the order stuck in "processing" forever is worse than
      // marking it paid with a loud log.
      console.error(
        "Link Money: PAYMENT TAKEN BUT INVENTORY SHORT — admin action required",
        { orderId: fullOrder.id, shortfalls: adjustResult.shortfalls }
      )
    }

    const nextOrderStatus =
      fullOrder.status === "pending" ? "processing" : fullOrder.status

    await supabase
      .from("orders")
      .update({
        payment_status: "paid",
        status: nextOrderStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", fullOrder.id)

    const paidOrder = {
      ...fullOrder,
      paymentStatus: "paid" as const,
      status: nextOrderStatus,
    }

    sendOrderNotificationEmail(paidOrder).catch((err) =>
      console.error("support notif email failed", err)
    )
    sendCustomerOrderConfirmedEmail(paidOrder).catch((err) =>
      console.error("customer paid-confirmation email failed", err)
    )

    return
  }

  // Intermediate states: surface progress to the admin without firing
  // inventory adjustment or the customer notification email.
  await supabase
    .from("orders")
    .update({
      payment_status: nextOrderPaymentStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("id", fullOrder.id)
}
