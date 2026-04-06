import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import {
  adjustInventoryForOrderAsAdmin,
  restoreInventoryForOrderAsAdmin,
  deletePendingLinkMoneyOrderAsAdmin,
  getOrderByIdAsAdmin,
} from "@/lib/db/supabase"
import { sendOrderNotificationEmail } from "@/lib/email"
import type { LinkMoneyWebhookPayload } from "@/lib/link-money/types"

/**
 * Link Money Webhook Endpoint
 *
 * Payload fields: id, creationTime, eventType, resourceId, resourceType,
 *   clientReferenceId, paymentType, achReturnCode?
 *   (may also appear nested under `metadata` - handler checks both)
 *
 * Payment lifecycle:
 *   payment.created    → request received
 *   payment.pending    → awaiting authorization (decision within 15 min)
 *   payment.authorized → approved, will be scheduled
 *   payment.scheduled  → scheduled with payment provider (T+1 or T+2)
 *   payment.initiated  → initiated with payment provider
 *   payment.succeeded  → customer account debited successfully
 *   payment.disbursed  → funds disbursed to merchant
 *   payment.canceled   → canceled via API
 *   payment.failed     → payment failed (check achReturnCode via API)
 *
 * Customer lifecycle:
 *   customer.created              → user started account linking
 *   customer.activated            → customer ready for payments
 *   customer.deactivated          → customer can no longer pay (must re-link)
 *   customer.account.linked       → preferred account selected
 *   customer.account.deactivated  → account no longer available
 *
 * Orders are matched by `clientReferenceId` → our `order_number`.
 */
export async function POST(req: NextRequest) {
  // ── Verify webhook authenticity ──
  const webhookSecret = process.env.LINK_MONEY_WEBHOOK_SECRET
  if (!webhookSecret) {
    console.error(
      "LINK_MONEY_WEBHOOK_SECRET is not configured. Rejecting webhook."
    )
    return NextResponse.json(
      { error: "Webhook not configured" },
      { status: 500 }
    )
  }

  const signature =
    req.headers.get("x-link-money-signature") ||
    req.headers.get("x-webhook-signature")

  if (!signature || signature !== webhookSecret) {
    console.warn("Link Money webhook: invalid or missing signature")
    return NextResponse.json(
      { error: "Invalid signature" },
      { status: 401 }
    )
  }

  let payload: LinkMoneyWebhookPayload

  try {
    payload = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const { eventType } = payload
  if (!eventType) {
    return NextResponse.json(
      { error: "Missing eventType" },
      { status: 400 }
    )
  }

  // Resolve fields from top-level or nested metadata (API sends either format)
  const resourceId = payload.resourceId ?? payload.metadata?.resourceId
  const resourceType = payload.resourceType ?? payload.metadata?.resourceType
  const clientReferenceId =
    payload.clientReferenceId ?? payload.metadata?.clientReferenceId
  const achReturnCode =
    payload.achReturnCode ?? payload.metadata?.achReturnCode

  const supabase = createAdminClient()

  // ── 1. Store raw webhook event for audit trail ──
  const { error: insertError } = await supabase
    .from("payment_webhook_events")
    .insert({
      provider: "link_money",
      event_type: eventType,
      payload: payload as unknown as Record<string, unknown>,
      provider_payment_id: resourceType === "payment" ? resourceId : null,
      provider_customer_id: resourceType === "customer" ? resourceId : null,
    })

  if (insertError) {
    console.error("Failed to store Link Money webhook event:", insertError)
  }

  // ── 2. Handle payment events ──
  if (eventType.startsWith("payment.") && clientReferenceId) {
    const { data: order } = await supabase
      .from("orders")
      .select("id, payment_status, status, order_number")
      .eq("order_number", clientReferenceId)
      .single()

    if (!order) {
      console.warn(
        `Link Money webhook: no order found for clientReferenceId ${clientReferenceId}`
      )
      return NextResponse.json({ received: true })
    }

    const updates: Record<string, string> = {}

    switch (eventType) {
      // Early stages - payment is in progress
      case "payment.created":
      case "payment.pending":
        // Order stays pending, no status change needed
        break

      // Payment approved - move order to processing and decrement stock
      case "payment.authorized":
      case "payment.scheduled":
      case "payment.initiated":
        if (order.payment_status !== "paid") {
          updates.payment_status = "paid"
          // Decrement inventory on first transition to paid
          await adjustInventoryForOrderAsAdmin(order.id)
          // Send order notification email (non-blocking, matches Stripe behavior)
          getOrderByIdAsAdmin(order.id).then((fullOrder) => {
            if (fullOrder) sendOrderNotificationEmail(fullOrder)
          }).catch((err) =>
            console.error("Failed to send order notification:", err)
          )
        }
        if (order.status === "pending") {
          updates.status = "processing"
        }
        break

      // Payment fully settled - funds debited from customer
      case "payment.succeeded":
      case "payment.disbursed":
        if (order.payment_status !== "paid") {
          updates.payment_status = "paid"
          // Decrement inventory if not already done by an earlier authorized event
          await adjustInventoryForOrderAsAdmin(order.id)
          // Send email if authorized event was missed
          getOrderByIdAsAdmin(order.id).then((fullOrder) => {
            if (fullOrder) sendOrderNotificationEmail(fullOrder)
          }).catch((err) =>
            console.error("Failed to send order notification:", err)
          )
        }
        if (order.status === "pending") {
          updates.status = "processing"
        }
        break

      // Payment failed or canceled
      case "payment.failed":
      case "payment.canceled":
        if (achReturnCode) {
          console.warn(
            `Link Money payment failed for order ${order.order_number} - ACH return code: ${achReturnCode}`
          )
        }

        if (order.payment_status === "paid") {
          // Payment was previously authorized and inventory was decremented.
          // This is an ACH return / late failure - restore stock and mark cancelled.
          await restoreInventoryForOrderAsAdmin(order.id)
          const { error: cancelError } = await supabase
            .from("orders")
            .update({
              status: "cancelled",
              payment_status: "failed",
              updated_at: new Date().toISOString(),
            })
            .eq("id", order.id)
          if (cancelError) {
            console.error("Failed to cancel order after payment reversal:", cancelError)
          }
          console.log(
            `Link Money webhook: reversed paid order ${order.order_number} - inventory restored`
          )
        } else {
          // Order was still pending (never paid) - safe to delete entirely
          await deletePendingLinkMoneyOrderAsAdmin(order.id)
          console.log(
            `Link Money webhook: deleted unpaid order ${order.order_number}`
          )
        }
        return NextResponse.json({ received: true })

    }

    // Store the Link Money payment resource ID
    if (resourceId) {
      updates.provider_payment_id = resourceId
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
          `Link Money webhook: order ${order.order_number} (${eventType}) updated -`,
          updates
        )
      }
    }
  }

  // ── 3. Log customer lifecycle events ──
  if (eventType.startsWith("customer.") && resourceId) {
    console.log(
      `Link Money customer event: ${eventType} for customer ${resourceId}`
    )
  }

  return NextResponse.json({ received: true })
}
