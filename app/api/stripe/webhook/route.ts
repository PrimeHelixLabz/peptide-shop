import { NextRequest, NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import { updateOrderAsAdmin, clearCartAsAdmin } from "@/lib/db/supabase"

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
        const orderId = session.metadata?.orderId as string | undefined
        const userId = session.metadata?.userId as string | undefined

        if (orderId) {
          console.log("Webhook: updating order (paid/processing)", orderId)
          await updateOrderAsAdmin(orderId, {
            paymentStatus: "paid",
            status: "processing",
          })
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
        const orderId = session.metadata?.orderId as string | undefined
        if (orderId) {
          console.log("Webhook: updating order (failed/cancelled)", orderId)
          await updateOrderAsAdmin(orderId, {
            paymentStatus: "failed",
            status: "cancelled",
          })
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

