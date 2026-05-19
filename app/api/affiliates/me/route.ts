import { NextResponse } from "next/server"
import { z } from "zod"
import { requireAuthMiddleware, type AuthenticatedRequest } from "@/lib/auth/middleware"
import {
  getAffiliateByUserId,
  getAffiliateStats,
  ensureCodeForAffiliate,
  updateOwnPayoutDetails,
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

const patchSchema = z.object({
  payoutMethod: z
    .enum(["paypal", "wise", "crypto", "ach", "other"])
    .nullable()
    .optional(),
  payoutDetails: z.string().trim().max(500).nullable().optional(),
})

export const PATCH = requireAuthMiddleware(async (req: AuthenticatedRequest) => {
  let parsed: z.infer<typeof patchSchema>
  try {
    const body = await req.json()
    parsed = patchSchema.parse(body)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0]?.message ?? "Invalid input" },
        { status: 400 }
      )
    }
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }

  const userId = req.user!.id
  const current = await getAffiliateByUserId(userId)
  if (!current) {
    return NextResponse.json(
      { error: "No affiliate account for this user." },
      { status: 404 }
    )
  }

  const updated = await updateOwnPayoutDetails(userId, {
    payoutMethod:
      parsed.payoutMethod === undefined
        ? current.payoutMethod
        : parsed.payoutMethod,
    payoutDetails:
      parsed.payoutDetails === undefined
        ? current.payoutDetails
        : parsed.payoutDetails || null,
  })

  if (!updated) {
    return NextResponse.json(
      { error: "Could not update payout details." },
      { status: 500 }
    )
  }

  return NextResponse.json({ affiliate: updated })
})
