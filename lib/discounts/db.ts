import { createAdminClient } from "@/lib/supabase/admin"
import { normalizeCode } from "@/lib/discounts/normalize"
import type {
  DiscountCode,
  DiscountCodeInput,
  ValidationResult,
} from "@/lib/discounts/types"

// Re-export so existing imports of `normalizeCode` from `@/lib/discounts/db`
// keep working — server-side callers don't need the lighter-weight module.
export { normalizeCode }

interface DiscountRow {
  id: string
  code: string
  discount_type: "percent" | "amount"
  // NUMERIC columns come back from supabase-js as strings (matches how
  // product variants handle price elsewhere in this codebase). The rowToCode
  // mapper parseFloats them so the JS layer can do arithmetic safely.
  percent_off: string | number | null
  amount_off: string | number | null
  max_redemptions: number | null
  per_user_max_redemptions: number | null
  min_subtotal: string | number | null
  restricted_to_user_id: string | null
  restricted_to_email: string | null
  is_active: boolean
  expires_at: string | null
  redeemed_count: number
  created_at: string
  updated_at: string
}

const SELECT_COLUMNS =
  "id, code, discount_type, percent_off, amount_off, max_redemptions, per_user_max_redemptions, min_subtotal, restricted_to_user_id, restricted_to_email, is_active, expires_at, redeemed_count, created_at, updated_at"

function parseNumericOrNull(value: string | number | null | undefined): number | null {
  if (value == null) return null
  const n = typeof value === "number" ? value : parseFloat(value)
  return Number.isFinite(n) ? n : null
}

function rowToCode(row: DiscountRow): DiscountCode {
  return {
    id: row.id,
    code: row.code,
    discountType: row.discount_type,
    percentOff: parseNumericOrNull(row.percent_off),
    amountOff: parseNumericOrNull(row.amount_off),
    maxRedemptions: row.max_redemptions,
    perUserMaxRedemptions: row.per_user_max_redemptions,
    minSubtotal: parseNumericOrNull(row.min_subtotal),
    restrictedToUserId: row.restricted_to_user_id,
    restrictedToEmail: row.restricted_to_email,
    isActive: row.is_active,
    expiresAt: row.expires_at,
    redeemedCount: row.redeemed_count,
    // Filled in by the admin listing/detail getters; defaults to 0 for
    // callers (validate/reserve) that don't need the confirmed count.
    confirmedRedemptions: 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

/**
 * Count confirmed (paid) redemptions per code from the ledger. Used by
 * the admin views so "used" reflects real purchases rather than the
 * reservation counter (which transiently includes in-flight checkouts).
 */
async function getConfirmedRedemptionCounts(
  supabase: ReturnType<typeof createAdminClient>,
  codeIds: string[]
): Promise<Map<string, number>> {
  const counts = new Map<string, number>()
  if (codeIds.length === 0) return counts
  const { data, error } = await supabase
    .from("discount_redemptions")
    .select("code_id")
    .in("code_id", codeIds)
  if (error) {
    console.error("getConfirmedRedemptionCounts failed:", error)
    return counts
  }
  for (const row of (data as unknown as Array<{ code_id: string }>) || []) {
    counts.set(row.code_id, (counts.get(row.code_id) ?? 0) + 1)
  }
  return counts
}

/**
 * Compute the dollar discount this code would apply to a given subtotal.
 * Rounded to 2dp. Capped at the subtotal — a $25 off code on a $10 order
 * gives $10 off, never a negative total.
 */
export function computeDiscount(code: DiscountCode, subtotal: number): number {
  if (subtotal <= 0) return 0
  let raw = 0
  if (code.discountType === "percent" && code.percentOff != null) {
    raw = subtotal * (code.percentOff / 100)
  } else if (code.discountType === "amount" && code.amountOff != null) {
    raw = code.amountOff
  }
  const capped = Math.min(raw, subtotal)
  return Math.round(capped * 100) / 100
}

/* ────────────────────────────────────────────────────────────────
 *  Admin CRUD
 * ────────────────────────────────────────────────────────────── */

export async function getAllDiscountCodesAsAdmin(): Promise<DiscountCode[]> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from("discount_codes")
    .select(SELECT_COLUMNS)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("getAllDiscountCodesAsAdmin failed:", error)
    return []
  }
  const codes = ((data as unknown as DiscountRow[]) || []).map(rowToCode)
  const counts = await getConfirmedRedemptionCounts(
    supabase,
    codes.map((c) => c.id)
  )
  for (const c of codes) c.confirmedRedemptions = counts.get(c.id) ?? 0
  return codes
}

