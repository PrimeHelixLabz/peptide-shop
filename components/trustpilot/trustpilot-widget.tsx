"use client"

import { useEffect, useRef } from "react"
import { publicEnv } from "@/lib/env"
import {
  TRUSTPILOT_VARIANTS,
  type TrustpilotVariant,
} from "@/lib/trustpilot/widgets"

/**
 * Trustpilot global injected by their bootstrap script. Typed loosely —
 * we only call one method on it.
 */
declare global {
  interface Window {
    Trustpilot?: {
      loadFromElement: (element: HTMLElement | null, forceReload?: boolean) => void
    }
  }
}

interface TrustpilotWidgetProps {
  variant: TrustpilotVariant
  /** Override the variant default height (e.g. "300px"). */
  height?: string
  /** Override the variant default width (e.g. "200px" or "100%"). */
  width?: string
  /** "light" (default) or "dark". */
  theme?: "light" | "dark"
  /**
   * Restrict displayed reviews to certain star counts. Pass "4,5" to show
   * only 4- and 5-star reviews (sensible default for marketing surfaces).
   */
  stars?: string
  /** Locale of reviews + UI. Defaults to en-US. */
  locale?: string
  /** Wrapper className (applied to the OUTER div, not the widget itself). */
  className?: string
}

/**
 * Renders a Trustpilot TrustBox of the chosen variant.
 *
 * Renders nothing when NEXT_PUBLIC_TRUSTPILOT_BUSINESS_UNIT_ID is not set
 * (dev / pre-Trustpilot launch). Once configured, the widget appears
 * automatically with no further changes to call sites.
 *
 * The mount-time `loadFromElement` call handles the race where the widget
 * div is added to the DOM AFTER the bootstrap script has already scanned
 * and missed it. Without this, route navigations would leave widgets
 * blank until a hard reload.
 */
export function TrustpilotWidget({
  variant,
  height,
  width,
  theme = "light",
  stars,
  locale = "en-US",
  className,
}: TrustpilotWidgetProps) {
  const ref = useRef<HTMLDivElement>(null)
  const businessUnitId = publicEnv.NEXT_PUBLIC_TRUSTPILOT_BUSINESS_UNIT_ID
  const domain = publicEnv.NEXT_PUBLIC_TRUSTPILOT_DOMAIN

  useEffect(() => {
    // Tell Trustpilot to render into our just-mounted element. Safe to
    // call repeatedly; safe to call when the script hasn't loaded yet
    // (the global is undefined and we no-op).
    if (typeof window !== "undefined" && window.Trustpilot && ref.current) {
      window.Trustpilot.loadFromElement(ref.current, true)
    }
  }, [variant, businessUnitId])

  if (!businessUnitId) {
    return null
  }

  const spec = TRUSTPILOT_VARIANTS[variant]
  const trustpilotProfileUrl = domain
    ? `https://www.trustpilot.com/review/${domain}`
    : "https://www.trustpilot.com"

  return (
    <div
      ref={ref}
      className={`trustpilot-widget ${className ?? ""}`}
      data-locale={locale}
      data-template-id={spec.templateId}
      data-businessunit-id={businessUnitId}
      data-style-height={height ?? spec.defaultHeight}
      data-style-width={width ?? spec.defaultWidth}
      data-theme={theme}
      {...(stars ? { "data-stars": stars } : {})}
    >
      {/* Required fallback link — shown if the widget fails to load,
          and used by Trustpilot as the destination link inside the widget. */}
      <a href={trustpilotProfileUrl} target="_blank" rel="noopener noreferrer">
        Trustpilot
      </a>
    </div>
  )
}
