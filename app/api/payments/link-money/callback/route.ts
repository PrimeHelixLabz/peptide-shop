import { NextResponse } from "next/server"
import { z } from "zod"
import { requireAuthMiddleware, type AuthenticatedRequest } from "@/lib/auth/middleware"
import { createAdminClient } from "@/lib/supabase/admin"
import { deletePendingLinkMoneyOrderAsAdmin, clearCartAsAdmin } from "@/lib/db/supabase"
import {
  mapLinkMoneyRedirectPaymentStatus,
  mapLinkMoneyOrderStatus,
} from "@/lib/link-money/types"

const callbackSchema = z.object({
  status: z.string(),
  customerId: z.string().optional(),
  paymentId: z.string().optional(),
  paymentStatusCode: z.string().optional(),
})

/**
 * Persists Link Money callback data and updates the associated order.
 * Called by the client-side callback page after redirect.
 */
export const POST = requireAuthMiddleware(
  async (req: AuthenticatedRequest) => {
    try {
      const userId = req.user!.id
      const body = await req.json()
      const { status, customerId, paymentId, paymentStatusCode } =
        callbackSchema.parse(body)

      const supabase = createAdminClient()

      // Find the associated order - by provider_payment_id if available,
      // otherwise fall back to the user's most recent pending Link Money order
      let order: { id: string; payment_status: string; status: string } | null = null

      if (paymentId) {
        const { data } = await supabase
          .from("orders")
          .select("id, payment_status, status")
          .eq("provider_payment_id", paymentId)
          .eq("user_id", userId)
          .single()
        order = data
      }

      if (!order) {
        // Fallback: user may have exited before a paymentId was assigned.
        // Pick the most recent pending Link Money order for this user.
        const { data } = await supabase
          .from("orders")
          .select("id, payment_status, status")
          .eq("user_id", userId)
          .eq("provider", "link_money")
          .eq("status", "pending")
          .order("created_at", { ascending: false })
          .limit(1)
          .single()
        order = data
      }

      if (order) {
        const newPaymentStatus = mapLinkMoneyRedirectPaymentStatus(paymentStatusCode)
        const newOrderStatus = mapLinkMoneyOrderStatus(status)

        // If the payment explicitly failed or was cancelled, delete the
        // pending order so it doesn't clutter the admin dashboard.
        //
        // status=204 (user exited) is intentionally NOT treated as a
        // failure here - Link Money may still process the payment after
        // the user closes the widget.  The webhook will finalize or the
        // order stays pending for cleanup later.
        const isFailed =
          newOrderStatus === "cancelled" || newPaymentStatus === "failed"
        if (isFailed) {
          await deletePendingLinkMoneyOrderAsAdmin(order.id)
          console.log(
            `Link Money callback: deleted cancelled/failed order ${order.id}`
          )
        } else {
          // The redirect is only a UI signal - the webhook is the
          // authoritative source for payment confirmation and handles
          // inventory adjustment.  Here we only persist the customer ID
          // and clear the cart for a smoother UX.
          const updates: Record<string, string> = {
            updated_at: new Date().toISOString(),
          }

          if (customerId) {
            updates.provider_customer_id = customerId
          }

          await supabase.from("orders").update(updates).eq("id", order.id)

          // Only clear the cart when the payment was actually authorized
          // (not on user-exit or still-pending states).
          if (newPaymentStatus === "paid") {
            await clearCartAsAdmin(userId).catch((err: unknown) =>
              console.error("Link Money callback: failed to clear cart", err)
            )
          }
        }
      }

      return NextResponse.json({ received: true })
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: "Validation error", details: error.errors },
          { status: 400 }
        )
      }
      console.error("Link Money callback error:", error)
      return NextResponse.json(
        { error: "Failed to process callback" },
        { status: 500 }
      )
    }
  }
)
