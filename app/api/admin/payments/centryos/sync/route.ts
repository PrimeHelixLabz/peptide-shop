import { NextResponse } from "next/server"
import { z } from "zod"
import {
  requireAdminMiddleware,
  type AuthenticatedRequest,
} from "@/lib/auth/middleware"
import {
  applyCollectionWebhook,
  getPaymentByOrderId,
  getTransactionStatus,
} from "@/lib/centryos/payment-service"
import type { CentryOSWebhookBody } from "@/lib/centryos/payment-types"

const bodySchema = z.object({
  orderId: z.string().uuid(),
})

/**
 * POST /api/admin/payments/centryos/sync
 *
 * Admin-only "sync payment status" action. Pulls the live transaction
 * from CentryOS via GET /v1/ext/transactions and replays it through the
 * same webhook application path so the local payments + orders rows
 * converge to the provider's truth.
 *
 * Useful when a webhook was missed (network blip, deploy churn, etc.)
 * or to debug a pending order that hasn't received a final event.
 */
export const POST = requireAdminMiddleware(
  async (req: AuthenticatedRequest) => {
    try {
      const body = await req.json()
      const { orderId } = bodySchema.parse(body)

      const payment = await getPaymentByOrderId(orderId)
      if (!payment) {
        return NextResponse.json(
          { error: "No CentryOS payment found for this order" },
          { status: 404 }
        )
      }

      if (!payment.providerTransactionId) {
        return NextResponse.json(
          {
            error:
              "Payment has no transactionId yet — wait for the webhook or manually charge the link.",
            payment: {
              status: payment.status,
              checkoutUrl: payment.checkoutUrl,
            },
          },
          { status: 409 }
        )
      }

      const txn = await getTransactionStatus(payment.providerTransactionId)

      // Reshape the transaction into the webhook payload our applier
      // already understands — single code path for both inputs.
      const synthetic: CentryOSWebhookBody = {
        eventType: "COLLECTION",
        status: txn.status,
        payload: {
          transactionId: txn.id,
          amount: txn.amount,
          currency: txn.currency,
          metadata: {
            ...(txn.metadata ?? {}),
            orderId: txn.metadata?.orderId ?? orderId,
          },
        },
        paymentLink: {
          id: txn.paymentLink?.id ?? payment.providerPaymentLinkId ?? undefined,
          token:
            txn.paymentLink?.token ??
            payment.providerPaymentLinkToken ??
            undefined,
        },
      }

      const result = await applyCollectionWebhook(synthetic)

      return NextResponse.json({
        ok: true,
        applied: result.applied,
        reason: result.reason ?? null,
        transaction: txn,
        payment: result.payment
          ? {
              status: result.payment.status,
              transactionId: result.payment.providerTransactionId,
              updatedAt: result.payment.updatedAt,
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
      console.error("CentryOS admin sync error:", error)
      return NextResponse.json(
        {
          error:
            error instanceof Error
              ? error.message
              : "Failed to sync CentryOS payment",
        },
        { status: 500 }
      )
    }
  }
)
