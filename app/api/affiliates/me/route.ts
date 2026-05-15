import { NextResponse } from "next/server"
import { requireAuthMiddleware, type AuthenticatedRequest } from "@/lib/auth/middleware"
import {
  getAffiliateByUserId,
  getAffiliateStats,
  ensureCodeForAffiliate,
} from "@/lib/affiliates"

export const GET = requireAuthMiddleware(async (req: AuthenticatedRequest) => {
  const userId = req.user!.id
  const affiliate = await getAffiliateByUserId(userId)
  if (!affiliate) {
    return NextResponse.json({ affiliate: null })
  }

  // Generate referral code lazily on first dashboard visit after approval —
  // means the admin doesn't have to remember to mint one when flipping
  // status to 'approved' in the Supabase dashboard.
  let code: string | null = null
  if (affiliate.status === "approved") {
    const codeRow = await ensureCodeForAffiliate(affiliate.id, affiliate.name)
    code = codeRow.code
  }

  const stats = await getAffiliateStats(affiliate.id)

  return NextResponse.json({
    affiliate,
    code,
    stats,
  })
})
