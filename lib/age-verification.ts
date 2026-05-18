/**
 * Server-side age-verification check for checkout-creating routes.
 *
 * Two signals are accepted:
 *   1. Authenticated user with `profiles.age_verified = true` (persisted by
 *      the AgeVerification modal via PUT /api/profile).
 *   2. Guest visitor with the `phl_age_verified=1` cookie set by the same
 *      modal at confirm-time.
 *
 * Neither signal is cryptographically tamper-proof — a determined attacker
 * can forge the cookie. The point is documented intent and a defensible
 * audit trail, not impenetrable enforcement. For the research-peptide
 * niche this satisfies the "we made a reasonable effort" standard most
 * payment processors and merchant-banking partners look for.
 */

import type { NextRequest } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

export const AGE_VERIFIED_COOKIE = "phl_age_verified"
export const AGE_VERIFIED_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 90 // 90 days

export type AgeVerificationResult =
  | { ok: true }
  | { ok: false; reason: string }

export async function assertAgeVerified(
  req: NextRequest,
  authenticatedUserId: string | null | undefined
): Promise<AgeVerificationResult> {
  // Path 1: authenticated user with persisted verification.
  if (authenticatedUserId) {
    try {
      const supabase = createAdminClient()
      const { data } = await supabase
        .from("profiles")
        .select("age_verified")
        .eq("id", authenticatedUserId)
        .maybeSingle()
      if ((data as { age_verified?: boolean } | null)?.age_verified) {
        return { ok: true }
      }
    } catch (err) {
      console.error("age-verification profile lookup failed:", err)
      // Fall through to cookie check rather than blocking on a transient DB error.
    }
  }

  // Path 2: cookie set by AgeVerification modal at accept time.
  const cookie = req.cookies.get(AGE_VERIFIED_COOKIE)?.value
  if (cookie === "1") {
    return { ok: true }
  }

  return {
    ok: false,
    reason:
      "You must confirm you are 18+ and accept the research-only terms before placing an order.",
  }
}
