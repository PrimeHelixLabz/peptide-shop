/**
 * Shared discount helpers used by the three checkout routes
 * (Stripe, Link.money, CentryOS). Each route:
 *
 *   1. Calls `applyDiscountForCheckout()` after computing the cart subtotal,
 *      passing the customer's identity. Returns the reserved discount amount
 *      or an error to surface back to the client.
 *   2. Subtracts the returned amount from subtotal before computing shipping
 *      + service fee.
 *   3. Stores `discountCodeId`, `discountCode`, `discountAmount` on the
 *      order row.
 *   4. On any failure between reservation and successful payment-intent
 *      creation, calls `releaseDiscountReservation()` to give the slot
 *      back. Confirmation happens later in the payment-success webhook
 *      via `confirmRedemption()`.
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
 * Validate, then atomically reserve a redemption slot for a code at
 * order-creation time. If `inputCode` is falsy, returns `{ ok: true, discount: null }` —
 * lets callers always invoke this without a pre-check.
 *
 * NOTE: This mutates `discount_codes.redeemed_count`. If the order
 * creation step that follows it fails, the caller MUST invoke
 * `releaseDiscountReservation(codeId)` to release the slot.
 */
export async function applyDiscountForCheckout(params: {
  inputCode: string | null | undefined
  subtotal: number
  userId: string | null
  email: string | null
}): Promise<ApplyDiscountResult> {
  const code = params.inputCode?.trim()
  if (!code) return { ok: true, discount: null }

  // Re-validate server-side against live state. The client-side
  // /api/discounts/validate is for UX; this is the authoritative gate.
  const result = await validateCode({
    code,
    subtotal: params.subtotal,
    userId: params.userId,
    email: params.email,
  })
  if (!result.ok) {
    return { ok: false, error: result.reason }
  }

  // Race-safe reservation — this is the line that prevents two simultaneous
  // checkouts from both consuming the last unit of a 1-use code, OR the
  // same customer opening two tabs and slipping past a per-user-once code.
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

  // Recompute the discount against the freshly-reserved code state.
  // Almost always identical to result.discountAmount, but guards against
  // the rare case of admin editing the code rate between validate and reserve.
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
