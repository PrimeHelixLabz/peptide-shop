/**
 * Link Money Types
 *
 * TypeScript definitions for Link Money pay-by-bank integration.
 */

// ── Session creation (our API → Link Money /v2/sessions) ──

export interface LinkMoneySessionRequest {
  firstName: string
  lastName: string
  email: string
  /** Amount in USD (decimal, e.g. 49.99) */
  amount: number
  orderId: string
  userId: string
}

export interface LinkMoneySessionResponse {
  sessionKey: string
  sessionUrl: string
}

export interface LinkMoneySessionApiBody {
  firstName: string
  lastName: string
  email: string
  amount: number
  orderId: string
}

// ── Callback query params (Link Money → our redirect page) ──

export interface LinkMoneyCallbackParams {
  status: string
  customerId?: string
  paymentId?: string
  paymentStatusCode?: string
}

// ── Webhook payload (Link Money → our webhook endpoint) ──

export interface LinkMoneyWebhookPayload {
  eventType: string
  resourceId?: string
  customerId?: string
  paymentId?: string
  paymentStatusCode?: string
  [key: string]: unknown
}

// ── Internal status mapping ──

export type PaymentProvider = "stripe" | "link_money"

/**
 * Maps Link Money paymentStatusCode values to our internal payment statuses.
 */
export function mapLinkMoneyPaymentStatus(
  statusCode: string | undefined
): "pending" | "paid" | "failed" | "refunded" {
  switch (statusCode?.toUpperCase()) {
    case "COMPLETED":
    case "SETTLED":
      return "paid"
    case "FAILED":
    case "CANCELLED":
    case "REJECTED":
    case "RETURNED":
      return "failed"
    case "REFUNDED":
      return "refunded"
    default:
      return "pending"
  }
}

/**
 * Maps Link Money callback status to our internal order status.
 */
export function mapLinkMoneyOrderStatus(
  callbackStatus: string
): "pending" | "processing" | "cancelled" {
  switch (callbackStatus?.toLowerCase()) {
    case "success":
    case "completed":
      return "processing"
    case "failed":
    case "cancelled":
      return "cancelled"
    default:
      return "pending"
  }
}
