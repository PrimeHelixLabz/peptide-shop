import { NextResponse } from "next/server"
import { z } from "zod"
import {
  requireAuthMiddleware,
  type AuthenticatedRequest,
} from "@/lib/auth/middleware"
import { createAdminClient } from "@/lib/supabase/admin"
import { getPaymentByOrderId } from "@/lib/centryos/payment-service"

const querySchema = z.object({
  orderId: z.string().uuid(),
})

/**
 * GET /api/payments/centryos/status?orderId=...
 *
 * Returns the latest payments-row state for a CentryOS order. The
 * return page polls this so the customer sees "processing" until the
 * webhook confirms — never trusting the redirect alone.
 *
 * Auth-gated to the order's owner: a payment row is only revealed to
 * the user who originally placed the order.
 */
export const GET = requireAuthMiddleware(
  async (req: AuthenticatedRequest) => {
    try {
      const userId = req.user!.id
      const { searchParams } = new URL(req.url)
      const { orderId } = querySchema.parse({
        orderId: searchParams.get("orderId"),
      })

      const supabase = createAdminClient()
      const { data: order } = await supabase
        .from("orders")
        .select("id, user_id, payment_status, status, order_number, total")
        .eq("id", orderId)
        .single()

      if (!order || order.user_id !== userId) {
        return NextResponse.json({ error: "Not found" }, { status: 404 })
      }

      const payment = await getPaymentByOrderId(orderId)

      return NextResponse.json({
        order: {
          id: order.id,
          orderNumber: order.order_number,
          status: order.status,
          paymentStatus: order.payment_status,
          total: parseFloat(order.total),
        },
        payment: payment
          ? {
              status: payment.status,
              transactionId: payment.providerTransactionId,
              checkoutUrl: payment.checkoutUrl,
              expiredAt: payment.providerPaymentLinkExpiresAt,
              updatedAt: payment.updatedAt,
            }
          : null,
      })
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: "Validation error", details: error.errors },
          { status: 400 }
        )
      }
      console.error("CentryOS status error:", error)
      return NextResponse.json(
        { error: "Failed to load payment status" },
        { status: 500 }
      )
    }
  }
)
