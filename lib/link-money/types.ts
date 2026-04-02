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
// Fields may appear at top level or nested under `metadata` depending on API version.

export interface LinkMoneyWebhookPayload {
  id: string
  creationTime: string
  eventType: string
  // Top-level fields (API reference format)
  resourceId?: string
  resourceType?: "payment" | "customer" | "report" | string
  clientReferenceId?: string
  paymentType?: string
  achReturnCode?: string
  // Nested format (observed in sample payloads)
  metadata?: {
    resourceId?: string
    resourceType?: string
    clientReferenceId?: string
    transactionType?: string
    achReturnCode?: string
  }
}

// ── Internal status mapping ──

export type PaymentProvider = "stripe" | "link_money"

/**
 * Maps Link Money redirect paymentStatusCode (numeric) to our internal payment statuses.
 * Redirect query params use: 0 = authorized, 1 = failed, 2 = pending.
 */
export function mapLinkMoneyRedirectPaymentStatus(
  statusCode: string | undefined
): "pending" | "paid" | "failed" {
  switch (statusCode) {
    case "0":
      return "paid"
    case "1":
      return "failed"
    case "2":
      return "pending"
    default:
      return "pending"
  }
}

/**
 * Maps Link Money redirect status code to our internal order status.
 * Redirect query params use: 200 = success, 204 = user exited, 500 = error.
 */
export function mapLinkMoneyOrderStatus(
  callbackStatus: string
): "pending" | "processing" | "cancelled" {
  switch (callbackStatus) {
    case "200":
      return "processing"
    case "500":
      return "cancelled"
    case "204":
    default:
      return "pending"
  }
}