export async function getDiscountCodeByIdAsAdmin(
  id: string
): Promise<DiscountCode | null> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from("discount_codes")
    .select(SELECT_COLUMNS)
    .eq("id", id)
    .maybeSingle()
  if (error) {
    console.error("getDiscountCodeByIdAsAdmin failed:", error)
    return null
  }
  if (!data) return null
  const code = rowToCode(data as unknown as DiscountRow)
  const counts = await getConfirmedRedemptionCounts(supabase, [code.id])
  code.confirmedRedemptions = counts.get(code.id) ?? 0
  return code
}

/** Used by the admin form for uniqueness UX. */
export async function getDiscountCodeByCodeAsAdmin(
  code: string
): Promise<{ id: string } | null> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from("discount_codes")
    .select("id")
    .eq("code", normalizeCode(code))
    .maybeSingle()
  return (data as unknown as { id: string } | null) ?? null
}

export async function createDiscountCodeAsAdmin(
  input: DiscountCodeInput,
  createdBy: string | null
): Promise<DiscountCode> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from("discount_codes")
    .insert({
      code: normalizeCode(input.code),
      discount_type: input.discountType,
      percent_off: input.discountType === "percent" ? input.percentOff : null,
      amount_off: input.discountType === "amount" ? input.amountOff : null,
      max_redemptions: input.maxRedemptions ?? null,
      per_user_max_redemptions: input.perUserMaxRedemptions ?? null,
      min_subtotal: input.minSubtotal ?? null,
      restricted_to_user_id: input.restrictedToUserId ?? null,
      restricted_to_email: input.restrictedToEmail?.trim().toLowerCase() || null,
      is_active: input.isActive ?? true,
      expires_at: input.expiresAt ?? null,
      created_by: createdBy,
    })
    .select(SELECT_COLUMNS)
    .single()
  if (error) throw error
  return rowToCode(data as unknown as DiscountRow)
}

export async function updateDiscountCodeAsAdmin(
  id: string,
  input: Partial<DiscountCodeInput>
): Promise<DiscountCode> {
  const supabase = createAdminClient()
  const updates: Record<string, unknown> = {}
  if (input.code !== undefined) updates.code = normalizeCode(input.code)
  if (input.discountType !== undefined) {
    updates.discount_type = input.discountType
    // Reset the non-applicable side so the CHECK constraint passes.
    if (input.discountType === "percent") {
      updates.amount_off = null
      if (input.percentOff !== undefined) updates.percent_off = input.percentOff
    } else {
      updates.percent_off = null
      if (input.amountOff !== undefined) updates.amount_off = input.amountOff
    }
  } else {
    if (input.percentOff !== undefined) updates.percent_off = input.percentOff
    if (input.amountOff !== undefined) updates.amount_off = input.amountOff
  }
  if (input.maxRedemptions !== undefined) updates.max_redemptions = input.maxRedemptions
  if (input.perUserMaxRedemptions !== undefined)
    updates.per_user_max_redemptions = input.perUserMaxRedemptions
  if (input.minSubtotal !== undefined) updates.min_subtotal = input.minSubtotal
  if (input.restrictedToUserId !== undefined)
    updates.restricted_to_user_id = input.restrictedToUserId
  if (input.restrictedToEmail !== undefined)
    updates.restricted_to_email =
      input.restrictedToEmail?.trim().toLowerCase() || null
  if (input.isActive !== undefined) updates.is_active = input.isActive
  if (input.expiresAt !== undefined) updates.expires_at = input.expiresAt

  const { data, error } = await supabase
    .from("discount_codes")
    .update(updates)
    .eq("id", id)
    .select(SELECT_COLUMNS)
    .single()
  if (error) throw error
  return rowToCode(data as unknown as DiscountRow)
}

