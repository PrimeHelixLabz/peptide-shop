/**
 * CentryOS wire-format types (request/response shapes).
 *
 * Internal payment types live in `payment-types.ts` — keep the split
 * the same as `lib/link-money` so each provider has a predictable
 * file layout.
 */

// ── Auth (POST /v1/ext/jwt/generate-token) ──

export interface CentryOSTokenResponse {
  /** Bearer token used on every Liquidity API call. */
  accessToken: string
  /** TTL hint in seconds when the API returns one. */
  expiresIn?: number
  /** ISO-8601 absolute expiry when the API returns one. */
  expiresAt?: string
  [key: string]: unknown
}

// ── Payment link (POST /v1/ext/collections/payment-link) ──

export interface CreatePaymentLinkRequest {
  currency: string
  name: string
  amount: number
  amountLocked: boolean
  redirectTo: string
  checkoutType: "generic" | "recurring"
  isOpenLink: boolean
  customerPays: boolean
  orderId: string
  acceptedPaymentOptions: string[]
  customData?: Record<string, unknown>
  advancedConfig: {
    websiteUrl: string
    webhookPath: string
    webhookSecret: string
  }
  recurringCharge?: {
    type: "subscription"
    startDate: string
    interval: { type: "day" | "week" | "month" | "year"; count: number }
  }
}

export interface CreatePaymentLinkResponse {
  data: {
    /** Hosted checkout URL the customer is redirected to. */
    url: string
    application: {
      id: string
      token: string
      /** Numeric epoch (ms) or ISO date depending on API version. */
      expiredAt?: string | number
      [key: string]: unknown
    }
    [key: string]: unknown
  }
  [key: string]: unknown
}

// ── Callback query params (CentryOS → our redirect page) ──
//
// CentryOS does not document any status query params on the redirect,
// only the `orderId` we ourselves embedded in `redirectTo`. We declare
// the shape anyway so the callback page has a typed surface.

export interface CentryOSCallbackParams {
  orderId?: string
}
