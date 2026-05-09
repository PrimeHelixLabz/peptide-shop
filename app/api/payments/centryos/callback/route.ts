import { NextResponse } from "next/server"
import { z } from "zod"
import {
  requireAuthMiddleware,
  type AuthenticatedRequest,
} from "@/lib/auth/middleware"
import { createAdminClient } from "@/lib/supabase/admin"
import {
  clearCartAsAdmin,
  deletePendingCentryOSOrderAsAdmin,
} from "@/lib/db/supabase"

const callbackSchema = z.object({
  orderId: z.string().uuid(),
})

/**
 * POST /api/payments/centryos/callback
 *
 * Mirrors /api/payments/link-money/callback. Called by the callback page
 * on first load. CentryOS does not include payment status in the redirect
 * itself — the webhook is authoritative — so this handler:
 *
 *  - confirms the order belongs to the calling user
 *  - if the webhook has already marked the order paid, clears the cart
 *  - if the order is still pending and the user explicitly returned, we
 *    leave it pending: the webhook will resolve it (or not) on its own
 *
 * Cleanup of failed/cancelled rows happens in the webhook handler since
 * CentryOS does not expose a redirect-time failure signal.
 */
export const POST = requireAuthMiddleware(
  async (req: AuthenticatedRequest) => {
    try {
      const userId = req.user!.id
      const body = await req.json()
      const { orderId } = callbackSchema.parse(body)

      const supabase = createAdminClient()
      const { data: order } = await supabase
        .from("orders")
        .select("id, user_id, payment_status, status")
        .eq("id", orderId)
        .eq("provider", "centryos")
        .single()

      if (!order || order.user_id !== userId) {
        return NextResponse.json({ error: "Not found" }, { status: 404 })
      }

      // Webhook already confirmed paid — safe to clear cart.
      if (order.payment_status === "paid") {
        await clearCartAsAdmin(userId).catch((err: unknown) =>
          console.error("CentryOS callback: failed to clear cart", err)
        )
      }

      // If the webhook confirmed failure before the user got back, drop
      // the pending order so the dashboard isn't polluted. (Same policy
      // as link-money's callback.)
      if (order.payment_status === "failed" && order.status === "cancelled") {
        await deletePendingCentryOSOrderAsAdmin(order.id).catch(() => {})
      }

      return NextResponse.json({ received: true })
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: "Validation error", details: error.errors },
          { status: 400 }
        )
      }
      console.error("CentryOS callback error:", error)
      return NextResponse.json(
        { error: "Failed to process callback" },
        { status: 500 }
      )
    }
  }
)
