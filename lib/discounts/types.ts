export type DiscountType = "percent" | "amount"

/**
 * Discount row as returned to admin clients. Money values are dollars
 * (matching the rest of the orders pipeline — no cents conversion).
 */
export interface DiscountCode {
  id: string
  code: string
  discountType: DiscountType
  /** Percent off (1-100), set when discountType === "percent". */
  percentOff: number | null
  /** Dollar amount off, set when discountType === "amount". */
  amountOff: number | null
  maxRedemptions: number | null
  perUserMaxRedemptions: number | null
  minSubtotal: number | null
  /** Legacy account-id lock. Kept for codes created before email locking. */
  restrictedToUserId: string | null
  /** Customer email the code is locked to (case-insensitive). Preferred lock. */
  restrictedToEmail: string | null
  isActive: boolean
  expiresAt: string | null
  /**
   * Reservation counter — bumped when a checkout starts, released on
   * cancel/abandon. NOT the same as completed purchases; the admin UI
   * shows `confirmedRedemptions` instead so abandoned holds don't read
   * as "used".
   */
  redeemedCount: number
  /** Count of confirmed (paid) redemptions from the ledger. Admin display. */
  confirmedRedemptions: number
  createdAt: string
  updatedAt: string
}

/** Shape accepted by the create/update admin API. */
export interface DiscountCodeInput {
  code: string
  discountType: DiscountType
  percentOff?: number | null
  amountOff?: number | null
  maxRedemptions?: number | null
  perUserMaxRedemptions?: number | null
  minSubtotal?: number | null
  restrictedToUserId?: string | null
  restrictedToEmail?: string | null
  isActive?: boolean
  expiresAt?: string | null
}

/**
 * Result returned by validateCode() — either an applied calculation or
 * a structured failure with a human-readable reason. The cart UI maps
 * the reason verbatim into the inline error state.
 */
export type ValidationResult =
  | {
      ok: true
      code: DiscountCode
      /** Discount in dollars, rounded to 2dp. */
      discountAmount: number
    }
  | {
      ok: false
      reason: string
    }
