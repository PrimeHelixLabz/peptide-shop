/**
 * Shared schema.org structured-data fragments for product `offers`.
 *
 * Google's "Merchant listings" report expects `hasMerchantReturnPolicy` and
 * `shippingDetails` inside every product offer. Both values are identical for
 * every product we sell, so they live here as constants and are spread into
 * both the single `Offer` and the multi-variant `AggregateOffer` branches of
 * the product JSON-LD (app/shop/[slug]/page.tsx).
 *
 * The shipping cost is sourced from the same constant the checkout uses
 * (SHIPPING_RATE) so the rich result can never drift from what customers are
 * actually charged. We always advertise the flat rate — the free-shipping
 * threshold is a cart-subtotal perk that doesn't exist at the per-product
 * level, and claiming free shipping Google can't verify at checkout is a
 * structured-data mismatch.
 */
import { SHIPPING_RATE } from "@/lib/order-constants"

/**
 * Return policy. "All sales are final" (see /terms-of-service) maps to
 * schema.org's MerchantReturnNotPermitted.
 */
export const MERCHANT_RETURN_POLICY = {
  "@type": "MerchantReturnPolicy",
  applicableCountry: "US",
  returnPolicyCategory: "https://schema.org/MerchantReturnNotPermitted",
} as const

/**
 * Domestic FedEx 2Day: flat rate, US-only, 1–3 business days handling plus
 * 2 business days transit (see /shipping-policy).
 */
export const OFFER_SHIPPING_DETAILS = {
  "@type": "OfferShippingDetails",
  shippingRate: {
    "@type": "MonetaryAmount",
    value: SHIPPING_RATE,
    currency: "USD",
  },
  shippingDestination: {
    "@type": "DefinedRegion",
    addressCountry: "US",
  },
  deliveryTime: {
    "@type": "ShippingDeliveryTime",
    handlingTime: {
      "@type": "QuantitativeValue",
      minValue: 1,
      maxValue: 3,
      unitCode: "DAY",
    },
    transitTime: {
      "@type": "QuantitativeValue",
      minValue: 2,
      maxValue: 2,
      unitCode: "DAY",
    },
  },
} as const
