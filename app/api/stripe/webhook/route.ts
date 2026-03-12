import { NextRequest, NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import {
  createOrderAsAdmin,
  clearCartAsAdmin,
  adjustInventoryForOrderAsAdmin,
  getPendingCheckoutAsAdmin,
  deletePendingCheckoutAsAdmin,
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
        const userId = session.metadata?.userId as string | undefined

        if (pendingCheckoutId) {
          // Retrieve the stored checkout data
          const pendingCheckout = await getPendingCheckoutAsAdmin(pendingCheckoutId)
          if (!pendingCheckout) {
            console.error("Webhook: pending checkout not found", pendingCheckoutId)
            break
          }

          const checkoutData = pendingCheckout.checkout_data

          // NOW create the order — only after payment has succeeded
          const orderId = crypto.randomUUID()
          console.log("Webhook: creating order after successful payment", checkoutData.orderNumber)

          const createdOrder = await createOrderAsAdmin({
            id: orderId,
            userId: checkoutData.userId,
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

          // Send order notification email to support (non-blocking)
          sendOrderNotificationEmail(createdOrder).catch((err) =>
            console.error("Failed to send order notification:", err)
          )

          // Clean up the pending checkout
          await deletePendingCheckoutAsAdmin(pendingCheckoutId)
        }

        if (userId) {
          // Best-effort clear cart for authenticated users (admin client bypasses RLS)
          await clearCartAsAdmin(userId)
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

