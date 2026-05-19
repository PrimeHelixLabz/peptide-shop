import { NextResponse } from "next/server"
import { z } from "zod"
import { requireAuthMiddleware, type AuthenticatedRequest } from "@/lib/auth/middleware"
import { createAdminClient } from "@/lib/supabase/admin"
import { enforceRateLimit } from "@/lib/rate-limit"
import { resolveAffiliateForUser } from "@/lib/affiliates"

const applySchema = z.object({
  name: z.string().trim().min(2, "Name is required").max(120),
  website: z.string().trim().url("Website must be a valid URL").or(z.literal("")).optional(),
  audience: z.string().trim().max(2000).optional(),
  payoutMethod: z.enum(["paypal", "wise", "crypto", "ach", "other"]).optional(),
  payoutDetails: z.string().trim().max(500).optional(),
  // honeypot
  website_url: z.string().max(0).optional().or(z.literal("")),
})

export const POST = requireAuthMiddleware(async (req: AuthenticatedRequest) => {
  // 3 apply attempts / day / user — the user_id uniqueness already caps
  // legitimate use to one, but this throttles the API surface.
  const limited = await enforceRateLimit(req, {
    key: "affiliates:apply",
    limit: 3,
    windowSec: 60 * 60 * 24,
  })
  if (limited) return limited

  let parsed: z.infer<typeof applySchema>
  try {
    const body = await req.json()
    parsed = applySchema.parse(body)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0]?.message ?? "Invalid input" },
        { status: 400 }
      )
    }
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }

  if (parsed.website_url && parsed.website_url.length > 0) {
    // Honeypot tripped — pretend success.
    return NextResponse.json({ ok: true })
  }

  const userId = req.user!.id
  const userEmail = req.user!.email

  // Idempotent application check. resolveAffiliateForUser does the heavy
  // lifting:
  //  - user_id match → "found", treat as already applied
  //  - email match with NULL user_id (e.g. admin manually created the row)
  //    → backfills user_id and returns "found"
  //  - email match with a different user_id → "belongs-to-different-account",
  //    blocked here for security
  //  - none → fall through to INSERT
  const lookup = await resolveAffiliateForUser(userId, userEmail)

  if (lookup.kind === "belongs-to-different-account") {
    return NextResponse.json(
      {
        error:
          "This email is already associated with an existing affiliate account under a different login. Sign in with the original account, or contact support to re-link.",
      },
      { status: 409 }
    )
  }

  if (lookup.kind === "found") {
    return NextResponse.json({
      ok: true,
      alreadyApplied: true,
      status: lookup.affiliate.status,
    })
  }

  const supabase = createAdminClient()
  const { error: insertError } = await supabase
    .from("affiliates")
    .insert({
      user_id: userId,
      name: parsed.name,
      email: userEmail,
      website: parsed.website || null,
      audience: parsed.audience || null,
      payout_method: parsed.payoutMethod || null,
      payout_details: parsed.payoutDetails || null,
      status: "pending",
    })

  if (insertError) {
    // 23505 is unique_violation — a tiny race window between the resolver
    // and the INSERT could theoretically hit this; treat as "already in".
    if ((insertError as { code?: string }).code === "23505") {
      return NextResponse.json({ ok: true, alreadyApplied: true })
    }
    console.error("affiliate apply insert failed:", insertError)
    return NextResponse.json(
      { error: "Could not submit your application. Please try again." },
      { status: 500 }
    )
  }

  return NextResponse.json({ ok: true })
})
