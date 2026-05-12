/**
 * Centralized order-related constants.
 * Used by checkout API, order summary UI, and legacy order route.
 */

/** Flat-rate shipping cost for FedEx 2Day (USD) */
export const SHIPPING_RATE = 15

/**
 * Default service fee as a fraction of subtotal (e.g. 0.05 = 5%).
 * Per-method overrides live in `SERVICE_FEE_RATE_BY_METHOD` below —
 * call `getServiceFeeRate(method)` to look up the rate for a flow.
 */
export const SERVICE_FEE_RATE = 0.05

/** Known payment method identifiers used across checkout flows. */
export type PaymentMethod = "centryos" | "link_money" | "stripe" | "manual"

/**
 * Per-method service fee rate. CentryOS is 0% because CentryOS deducts
 * its MDR from our merchant receivable — we don't pass that cost onto
 * the customer. Other methods keep the flat default.
 */
export const SERVICE_FEE_RATE_BY_METHOD: Record<PaymentMethod, number> = {
  centryos: 0,
  link_money: SERVICE_FEE_RATE,
  stripe: SERVICE_FEE_RATE,
  manual: SERVICE_FEE_RATE,
}

/**
 * Resolve the service fee rate for a given payment method. Unknown
 * strings fall back to the default rate so legacy payloads keep working.
 */
export function getServiceFeeRate(method: PaymentMethod | string | null | undefined): number {
  if (!method) return SERVICE_FEE_RATE
  return SERVICE_FEE_RATE_BY_METHOD[method as PaymentMethod] ?? SERVICE_FEE_RATE
}

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
