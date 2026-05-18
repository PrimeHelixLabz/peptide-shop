import { createAdminClient } from "@/lib/supabase/admin"
import type { NextRequest } from "next/server"
import { sendAffiliateApprovedEmail } from "@/lib/email"

export const REF_COOKIE_NAME = "phl_ref"
export const REF_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 90 // 90 days

/**
 * Reads the affiliate ref cookie from a Next request and returns a normalized
 * uppercase code, or null if absent or malformed. Format-validation only —
 * the conversion trigger does the authoritative active-and-approved check at
 * order-paid time, so a stale cookie value can't create rogue commissions.
 */
export function getAffiliateCodeFromRequest(req: NextRequest): string | null {
  const raw = req.cookies.get(REF_COOKIE_NAME)?.value
  if (!raw) return null
  if (!/^[A-Z0-9]{4,32}$/i.test(raw)) return null
  return raw.toUpperCase()
}

export type AffiliateStatus = "pending" | "approved" | "suspended"

export interface Affiliate {
  id: string
  userId: string | null
  name: string
  email: string
  website: string | null
  audience: string | null
  payoutMethod: string | null
  payoutDetails: string | null
  status: AffiliateStatus
  commissionRate: number
  approvedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface AffiliateCode {
  id: string
  affiliateId: string
  code: string
  isActive: boolean
  createdAt: string
}

export type ConversionStatus = "pending" | "payable" | "paid" | "reversed"

export interface AffiliateConversion {
  id: string
  affiliateId: string
  code: string
  orderId: string
  orderTotal: number
  commissionRate: number
  commissionAmount: number
  status: ConversionStatus
  paidAt: string | null
  createdAt: string
}

export interface AffiliateStats {
  totalConversions: number
  totalEarnings: number
  pendingEarnings: number
  payableEarnings: number
  paidEarnings: number
  recentConversions: AffiliateConversion[]
}

interface AffiliateRow {
  id: string
  user_id: string | null
  name: string
  email: string
  website: string | null
  audience: string | null
  payout_method: string | null
  payout_details: string | null
  status: AffiliateStatus
  commission_rate: number
  approved_at: string | null
  created_at: string
  updated_at: string
}

interface CodeRow {
  id: string
  affiliate_id: string
  code: string
  is_active: boolean
  created_at: string
}

interface ConversionRow {
  id: string
  affiliate_id: string
  code: string
  order_id: string
  order_total: number | string
  commission_rate: number | string
  commission_amount: number | string
  status: ConversionStatus
  paid_at: string | null
  created_at: string
}

function rowToAffiliate(row: AffiliateRow): Affiliate {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    email: row.email,
    website: row.website,
    audience: row.audience,
    payoutMethod: row.payout_method,
    payoutDetails: row.payout_details,
    status: row.status,
    commissionRate: Number(row.commission_rate),
    approvedAt: row.approved_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function rowToCode(row: CodeRow): AffiliateCode {
  return {
    id: row.id,
    affiliateId: row.affiliate_id,
    code: row.code,
    isActive: row.is_active,
    createdAt: row.created_at,
  }
}

function rowToConversion(row: ConversionRow): AffiliateConversion {
  return {
    id: row.id,
    affiliateId: row.affiliate_id,
    code: row.code,
    orderId: row.order_id,
    orderTotal: Number(row.order_total),
    commissionRate: Number(row.commission_rate),
    commissionAmount: Number(row.commission_amount),
    status: row.status,
    paidAt: row.paid_at,
    createdAt: row.created_at,
  }
}

/**
 * Generates a referral code: 4 letters from the affiliate's name (uppercased,
 * stripped to A-Z) + 4 random base32 chars. Avoids 0/1/I/O ambiguity.
 */
export function generateAffiliateCode(name: string): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
  const namePart = (name || "")
    .replace(/[^A-Za-z]/g, "")
    .toUpperCase()
    .slice(0, 4)
    .padEnd(4, "X")
  let randomPart = ""
  for (let i = 0; i < 4; i++) {
    randomPart += alphabet[Math.floor(Math.random() * alphabet.length)]
  }
  return `${namePart}${randomPart}`
}

/**
 * Resolves the active code for an affiliate, generating one if missing.
 * Used both at approval time (admin sets status='approved') and at
 * dashboard-load time as a safety net.
 */
export async function ensureCodeForAffiliate(
  affiliateId: string,
  affiliateName: string
): Promise<AffiliateCode> {
  const supabase = createAdminClient()

  const { data: existing } = await supabase
    .from("affiliate_codes")
    .select("id, affiliate_id, code, is_active, created_at")
    .eq("affiliate_id", affiliateId)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (existing) return rowToCode(existing as unknown as CodeRow)

  // Try a few times to handle the unlikely case of a code collision.
  let lastError: unknown = null
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateAffiliateCode(affiliateName)
    const { data: inserted, error } = await supabase
      .from("affiliate_codes")
      .insert({ affiliate_id: affiliateId, code, is_active: true })
      .select("id, affiliate_id, code, is_active, created_at")
      .single()

    if (!error && inserted) {
      return rowToCode(inserted as unknown as CodeRow)
    }
    lastError = error
  }
  throw new Error(
    `Failed to generate unique affiliate code: ${String(lastError)}`
  )
}

