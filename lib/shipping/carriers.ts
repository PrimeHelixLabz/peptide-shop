/**
 * Shipping carrier registry.
 *
 * Single source of truth for the carriers we surface in the admin UI,
 * the customer-facing shipping email, and the DB check constraint
 * (see migration 037). When you add a carrier here you must also add
 * its key to the CHECK constraint in that migration (and run a new
 * migration to alter it).
 */

export type CarrierKey = "fedex" | "usps" | "ups" | "dhl" | "other"

export interface CarrierInfo {
  key: CarrierKey
  label: string
  /**
   * Builds a public tracking URL for a tracking number, or `null` if the
   * carrier doesn't have one (e.g. "other"). Returns null when number is
   * empty.
   */
  trackingUrl: (trackingNumber: string) => string | null
}

const enc = (s: string) => encodeURIComponent(s.trim())

export const CARRIERS: Record<CarrierKey, CarrierInfo> = {
  fedex: {
    key: "fedex",
    label: "FedEx",
    trackingUrl: (n) =>
      n.trim() ? `https://www.fedex.com/fedextrack/?trknbr=${enc(n)}` : null,
  },
  usps: {
    key: "usps",
    label: "USPS",
    trackingUrl: (n) =>
      n.trim()
        ? `https://tools.usps.com/go/TrackConfirmAction?tLabels=${enc(n)}`
        : null,
  },
  ups: {
    key: "ups",
    label: "UPS",
    trackingUrl: (n) =>
      n.trim() ? `https://www.ups.com/track?tracknum=${enc(n)}` : null,
  },
  dhl: {
    key: "dhl",
    label: "DHL",
    trackingUrl: (n) =>
      n.trim()
        ? `https://www.dhl.com/en/express/tracking.html?AWB=${enc(n)}`
        : null,
  },
  other: {
    key: "other",
    label: "Other",
    trackingUrl: () => null,
  },
}

export const CARRIER_OPTIONS: Array<{ value: CarrierKey; label: string }> = (
  Object.values(CARRIERS)
).map((c) => ({ value: c.key, label: c.label }))

export function isCarrierKey(value: unknown): value is CarrierKey {
  return typeof value === "string" && value in CARRIERS
}

export function carrierLabel(key: string | null | undefined): string {
  if (!key) return "—"
  if (isCarrierKey(key)) return CARRIERS[key].label
  return key
}

/**
 * Convenience: build a tracking URL given a (possibly missing) carrier
 * and number. Returns null when either is missing or unmappable.
 */
export function buildTrackingUrl(
  carrier: string | null | undefined,
  trackingNumber: string | null | undefined
): string | null {
  if (!carrier || !trackingNumber) return null
  if (!isCarrierKey(carrier)) return null
  return CARRIERS[carrier].trackingUrl(trackingNumber)
}
