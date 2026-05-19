"use client"

import Script from "next/script"
import { publicEnv } from "@/lib/env"
import { TRUSTPILOT_BOOTSTRAP_SRC } from "@/lib/trustpilot/widgets"

/**
 * Mounted once in the root layout. Loads Trustpilot's bootstrap script
 * lazily (after page becomes interactive) so it doesn't compete with
 * first-paint resources. Renders nothing — and skips the script entirely —
 * when no business unit id is configured, so dev environments don't ship
 * a third-party request for no value.
 *
 * The script auto-discovers any `.trustpilot-widget` element on the page
 * and renders the widget into it. Components that render those elements
 * AFTER the script loads should call `window.Trustpilot.loadFromElement`
 * to trigger a render — see <TrustpilotWidget />.
 */
export function TrustpilotScript() {
  if (!publicEnv.NEXT_PUBLIC_TRUSTPILOT_BUSINESS_UNIT_ID) {
    return null
  }
  return (
    <Script
      src={TRUSTPILOT_BOOTSTRAP_SRC}
      strategy="lazyOnload"
      // No `id` collision risk — `next/script` deduplicates by src.
    />
  )
}
