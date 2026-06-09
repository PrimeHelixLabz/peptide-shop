import { NextRequest, NextResponse, after } from "next/server"
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
import {
  applyCollectionWebhook,
  verifyWebhookSignature,
} from "@/lib/centryos/payment-service"
import { confirmRedemption } from "@/lib/discounts/db"
import type { CentryOSWebhookBody } from "@/lib/centryos/payment-types"
import {
  logWebhook,
  logProcessingTrace,
  type CentryOSWebhookLogEntry,
  type ProcessingLogContext,
  type ProcessingOutcome,
} from "@/lib/centryos/webhook-log"
import { ProcessingTrace } from "@/lib/centryos/processing-trace"
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
      await logWebhook(entry)
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
  // CentryOS echoes the original customData under payload.paymentLink.
  // payload.metadata holds checkout-form fields (Email, First/Last name,
  // Phone), NOT our orderId/clientReferenceId. Fall back to metadata and
  // top-level paymentLink for any future shape drift.
  const customData = body?.payload?.paymentLink?.customData ?? undefined
  const orderId =
    (customData?.orderId as string | undefined) ??
    (body?.payload?.metadata?.orderId as string | undefined) ??
    null
  const paymentLinkId =
    body?.payload?.paymentLink?.id ?? body?.paymentLink?.id ?? null
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
  // Every step is recorded on a ProcessingTrace so the final outcome
  // is persisted to centryos_processing_logs and emailed for debugging.
  after(async () => {
    const trace = new ProcessingTrace()
    trace.attach("eventType", eventType)
    trace.attach("status", status)
    trace.attach("orderId", orderId)
    trace.attach("paymentLinkId", paymentLinkId)
    trace.attach("transactionId", transactionId)
    trace.attach("dedupeKey", dedupeKey)

    let outcome: ProcessingOutcome = "skipped"
    let reason: string | null = null
    let topError: string | null = null

    try {
      if ((eventType ?? "").toUpperCase() !== "COLLECTION") {
        trace.step("processing.unsupported_event", true, { eventType })
        reason = `non-COLLECTION event: ${eventType ?? "null"}`
      } else {
        const result = await applyCollectionWebhook(body, trace)
        if (!result.payment) {
          reason = result.reason ?? "payment row not found"
          trace.step("processing.payment_not_found", false, {
            reason,
          })
        } else if (!result.applied) {
          reason = result.reason ?? "no state change"
          trace.step("processing.no_change", true, {
            reason,
            currentStatus: result.payment.status,
          })
        } else {
          if (result.payment.orderId) {
            await syncOrderFromPayment(
              result.payment.orderId,
              result.payment.status,
              trace
            )
          } else {
            trace.step("processing.skip_order_sync", true, {
              reason: "payment row has no order_id",
            })
          }
          outcome = "applied"
          reason = `payment → ${result.payment.status}`
        }
      }
    } catch (err) {
      outcome = "failed"
      topError = err instanceof Error ? err.message : String(err)
      trace.step("processing.threw", false, undefined, err)
      console.error("CentryOS webhook: background processing failed", err)
    }

    const ctx: ProcessingLogContext = {
      eventType,
      status,
      orderId,
      paymentLinkId,
      transactionId,
      outcome,
      reason,
      error: topError,
    }

    await logProcessingTrace(trace, ctx)
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
  status: string,
  trace?: ProcessingTrace
): Promise<void> {
  // Load the FULL order once, up front. Earlier versions did a 4-field SELECT
  // here and re-fetched the full row after the UPDATE to feed the email
  // dispatch — any transient read failure on the re-fetch silently dropped
  // the notification email. We now use the in-memory copy throughout.
  const fullOrder = await getOrderByIdAsAdmin(orderId)
  if (!fullOrder) {
    trace?.step("sync.order_not_found", false, { orderId })
    return
  }

  const supabase = createAdminClient()

  trace?.attach("orderNumber", fullOrder.orderNumber)
  trace?.step("sync.order_loaded", true, {
    orderId: fullOrder.id,
    payment_status: fullOrder.paymentStatus,
    status: fullOrder.status,
  })

  if (status === "FAILED" || status === "EXPIRED" || status === "CANCELLED") {
    if (fullOrder.paymentStatus === "failed") {
      trace?.step("sync.failed_already", true)
      return
    }

    if (fullOrder.paymentStatus === "paid") {
      await restoreInventoryForOrderAsAdmin(fullOrder.id)
      trace?.step("sync.inventory_restored", true)
    }

    await supabase
      .from("orders")
      .update({
        payment_status: "failed",
        status: "cancelled",
        updated_at: new Date().toISOString(),
      })
      .eq("id", fullOrder.id)
    trace?.step("sync.order_marked_failed", true, {
      payment_status: "failed",
      status: "cancelled",
    })

    // The orders trigger (release_discount_on_order_cancel) releases the
    // reservation automatically on this transition — no JS-side release
    // needed. Refunded orders keep their redemption (Stripe-equivalent).
    return
  }

  const nextOrderPaymentStatus = PAYMENT_TO_ORDER_STATUS[status]
  if (!nextOrderPaymentStatus) {
    trace?.step("sync.unmapped_status", true, { paymentStatus: status })
    return
  }

  const currentRank = ORDER_PAYMENT_STATUS_RANK[fullOrder.paymentStatus] ?? 0
  const nextRank = ORDER_PAYMENT_STATUS_RANK[nextOrderPaymentStatus] ?? 0
  if (nextRank <= currentRank) {
    trace?.step("sync.no_advance", true, {
      from: fullOrder.paymentStatus,
      to: nextOrderPaymentStatus,
      currentRank,
      nextRank,
    })
    return
  }

  if (nextOrderPaymentStatus === "paid") {
    const adjustResult = await adjustInventoryForOrderAsAdmin(fullOrder.id)

    if (adjustResult.rpcError) {
      // Surface as an exception so CentryOS will redeliver — we never
      // bumped order.payment_status, so reprocessing is safe.
      trace?.step("sync.inventory_adjust", false, undefined, "rpc failed")
      console.error("CentryOS: inventory rpc failed; will retry", {
        orderId: fullOrder.id,
      })
      throw new Error("inventory rpc failed")
    }

    if (!adjustResult.ok) {
      trace?.step("sync.inventory_short", false, {
        shortfalls: adjustResult.shortfalls,
      })
      console.error(
        "CentryOS: PAYMENT TAKEN BUT INVENTORY SHORT — admin action required",
        { orderId: fullOrder.id, shortfalls: adjustResult.shortfalls }
      )
    } else {
      trace?.step("sync.inventory_adjust", true)
    }

    // A successful retry can arrive after a prior failed attempt already
    // pushed the order to "cancelled". Money was received, so recover the
    // order back into the fulfilment pipeline rather than leaving it
    // paid-but-cancelled.
    const nextOrderStatus =
      fullOrder.status === "pending" || fullOrder.status === "cancelled"
        ? "processing"
        : fullOrder.status

    await supabase
      .from("orders")
      .update({
        payment_status: "paid",
        status: nextOrderStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", fullOrder.id)
    trace?.step("sync.order_marked_paid", true, {
      payment_status: "paid",
      status: nextOrderStatus,
    })

    const paidOrder = {
      ...fullOrder,
      paymentStatus: "paid" as const,
      status: nextOrderStatus,
    }

    // Await both sends. This runs inside the route's `after()` callback; a
    // fire-and-forget dispatch races serverless suspension — once `after()`
    // resolves, Vercel freezes the instance and the in-flight Resend request
    // is killed mid-flight (no send, no error logged). Both helpers swallow
    // their own errors, so allSettled only guarantees the requests complete
    // before `after()` returns.
    await Promise.allSettled([
      sendOrderNotificationEmail(paidOrder),
      sendCustomerOrderConfirmedEmail(paidOrder),
    ])
    trace?.step("sync.notification_email_dispatched", true)

    // Confirm discount redemption (idempotent via DB unique constraints).
    if (paidOrder.discountCodeId) {
      await confirmRedemption({
        codeId: paidOrder.discountCodeId,
        userId: paidOrder.userId,
        email: paidOrder.email ?? null,
        orderId: paidOrder.id,
        discountApplied: paidOrder.discountAmount ?? 0,
      }).catch((err) =>
        console.error("Failed to confirm discount redemption:", err)
      )
      trace?.step("sync.discount_confirmed", true)
    }

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
    .eq("id", fullOrder.id)
  trace?.step("sync.order_intermediate_update", true, {
    payment_status: nextOrderPaymentStatus,
  })
}