export async function getAffiliateByUserId(
  userId: string
): Promise<Affiliate | null> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from("affiliates")
    .select(
      "id, user_id, name, email, website, audience, payout_method, payout_details, status, commission_rate, approved_at, created_at, updated_at"
    )
    .eq("user_id", userId)
    .maybeSingle()

  if (error) {
    console.error("getAffiliateByUserId failed:", error)
    return null
  }
  if (!data) return null
  return rowToAffiliate(data as unknown as AffiliateRow)
}

export interface AffiliateWithStats extends Affiliate {
  conversionsCount: number
  totalEarnings: number
  pendingEarnings: number
  payableEarnings: number
  paidEarnings: number
}

/**
 * Admin-only: returns every affiliate row with rolled-up conversion stats.
 * Aggregated in two queries (affiliates + conversions) rather than per-row
 * to avoid an N+1.
 */
export async function getAllAffiliatesWithStatsAsAdmin(): Promise<
  AffiliateWithStats[]
> {
  const supabase = createAdminClient()

  const [{ data: affiliatesData, error: affiliatesError }, { data: conversionsData, error: conversionsError }] =
    await Promise.all([
      supabase
        .from("affiliates")
        .select(
          "id, user_id, name, email, website, audience, payout_method, payout_details, status, commission_rate, approved_at, created_at, updated_at"
        )
        .order("created_at", { ascending: false }),
      supabase
        .from("affiliate_conversions")
        .select("affiliate_id, status, commission_amount"),
    ])

  if (affiliatesError) {
    console.error("getAllAffiliatesWithStatsAsAdmin: affiliates query failed", affiliatesError)
    return []
  }
  if (conversionsError) {
    console.error("getAllAffiliatesWithStatsAsAdmin: conversions query failed", conversionsError)
    // Continue — affiliate list is more important than stats.
  }

  type ConvAggRow = {
    affiliate_id: string
    status: ConversionStatus
    commission_amount: number | string
  }
  const grouped = new Map<
    string,
    {
      conversionsCount: number
      totalEarnings: number
      pendingEarnings: number
      payableEarnings: number
      paidEarnings: number
    }
  >()

  for (const row of (conversionsData as unknown as ConvAggRow[]) || []) {
    const acc = grouped.get(row.affiliate_id) || {
      conversionsCount: 0,
      totalEarnings: 0,
      pendingEarnings: 0,
      payableEarnings: 0,
      paidEarnings: 0,
    }
    acc.conversionsCount += 1
    if (row.status !== "reversed") {
      const amount = Number(row.commission_amount)
      acc.totalEarnings += amount
      if (row.status === "pending") acc.pendingEarnings += amount
      if (row.status === "payable") acc.payableEarnings += amount
      if (row.status === "paid") acc.paidEarnings += amount
    }
    grouped.set(row.affiliate_id, acc)
  }

  return ((affiliatesData as unknown as AffiliateRow[]) || []).map((row) => {
    const aff = rowToAffiliate(row)
    const stats = grouped.get(aff.id) || {
      conversionsCount: 0,
      totalEarnings: 0,
      pendingEarnings: 0,
      payableEarnings: 0,
      paidEarnings: 0,
    }
    return {
      ...aff,
      conversionsCount: stats.conversionsCount,
      totalEarnings: roundCurrency(stats.totalEarnings),
      pendingEarnings: roundCurrency(stats.pendingEarnings),
      payableEarnings: roundCurrency(stats.payableEarnings),
      paidEarnings: roundCurrency(stats.paidEarnings),
    }
  })
}

export async function getAffiliateByIdAsAdmin(
  id: string
): Promise<Affiliate | null> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from("affiliates")
    .select(
      "id, user_id, name, email, website, audience, payout_method, payout_details, status, commission_rate, approved_at, created_at, updated_at"
    )
    .eq("id", id)
    .maybeSingle()
  if (error) {
    console.error("getAffiliateByIdAsAdmin failed:", error)
    return null
  }
  if (!data) return null
  return rowToAffiliate(data as unknown as AffiliateRow)
}

export interface AffiliateAdminUpdate {
  status?: AffiliateStatus
  commissionRate?: number
  notes?: string
  payoutMethod?: string | null
  payoutDetails?: string | null
}

