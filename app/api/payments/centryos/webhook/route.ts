import { NextRequest, NextResponse, after } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import {
  adjustInventoryForOrderAsAdmin,
  restoreInventoryForOrderAsAdmin,
  getOrderByIdAsAdmin,
} from "@/lib/db/supabase"
import { sendOrderNotificationEmail } from "@/lib/email"
import {
  applyCollectionWebhook,
  verifyWebhookSignature,
} from "@/lib/centryos/payment-service"
import type { CentryOSWebhookBody } from "@/lib/centryos/payment-types"
import {
  logWebhook,
  notifyWebhookReceived,
  type CentryOSWebhookLogEntry,
} from "@/lib/centryos/webhook-log"
import { reserveWebhookEvent } from "@/lib/payments/webhook-dedupe"

const PROVIDER = "centryos"

/**
 * POST /api/payments/centryos/webhook
 *
 * CentryOS calls this endpoint with HMAC-SHA512(rawBody) in the
 * `signature` header. The raw body MUST be read as text BEFORE any
 * JSON parsing or framework hooks mutate it, otherwise the HMAC will
 * not match.
 */
export async function POST(req: NextRequest) {
  const headers = headersToObject(req)
  const rawBody = await req.text()
  const signature = req.headers.get("signature")

  const baseEntry = (
    overrides: Partial<CentryOSWebhookLogEntry>
  ): CentryOSWebhookLogEntry => ({
    eventType: null,
    status: null,
    orderId: null,
    paymentLinkId: null,
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
    entryOverrides: Partial<CentryOSWebhookLogEntry> = {}
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

  if (!process.env.CENTRYOS_WEBHOOK_SECRET) {
    console.error("CENTRYOS_WEBHOOK_SECRET not configured")
    return finish(500, "webhook secret not configured", {
      error: "Webhook not configured",
    })
  }

  const signatureValid = verifyWebhookSignature(rawBody, signature)
  if (!signatureValid) {
    return finish(401, "invalid signature", { error: "Invalid signature" })
  }

  let body: CentryOSWebhookBody
  try {
    body = JSON.parse(rawBody) as CentryOSWebhookBody
  } catch (err) {
    return finish(
      400,
      err instanceof Error ? err.message : "invalid JSON",
      { error: "Invalid JSON" },
      { signatureValid: true }
    )
  }

  const eventType = body?.eventType ?? null
  const status = body?.status ?? null
  const orderId =
    (body?.payload?.metadata?.orderId as string | undefined) ?? null
  const paymentLinkId = body?.paymentLink?.id ?? null
  const transactionId = body?.payload?.transactionId ?? null

  // Build a dedupe key. CentryOS does not document a stable event id;
  // we synthesize one from (transactionId or paymentLink.id) plus
  // status, which is unique per terminal lifecycle event.
  const dedupeKey =
    transactionId && status
      ? `${transactionId}:${status}`
      : paymentLinkId && status
        ? `link:${paymentLinkId}:${status}`
        : null

  if (dedupeKey) {
    const reservation = await reserveWebhookEvent(PROVIDER, dedupeKey)
    if (reservation === "duplicate") {
      return finish(
        200,
        null,
        { received: true, duplicate: true },
        {
          signatureValid: true,
          eventType,
          status,
          orderId,
          paymentLinkId,
          transactionId,
          body,
        }
      )
    }
    if (reservation === "error") {
      return finish(
        503,
        "dedupe store unavailable",
        { error: "Dedupe store unavailable, please retry" },
        {
          signatureValid: true,
          eventType,
          status,
          orderId,
          paymentLinkId,
          transactionId,
          body,
        }
      )
    }
  }

  console.log("CentryOS webhook received", {
    eventType,
    status,
    orderId,
    paymentLinkId,
    transactionId,
  })

  // Defer business processing so the webhook ACK isn't blocked on
  // inventory/email work. CentryOS only needs a 200 to stop retrying.
  after(async () => {
    try {
      if ((eventType ?? "").toUpperCase() !== "COLLECTION") {
        // Unknown event types are stored above and ignored here.
        return
      }
      const result = await applyCollectionWebhook(body)
      if (!result.payment) {
        console.warn("CentryOS webhook: payment row not found", {
          orderId,
          paymentLinkId,
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
      console.error("CentryOS webhook: background processing failed", err)
    }
  })

  return finish(
    200,
    null,
    { received: true },
    {
      signatureValid: true,
      eventType,
      status,
      orderId,
      paymentLinkId,
      transactionId,
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
    if (key.toLowerCase() === "signature") {
      // Don't log secrets or full HMACs in plain text.
      out[key] = `${value.slice(0, 8)}…(${value.length})`
      return
    }
    out[key] = value
  })
  return out
}

// Forward-only rank for orders.payment_status (mirrors link-money).
const ORDER_PAYMENT_STATUS_RANK: Record<string, number> = {
  pending: 0,
  authorized: 1,
  processing: 2,
  paid: 3,
  refunded: 4,
}

// Internal payment status → orders.payment_status.
const PAYMENT_TO_ORDER_STATUS: Record<string, string> = {
  PROCESSING: "processing",
  SUCCEEDED: "paid",
}

/**
 * Sync the orders row from the latest payments row state. FAILED /
 * EXPIRED / CANCELLED collapse onto a "failed + cancelled" terminal
 * since CentryOS exposes no recovery path for the customer.
 */
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

  if (status === "FAILED" || status === "EXPIRED" || status === "CANCELLED") {
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
    return
  }

  const nextOrderPaymentStatus = PAYMENT_TO_ORDER_STATUS[status]
  if (!nextOrderPaymentStatus) return

  const currentRank = ORDER_PAYMENT_STATUS_RANK[order.payment_status] ?? 0
  const nextRank = ORDER_PAYMENT_STATUS_RANK[nextOrderPaymentStatus] ?? 0
  if (nextRank <= currentRank) return

  if (nextOrderPaymentStatus === "paid") {
    const adjustResult = await adjustInventoryForOrderAsAdmin(order.id)

    if (adjustResult.rpcError) {
      // Surface as an exception so CentryOS will redeliver — we never
      // bumped order.payment_status, so reprocessing is safe.
      console.error("CentryOS: inventory rpc failed; will retry", {
        orderId: order.id,
      })
      throw new Error("inventory rpc failed")
    }

    if (!adjustResult.ok) {
      console.error(
        "CentryOS: PAYMENT TAKEN BUT INVENTORY SHORT — admin action required",
        { orderId: order.id, shortfalls: adjustResult.shortfalls }
      )
    }

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

  // Intermediate states — surface progress without touching inventory
  // or sending the customer notification email.
  await supabase
    .from("orders")
    .update({
      payment_status: nextOrderPaymentStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("id", order.id)
}
