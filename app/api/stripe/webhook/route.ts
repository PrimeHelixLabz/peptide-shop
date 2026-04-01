import { NextRequest, NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import {
  createOrderAsAdmin,
  clearCartAsAdmin,
  adjustInventoryForOrderAsAdmin,
  getPendingCheckoutAsAdmin,
  deletePendingCheckoutAsAdmin,
  getOrderByNumber,
} from "@/lib/db/supabase"
import { sendOrderNotificationEmail } from "@/lib/email"

export const POST = async (req: NextRequest) => {
  const sig = req.headers.get("stripe-signature")
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!sig || !webhookSecret) {
    return NextResponse.json({ error: "Missing Stripe webhook configuration" }, { status: 400 })
  }

  let event
  const body = await req.text()

  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret)
  } catch (err) {
    console.error("Stripe webhook signature verification failed:", err)
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as any
        const pendingCheckoutId = session.metadata?.pendingCheckoutId as string | undefined

        if (pendingCheckoutId) {
          // Retrieve the stored checkout data
          const pendingCheckout = await getPendingCheckoutAsAdmin(pendingCheckoutId)
          if (!pendingCheckout) {
            // Pending checkout already processed or cleaned up — idempotent, skip.
            console.warn("Webhook: pending checkout not found (already processed?)", pendingCheckoutId)
            break
          }

          // Guard: only process checkouts that belong to Stripe
          if (pendingCheckout.provider && pendingCheckout.provider !== "stripe") {
            console.warn("Webhook: skipping non-Stripe pending checkout", pendingCheckoutId, pendingCheckout.provider)
            break
          }

          const checkoutData = pendingCheckout.checkout_data

          // Idempotency check: if order with this orderNumber already exists, skip creation
          const existingOrder = await getOrderByNumber(checkoutData.orderNumber)
          if (existingOrder) {
            console.warn("Webhook: order already exists, skipping duplicate", checkoutData.orderNumber)
            // Clean up pending checkout since order was already created
            await deletePendingCheckoutAsAdmin(pendingCheckoutId)
            break
          }

          // NOW create the order — only after payment has succeeded
          const orderId = crypto.randomUUID()
          console.log("Webhook: creating order after successful payment", checkoutData.orderNumber)

          // Use userId from the pending checkout (trusted), not from Stripe metadata
          const trustedUserId = pendingCheckout.user_id

          let createdOrder
          try {
            createdOrder = await createOrderAsAdmin({
              id: orderId,
              userId: trustedUserId,
              email: checkoutData.email,
              orderNumber: checkoutData.orderNumber,
              status: "processing",
              paymentStatus: "paid",
              items: checkoutData.items,
              subtotal: checkoutData.subtotal,
              shipping: checkoutData.shipping,
              serviceFee: checkoutData.serviceFee,
              total: checkoutData.total,
              shippingAddress: checkoutData.shippingAddress,
              billingAddress: checkoutData.billingAddress,
              paymentMethod: "stripe",
              notes: checkoutData.notes,
            })

            // Decrement inventory for all items in the paid order
            await adjustInventoryForOrderAsAdmin(createdOrder.id)
          } catch (orderError) {
            // If order creation or inventory adjustment fails, clean up pending checkout
            // so Stripe retry doesn't leave it in limbo
            console.error("Webhook: failed to create order or adjust inventory", orderError)
            await deletePendingCheckoutAsAdmin(pendingCheckoutId)
            throw orderError
          }

          // Send order notification email to support (non-blocking)
          sendOrderNotificationEmail(createdOrder).catch((err) =>
            console.error("Failed to send order notification:", err)
          )

          // Clean up the pending checkout
          await deletePendingCheckoutAsAdmin(pendingCheckoutId)

          // Best-effort clear cart for authenticated users (use trusted userId from DB)
          if (trustedUserId) {
            await clearCartAsAdmin(trustedUserId)
          }
        }
        break
      }
      case "checkout.session.expired":
      case "payment_intent.payment_failed": {
        const session = event.data.object as any
        const pendingCheckoutId = session.metadata?.pendingCheckoutId as string | undefined
        if (pendingCheckoutId) {
          // Payment failed or session expired — just clean up, no order was created
          console.log("Webhook: cleaning up pending checkout (payment failed/expired)", pendingCheckoutId)
          await deletePendingCheckoutAsAdmin(pendingCheckoutId)
        }
        break
      }
      default:
        // Ignore other event types for now
        break
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error("Stripe webhook handling error:", error)
    return NextResponse.json({ error: "Webhook error" }, { status: 500 })
  }
}