export async function deleteDiscountCodeAsAdmin(id: string): Promise<void> {
  const supabase = createAdminClient()
  const { error } = await supabase.from("discount_codes").delete().eq("id", id)
  if (error) throw error
}

/* ────────────────────────────────────────────────────────────────
 *  Validation + redemption flow
 * ────────────────────────────────────────────────────────────── */

/**
 * Validate a code against a cart subtotal + actor identity.
 *
 * Pure read — does not mutate the redemption counter. Used by:
 *   1. POST /api/discounts/validate when the customer types the code in cart
 *   2. The order-creation routes BEFORE reserveRedemption, as a final check
 *
 * Each failure path returns a specific reason so the UI can show a useful
 * inline message ("Min $200 to use this code") instead of a generic error.
 */
export async function validateCode(params: {
  code: string
  subtotal: number
  userId: string | null
  email: string | null
}): Promise<ValidationResult> {
  const normalized = normalizeCode(params.code)
  if (!normalized) {
    return { ok: false, reason: "Enter a discount code" }
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from("discount_codes")
    .select(SELECT_COLUMNS)
    .eq("code", normalized)
    .maybeSingle()

  if (error) {
    console.error("validateCode lookup failed:", error)
    return { ok: false, reason: "Could not validate code, try again" }
  }
  if (!data) return { ok: false, reason: "Code not found" }

  const code = rowToCode(data as unknown as DiscountRow)

  if (!code.isActive) return { ok: false, reason: "This code is inactive" }

  if (code.expiresAt && new Date(code.expiresAt) <= new Date()) {
    return { ok: false, reason: "This code has expired" }
  }

  // Customer lock: prefer the email lock (works regardless of which
  // account the customer is signed into, as long as the email matches);
  // fall back to the legacy account-id lock for pre-email-lock codes.
  if (code.restrictedToEmail) {
    const actorEmail = params.email?.trim().toLowerCase() || null
    if (!actorEmail || actorEmail !== code.restrictedToEmail.toLowerCase()) {
      return { ok: false, reason: "This code is reserved for another customer" }
    }
  } else if (code.restrictedToUserId && code.restrictedToUserId !== params.userId) {
    return { ok: false, reason: "This code is reserved for another customer" }
  }

  if (
    code.maxRedemptions != null &&
    code.redeemedCount >= code.maxRedemptions
  ) {
    return { ok: false, reason: "This code has reached its redemption limit" }
  }

  if (code.minSubtotal != null && params.subtotal < code.minSubtotal) {
    return {
      ok: false,
      reason: `Add $${(code.minSubtotal - params.subtotal).toFixed(2)} more to use this code (minimum $${code.minSubtotal.toFixed(2)})`,
    }
  }

  // Per-user redemption cap — checked against the confirmed-redemption ledger.
  if (code.perUserMaxRedemptions != null) {
    let query = supabase
      .from("discount_redemptions")
      .select("id", { count: "exact", head: true })
      .eq("code_id", code.id)
    if (params.userId) {
      query = query.eq("user_id", params.userId)
    } else if (params.email) {
      query = query.eq("guest_email", params.email.toLowerCase())
    } else {
      // No identity available — can't enforce per-user cap, fail closed.
      return {
        ok: false,
        reason: "Sign in or provide an email to use this code",
      }
    }
    const { count, error: countError } = await query
    if (countError) {
      console.error("validateCode per-user count failed:", countError)
      return { ok: false, reason: "Could not validate code, try again" }
    }
    if ((count ?? 0) >= code.perUserMaxRedemptions) {
      return { ok: false, reason: "You've already used this code" }
    }
  }

  const discountAmount = computeDiscount(code, params.subtotal)
  if (discountAmount <= 0) {
    return { ok: false, reason: "This code doesn't apply to your cart" }
  }

  return { ok: true, code, discountAmount }
}

/**
 * Atomically reserve a redemption slot. Re-checks every restriction
 * (active, expired, user-lock, global cap, per-user cap) under a row
 * lock so two concurrent checkouts by the same customer can't both
 * sneak past a per-user-once code. Returns null on contention or any
 * restriction failure — the caller treats it the same way.
 *
 * Must be paired with confirmRedemption() on payment success, or
 * releaseReservation() on cancel/failure.
 */
export async function reserveRedemption(params: {
  codeId: string
  userId: string | null
  email: string | null
}): Promise<DiscountCode | null> {
  const supabase = createAdminClient()
  const { data, error } = await supabase.rpc("discount_reserve_redemption", {
    p_code_id: params.codeId,
    p_user_id: params.userId,
    p_guest_email: params.userId ? null : params.email?.toLowerCase() ?? null,
    // Actor email for the email-lock check (re-validated atomically here).
    p_actor_email: params.email?.toLowerCase() ?? null,
  })
  if (error) {
    console.error("reserveRedemption failed:", error)
    return null
  }
  if (!data || (Array.isArray(data) && data.length === 0)) return null
  const row = (Array.isArray(data) ? data[0] : data) as DiscountRow
  return rowToCode(row)
}

/** Release a reservation. Idempotent. Use on payment failure / abandonment. */
export async function releaseReservation(codeId: string): Promise<void> {
  const supabase = createAdminClient()
  const { error } = await supabase.rpc("discount_release_reservation", {
    p_code_id: codeId,
  })
  if (error) {
    console.error("releaseReservation failed:", error)
  }
}

/**
 * Record a confirmed redemption. Called from payment-success webhooks.
 * Idempotent via the unique (code_id, user_id) / (code_id, guest_email) constraints —
 * a duplicate-fire from the webhook returns the existing row instead of failing.
 */
export async function confirmRedemption(params: {
  codeId: string
  userId: string | null
  email: string | null
  orderId: string
  discountApplied: number
}): Promise<void> {
  const supabase = createAdminClient()
  const insert = {
    code_id: params.codeId,
    user_id: params.userId,
    guest_email: params.userId ? null : params.email?.toLowerCase() ?? null,
    order_id: params.orderId,
    discount_applied: params.discountApplied,
  }
  const { error } = await supabase
    .from("discount_redemptions")
    .insert(insert)
  if (error && error.code !== "23505") {
    // 23505 = unique violation = already recorded. Anything else is real.
    console.error("confirmRedemption failed:", error)
  }
}

/**
 * Listing of confirmed redemptions for a single code, newest first.
 * Used by the admin edit page to show audit context inline.
 */
export interface DiscountRedemptionRecord {
  id: string
  userId: string | null
  guestEmail: string | null
  orderId: string
  discountApplied: number
  redeemedAt: string
}

export async function getRedemptionsForCodeAsAdmin(
  codeId: string,
  limit = 20
): Promise<DiscountRedemptionRecord[]> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from("discount_redemptions")
    .select("id, user_id, guest_email, order_id, discount_applied, redeemed_at")
    .eq("code_id", codeId)
    .order("redeemed_at", { ascending: false })
    .limit(limit)
  if (error) {
    console.error("getRedemptionsForCodeAsAdmin failed:", error)
    return []
  }
  return ((data as unknown as Array<{
    id: string
    user_id: string | null
    guest_email: string | null
    order_id: string
    discount_applied: string | number
    redeemed_at: string
  }>) || []).map((r) => ({
    id: r.id,
    userId: r.user_id,
    guestEmail: r.guest_email,
    orderId: r.order_id,
    discountApplied: parseNumericOrNull(r.discount_applied) ?? 0,
    redeemedAt: r.redeemed_at,
  }))
}
