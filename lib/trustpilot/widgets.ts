/**
 * Trustpilot TrustBox variants.
 *
 * Template IDs are Trustpilot's public widget identifiers (documented at
 * business.trustpilot.com → Integrations → TrustBox). They are stable
 * public constants — they don't change per business and don't need to
 * be configured per-deploy.
 *
 * Default dimensions are chosen so each variant looks right in its
 * intended placement without the caller having to compute pixel values.
 * Callers can override `height` / `width` per usage.
 */

export type TrustpilotVariant =
  | "mini"
  | "micro-combo"
  | "carousel"
  | "review-collector"

export interface TrustpilotVariantSpec {
  templateId: string
  /** Pixel height the iframe needs. Trustpilot computes width based on container. */
  defaultHeight: string
  defaultWidth: string
  /** What this variant is meant to do. Informational only. */
  description: string
}

export const TRUSTPILOT_VARIANTS: Record<TrustpilotVariant, TrustpilotVariantSpec> = {
  /**
   * Compact badge: stars + total review count. Good in footers and tight
   * sidebars where you want the badge but not a long widget.
   */
  mini: {
    templateId: "53aa8807dec7e10d38f59f32",
    defaultHeight: "150px",
    defaultWidth: "120px",
    description: "Small badge with star rating and review count.",
  },
  /**
   * Inline line: "Excellent · 4.8 out of 5 based on N reviews". Best for
   * placing next to product names, headlines, and trust headers.
   */
  "micro-combo": {
    templateId: "5419b6ffb0d04a076446a9af",
    defaultHeight: "24px",
    defaultWidth: "100%",
    description: "Horizontal line with rating word, stars, and review count.",
  },
  /**
   * Rotating excerpts from recent reviews. Strong for "social proof" home
   * sections — visitors scroll past it and absorb sentiment without
   * clicking through.
   */
  carousel: {
    templateId: "53aa8912dec7e10d38f59f36",
    defaultHeight: "240px",
    defaultWidth: "100%",
    description: "Auto-rotating carousel of recent reviews.",
  },
  /**
   * "Write a review" CTA. Use sparingly — post-purchase order page is the
   * natural spot. Pulls customers OUT of your site to Trustpilot, which
   * is acceptable when you're soliciting; less so on traffic-conversion
   * surfaces.
   */
  "review-collector": {
    templateId: "56278e9abfbbba0bdcd568bc",
    defaultHeight: "52px",
    defaultWidth: "100%",
    description: "Call-to-action button inviting customers to leave a review.",
  },
}

export const TRUSTPILOT_BOOTSTRAP_SRC =
  "https://widget.trustpilot.com/bootstrap/v5/tp.widget.bootstrap.min.js"
