/**
 * Shared discount helpers for the 3 checkout routes (Stripe, Link.money,
 * CentryOS). Reservation lives in the DB — the orders trigger releases on
 * cancel/fail/delete. `releaseDiscountReservation` is only needed when the
 * order never got inserted.
 */

import {
  computeDiscount,
  releaseReservation,
  reserveRedemption,
  validateCode,
} from "@/lib/discounts/db"

export interface AppliedCheckoutDiscount {
  codeId: string
  code: string
  amount: number
}

export type ApplyDiscountResult =
  | { ok: true; discount: AppliedCheckoutDiscount | null }
  | { ok: false; error: string }

/**
 * Validate + atomically reserve a slot. Returns ok:true with discount:null
 * for falsy input so callers don't need a pre-check. Caller is responsible
 * for releasing only when the order never got inserted.
 */
export async function applyDiscountForCheckout(params: {
  inputCode: string | null | undefined
  subtotal: number
  userId: string | null
  email: string | null
}): Promise<ApplyDiscountResult> {
  const code = params.inputCode?.trim()
  if (!code) return { ok: true, discount: null }

  // Authoritative server-side gate; the cart-side validate is just UX.
  const result = await validateCode({
    code,
    subtotal: params.subtotal,
    userId: params.userId,
    email: params.email,
  })
  if (!result.ok) {
    return { ok: false, error: result.reason }
  }

  // Atomic reservation — race-safe against parallel checkouts.
  const reserved = await reserveRedemption({
    codeId: result.code.id,
    userId: params.userId,
    email: params.email,
  })
  if (!reserved) {
    return {
      ok: false,
      error: "This code is no longer available — it was just used by another customer",
    }
  }

  // Recompute against the freshly-locked row in case admin edited the
  // rate between validate and reserve.
  const amount = computeDiscount(reserved, params.subtotal)
  if (amount <= 0) {
    await releaseReservation(reserved.id)
    return {
      ok: false,
      error: "This code doesn't apply to your cart",
    }
  }

  return {
    ok: true,
    discount: {
      codeId: reserved.id,
      code: reserved.code,
      amount,
    },
  }
}

/** Release a reservation made by applyDiscountForCheckout. Safe to call repeatedly. */
export async function releaseDiscountReservation(
  codeId: string | null | undefined
): Promise<void> {
  if (!codeId) return
  await releaseReservation(codeId)
}
