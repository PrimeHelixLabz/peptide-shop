import { NextResponse } from "next/server"
import { z } from "zod"
import { requireAuthMiddleware, type AuthenticatedRequest } from "@/lib/auth/middleware"
import { createAdminClient } from "@/lib/supabase/admin"
import {
  mapLinkMoneyPaymentStatus,
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

      // If we have a paymentId, find and update the pending checkout / order
      if (paymentId) {
        // Look for a pending checkout with this Link Money payment context
        // The order may have been created by the checkout flow with provider_payment_id
        const { data: order } = await supabase
          .from("orders")
          .select("id, payment_status, status")
          .eq("provider_payment_id", paymentId)
          .eq("user_id", userId)
          .single()

        if (order) {
          const newPaymentStatus = mapLinkMoneyPaymentStatus(paymentStatusCode)
          const newOrderStatus = mapLinkMoneyOrderStatus(status)

          const updates: Record<string, string> = {
            updated_at: new Date().toISOString(),
          }

          if (customerId) {
            updates.provider_customer_id = customerId
          }

          if (order.payment_status !== newPaymentStatus) {
            updates.payment_status = newPaymentStatus
          }

          if (
            newOrderStatus === "processing" &&
            order.status === "pending"
          ) {
            updates.status = newOrderStatus
          }

          await supabase.from("orders").update(updates).eq("id", order.id)
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
