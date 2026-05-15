import { NextResponse } from "next/server"
import { z } from "zod"
import { requireAuthMiddleware, type AuthenticatedRequest } from "@/lib/auth/middleware"
import { createAdminClient } from "@/lib/supabase/admin"

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
  const supabase = createAdminClient()

  // If the user already has an affiliate row, return it (idempotent).
  const { data: existing } = await supabase
    .from("affiliates")
    .select("id, status")
    .eq("user_id", userId)
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ ok: true, alreadyApplied: true, status: (existing as { status: string }).status })
  }

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
    // 23505 is unique_violation — could happen if email is already registered
    // under a different user (e.g., the partner had two accounts).
    if ((insertError as { code?: string }).code === "23505") {
      return NextResponse.json(
        {
          error:
            "This email is already associated with an existing affiliate account. Sign in with the correct account.",
        },
        { status: 409 }
      )
    }
    console.error("affiliate apply insert failed:", insertError)
    return NextResponse.json(
      { error: "Could not submit your application. Please try again." },
      { status: 500 }
    )
  }

  return NextResponse.json({ ok: true })
})
