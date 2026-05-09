/**
 * Internal payment-service types for CentryOS.
 * Mirrors lib/link-money/payment-types.ts so adding a third provider
 * follows the same shape: PaymentStatus, PaymentRecord, CreatePaymentInput,
 * <Provider>WebhookBody, <Provider>Transaction.
 */

export type PaymentStatus =
  | "CREATED"
  | "PENDING"
  | "PROCESSING"
  | "SUCCEEDED"
  | "FAILED"
  | "CANCELLED"
  | "EXPIRED"

export interface PaymentRecord {
  id: string
  provider: "centryos"
  orderId: string | null
  clientReferenceId: string
  status: PaymentStatus
  amount: number
  currency: string
  providerPaymentLinkId: string | null
  providerPaymentLinkToken: string | null
  providerPaymentLinkExpiresAt: string | null
  providerTransactionId: string | null
  checkoutUrl: string | null
  rawCreateResponse: unknown | null
  rawWebhook: unknown | null
  createdAt: string
  updatedAt: string
}

export interface CreatePaymentInput {
  orderId: string
  clientReferenceId: string
  amount: number
  currency?: string
}

export interface CentryOSWebhookBody {
  eventType: string
  status: "SUCCESS" | "FAILED" | "PENDING" | string
  payload: {
    method?: string
    transactionId?: string
    amount?: number
    currency?: string
    metadata?: {
      orderId?: string
      userId?: string
      clientReferenceId?: string
      [key: string]: unknown
    }
    [key: string]: unknown
  }
  paymentLink?: {
    id?: string
    token?: string
  }
  feeCharged?: number
  [key: string]: unknown
}

export interface CentryOSTransaction {
  id: string
  status: "SUCCESS" | "FAILED" | "PENDING" | "PROCESSING" | string
  amount?: number
  currency?: string
  metadata?: { orderId?: string; userId?: string; [key: string]: unknown }
  paymentLink?: { id?: string; token?: string }
  [key: string]: unknown
}
