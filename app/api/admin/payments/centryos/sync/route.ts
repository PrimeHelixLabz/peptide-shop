import { NextResponse } from "next/server"
import { z } from "zod"
import {
  requireAdminMiddleware,
  type AuthenticatedRequest,
} from "@/lib/auth/middleware"
import {
  applyCollectionWebhook,
  getPaymentByOrderId,
  getPaymentByPaymentLinkId,
  getTransactionStatus,
} from "@/lib/centryos/payment-service"
import type {
  CentryOSWebhookBody,
  PaymentRecord,
} from "@/lib/centryos/payment-types"

// Accept either orderId, transactionId, or both. transactionId is the
// recovery path when a webhook was missed: the admin reads the txn id
// from the CentryOS dashboard/email and replays it through the applier
// even though our payments row has no transactionId yet.
const bodySchema = z
  .object({
    orderId: z.string().uuid().optional(),
    transactionId: z.string().min(1).optional(),
  })
  .refine((v) => v.orderId || v.transactionId, {
    message: "Provide orderId, transactionId, or both",
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
      const { orderId, transactionId: txnIdOverride } = bodySchema.parse(body)

      let payment: PaymentRecord | null = null
      if (orderId) {
        payment = await getPaymentByOrderId(orderId)
        if (!payment) {
          return NextResponse.json(
            { error: "No CentryOS payment found for this order" },
            { status: 404 }
          )
        }
      }

      const transactionId =
        txnIdOverride ?? payment?.providerTransactionId ?? null
      if (!transactionId) {
        return NextResponse.json(
          {
            error:
              "Payment has no transactionId yet. Pass `transactionId` in the request body (e.g. from the CentryOS dashboard or webhook email) or wait for the webhook.",
            payment: payment
              ? {
                  status: payment.status,
                  checkoutUrl: payment.checkoutUrl,
                }
              : null,
          },
          { status: 409 }
        )
      }

      const txn = await getTransactionStatus(transactionId)

      // If we don't have a payment row yet (transactionId-only recovery),
      // try resolving it from the txn's paymentLink so we can populate the
      // synthetic customData with the canonical clientReferenceId.
      if (!payment && txn.paymentLink?.id) {
        payment = await getPaymentByPaymentLinkId(txn.paymentLink.id)
      }

      if (!payment) {
        return NextResponse.json(
          {
            error:
              "Could not locate a local payments row for this transaction. Provide an orderId or verify the transactionId.",
            transaction: txn,
          },
          { status: 404 }
        )
      }

      // Mirror the real CentryOS webhook shape: paymentLink + customData
      // live under `payload`. The applier reads customData first so the
      // lookup resolves by clientReferenceId.
      const synthetic: CentryOSWebhookBody = {
        eventType: "COLLECTION",
        status: txn.status,
        payload: {
          transactionId: txn.id,
          amount: txn.amount,
          currency: txn.currency,
          metadata: { ...(txn.metadata ?? {}) },
          paymentLink: {
            id:
              txn.paymentLink?.id ??
              payment.providerPaymentLinkId ??
              undefined,
            token:
              txn.paymentLink?.token ??
              payment.providerPaymentLinkToken ??
              undefined,
            customData: {
              orderId: payment.orderId ?? undefined,
              clientReferenceId: payment.clientReferenceId,
            },
          },
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
