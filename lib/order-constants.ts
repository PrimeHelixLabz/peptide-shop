/**
 * Centralized order-related constants.
 * Used by checkout API, order summary UI, and legacy order route.
 */

/** Flat-rate shipping cost for FedEx 2Day (USD) */
export const SHIPPING_RATE = 15

/** Service fee as a fraction of subtotal (e.g. 0.05 = 5%) */
export const SERVICE_FEE_RATE = 0.05

/** Subtotal (pre-fees) at which shipping becomes free. */
export const FREE_SHIPPING_THRESHOLD = 250

/** Human-readable carrier label, used in UI and Stripe line items. */
export const SHIPPING_CARRIER_LABEL = "FedEx 2Day"

/**
 * Returns the shipping cost for a given pre-fee subtotal and shipping method.
 * Server-side callers MUST use this rather than trusting any client-provided
 * shipping value, since the threshold is the source of truth for free
 * shipping.
 */
export function getShippingCost(
  subtotal: number,
  shippingMethod: "ship" | "local-pickup" = "ship"
): number {
  if (shippingMethod === "local-pickup") return 0
  if (subtotal >= FREE_SHIPPING_THRESHOLD) return 0
  return SHIPPING_RATE
}
