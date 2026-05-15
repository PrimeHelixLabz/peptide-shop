import { createAdminClient } from "@/lib/supabase/admin"
import type { NextRequest } from "next/server"

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
