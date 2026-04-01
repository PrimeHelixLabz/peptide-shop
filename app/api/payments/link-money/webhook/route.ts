import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import {
  mapLinkMoneyPaymentStatus,
  type LinkMoneyWebhookPayload,
} from "@/lib/link-money/types"

/**
 * Link Money Webhook Endpoint
 *
 * Receives asynchronous event notifications from Link Money about
 * customer and payment lifecycle events. Stores raw payloads and
 * updates the associated order/payment records idempotently.
 */
export async function POST(req: NextRequest) {
  let payload: LinkMoneyWebhookPayload

  try {
    payload = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const eventType = payload.eventType
  if (!eventType) {
    return NextResponse.json({ error: "Missing eventType" }, { status: 400 })
  }

  const supabase = createAdminClient()

  // ── 1. Store raw webhook event ──
  const { error: insertError } = await supabase
    .from("payment_webhook_events")
    .insert({
      provider: "link_money",
      event_type: eventType,
      payload: payload as unknown as Record<string, unknown>,
      provider_payment_id: payload.paymentId ?? null,
      provider_customer_id: payload.customerId ?? null,
    })

  if (insertError) {
    console.error("Failed to store Link Money webhook event:", insertError)
    // Continue processing even if storage fails — don't block Link Money
  }

  // ── 2. Handle payment-related events ──
  if (payload.paymentId && payload.paymentStatusCode) {
    const internalStatus = mapLinkMoneyPaymentStatus(payload.paymentStatusCode)

    // Find the order by provider_payment_id
    const { data: order } = await supabase
      .from("orders")
      .select("id, payment_status, status")
      .eq("provider_payment_id", payload.paymentId)
      .single()

    if (order) {
      // Idempotent: only update if status actually changed
      const updates: Record<string, string> = {}

      if (order.payment_status !== internalStatus) {
        updates.payment_status = internalStatus
      }

      // If payment settled/completed, move order to processing
      if (internalStatus === "paid" && order.status === "pending") {
        updates.status = "processing"
      }

      // If payment failed/refunded, reflect on order
      if (internalStatus === "failed" && order.status !== "cancelled") {
        updates.status = "cancelled"
      }

      if (Object.keys(updates).length > 0) {
        updates.updated_at = new Date().toISOString()
        const { error: updateError } = await supabase
          .from("orders")
          .update(updates)
          .eq("id", order.id)

        if (updateError) {
          console.error("Failed to update order from webhook:", updateError)
        } else {
          console.log(
            `Link Money webhook: order ${order.id} updated —`,
            updates
          )
        }
      }
    } else {
      console.warn(
        `Link Money webhook: no order found for paymentId ${payload.paymentId}`
      )
    }
  }

  // ── 3. Handle customer-related events (log only for now) ──
  if (eventType.startsWith("customer.") && payload.customerId) {
    console.log(
      `Link Money customer event: ${eventType} for customer ${payload.customerId}`
    )
  }

  return NextResponse.json({ received: true })
}
