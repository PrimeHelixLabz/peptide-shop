import { NextRequest, NextResponse } from "next/server"
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

/**
 * POST /api/payments/link-money/webhook
 *
 * Every delivery (valid or not) is persisted to link_money_webhook_logs
 * and a debug email is fired. The payments ledger is only updated when
 * the signature is valid and the event is mapped.
 */
export async function POST(req: NextRequest) {
  const headers = headersToObject(req)
  const rawBody = await req.text()

  let body: LinkMoneyWebhookBody | null = null
  let parseError: string | null = null
  try {
    body = rawBody ? (JSON.parse(rawBody) as LinkMoneyWebhookBody) : null
  } catch (err) {
    parseError = err instanceof Error ? err.message : "invalid JSON"
  }

  const eventType = body?.eventType ?? null
  const clientReferenceId =
    body?.metadata?.clientReferenceId ?? body?.clientReferenceId ?? null
  const transactionId =
    body?.metadata?.transactionId ??
    body?.transactionId ??
    body?.metadata?.resourceId ??
    body?.resourceId ??
    null

  // ── Signature check ──
  const webhookSecret = process.env.LINK_MONEY_WEBHOOK_SECRET
  const signature =
    req.headers.get("x-link-money-signature") ||
    req.headers.get("x-webhook-signature")
  const signatureValid = Boolean(
    webhookSecret && signature && signature === webhookSecret
  )

  // Shared helper to ship a response + a log row + a debug email.
  const finish = async (
    statusCode: number,
    error: string | null,
    responseBody: Record<string, unknown>
  ) => {
    const entry: WebhookLogEntry = {
      eventType,
      clientReferenceId,
      transactionId,
      signatureValid,
      headers,
      body: body ?? null,
      rawBody,
      statusCode,
      error,
    }
    // Persist + notify are both best-effort and never block the response.
    await Promise.allSettled([logWebhook(entry), notifyWebhookReceived(entry)])
    return NextResponse.json(responseBody, { status: statusCode })
  }

  if (!webhookSecret) {
    console.error("LINK_MONEY_WEBHOOK_SECRET not configured")
    return finish(500, "webhook secret not configured", {
      error: "Webhook not configured",
    })
  }

  if (!signatureValid) {
    return finish(401, "invalid signature", { error: "Invalid signature" })
  }

  if (parseError || !body) {
    return finish(400, parseError ?? "empty body", { error: "Invalid JSON" })
  }

  if (!eventType) {
    return finish(400, "missing eventType", { error: "Missing eventType" })
  }

  // ── Apply to payments ledger (idempotent source of truth) ──
  let result
  try {
    result = await applyWebhook(body)
  } catch (err) {
    console.error("Link Money webhook: applyWebhook failed", err)
    return finish(500, err instanceof Error ? err.message : "applyWebhook failed", {
      error: "Internal error",
    })
  }

  if (!result.payment) {
    console.warn("Link Money webhook: skipped", {
      eventType,
      reason: result.reason,
    })
    return finish(200, `skipped: ${result.reason}`, {
      received: true,
      skipped: result.reason,
    })
  }

  // ── Derived order-side effects (first successful transition only) ──
  if (result.applied && result.payment.orderId) {
    await syncOrderFromPayment(result.payment.orderId, result.payment.status).catch(
      (err) => console.error("Link Money webhook: order sync failed", err)
    )
  }

  return finish(200, null, { received: true, status: result.payment.status })
}

function headersToObject(req: NextRequest): Record<string, string> {
  const out: Record<string, string> = {}
  req.headers.forEach((value, key) => {
    // Redact the shared-secret header so it doesn't land in plaintext logs.
    if (
      key.toLowerCase() === "x-link-money-signature" ||
      key.toLowerCase() === "x-webhook-signature"
    ) {
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