/**
 * Admin update: status transitions auto-stamp approved_at, and approving an
 * affiliate also generates their referral code so it's ready before they
 * next log in.
 */
export async function updateAffiliateAsAdmin(
  id: string,
  update: AffiliateAdminUpdate
): Promise<Affiliate | null> {
  const supabase = createAdminClient()

  const before = await getAffiliateByIdAsAdmin(id)
  if (!before) return null

  const patch: Record<string, unknown> = {}
  if (update.status !== undefined) {
    patch.status = update.status
    if (update.status === "approved" && !before.approvedAt) {
      patch.approved_at = new Date().toISOString()
    }
  }
  if (update.commissionRate !== undefined) {
    patch.commission_rate = update.commissionRate
  }
  if (update.notes !== undefined) patch.notes = update.notes
  if (update.payoutMethod !== undefined) patch.payout_method = update.payoutMethod
  if (update.payoutDetails !== undefined) patch.payout_details = update.payoutDetails

  if (Object.keys(patch).length === 0) return before

  const { data, error } = await supabase
    .from("affiliates")
    .update(patch)
    .eq("id", id)
    .select(
      "id, user_id, name, email, website, audience, payout_method, payout_details, status, commission_rate, approved_at, created_at, updated_at"
    )
    .single()

  if (error) {
    console.error("updateAffiliateAsAdmin failed:", error)
    throw error
  }
  const after = rowToAffiliate(data as unknown as AffiliateRow)

  // Mint a referral code + notify the affiliate the first time they're
  // approved. The dashboard ensures the code on-load as a safety net, but
  // doing it here means the welcome email can include the code directly.
  if (
    before.status !== "approved" &&
    after.status === "approved"
  ) {
    try {
      const code = await ensureCodeForAffiliate(after.id, after.name)
      // Best-effort: don't fail the admin's approve action if email
      // delivery hiccups.
      sendAffiliateApprovedEmail({
        toEmail: after.email,
        name: after.name,
        code: code.code,
        commissionRatePercent: after.commissionRate * 100,
      }).catch((err) =>
        console.error("Failed to send affiliate approval email:", err)
      )
    } catch (err) {
      console.error("Failed to mint referral code after approval:", err)
    }
  }

  return after
}

export async function getAffiliateStats(
  affiliateId: string
): Promise<AffiliateStats> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from("affiliate_conversions")
    .select(
      "id, affiliate_id, code, order_id, order_total, commission_rate, commission_amount, status, paid_at, created_at"
    )
    .eq("affiliate_id", affiliateId)
    .order("created_at", { ascending: false })

  if (error || !data) {
    if (error) console.error("getAffiliateStats failed:", error)
    return {
      totalConversions: 0,
      totalEarnings: 0,
      pendingEarnings: 0,
      payableEarnings: 0,
      paidEarnings: 0,
      recentConversions: [],
    }
  }

  const rows = data as unknown as ConversionRow[]
  const conversions = rows.map(rowToConversion)
  const acc = {
    totalEarnings: 0,
    pendingEarnings: 0,
    payableEarnings: 0,
    paidEarnings: 0,
  }
  for (const c of conversions) {
    if (c.status === "reversed") continue
    acc.totalEarnings += c.commissionAmount
    if (c.status === "pending") acc.pendingEarnings += c.commissionAmount
    if (c.status === "payable") acc.payableEarnings += c.commissionAmount
    if (c.status === "paid") acc.paidEarnings += c.commissionAmount
  }
  return {
    totalConversions: conversions.length,
    totalEarnings: roundCurrency(acc.totalEarnings),
    pendingEarnings: roundCurrency(acc.pendingEarnings),
    payableEarnings: roundCurrency(acc.payableEarnings),
    paidEarnings: roundCurrency(acc.paidEarnings),
    recentConversions: conversions.slice(0, 25),
  }
}

function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100
}

/**
 * Validates that a code corresponds to an approved affiliate's active code.
 * Used for click-time sanity checks; the conversion trigger enforces this
 * authoritatively at order-paid time.
 */
export async function isValidActiveCode(code: string): Promise<boolean> {
  if (!code || !/^[A-Z0-9]{4,32}$/i.test(code)) return false
  const supabase = createAdminClient()
  const { data } = await supabase
    .from("affiliate_codes")
    .select("id, affiliates!inner(status)")
    .eq("code", code)
    .eq("is_active", true)
    .maybeSingle()
  if (!data) return false
  // Postgrest embeds related rows under the relation name as object/array
  // depending on cardinality; we asked for inner-join so it's an object.
  const affiliate = (data as unknown as { affiliates: { status: string } | null })
    .affiliates
  return affiliate?.status === "approved"
}
