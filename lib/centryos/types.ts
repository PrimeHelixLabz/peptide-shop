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

export interface CentryOSCartItem {
  /** Required by CentryOS. */
  name: string
  /** Required by CentryOS. */
  description: string
  qty?: number
  price?: number
  currency?: string
  productId?: string
  imageUrl?: string
}

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
  /**
   * Free-form delivery address string, REQUIRED by CentryOS as of their
   * 2026 API update (e.g. "123 Main St, Austin, TX, 78701, US"). Omitting
   * it makes the payment-link endpoint return a 500.
   */
  itemDeliveryAddress: string
  /** Top-level cart, REQUIRED by CentryOS; each item needs name+description. */
  cartItems: CentryOSCartItem[]
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
