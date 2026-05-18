import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { createAdminClient } from "@/lib/supabase/admin"
import { verifyUnsubscribeToken } from "@/lib/newsletter/unsubscribe-token"
import { enforceRateLimit } from "@/lib/rate-limit"

const bodySchema = z.object({
  email: z.string().trim().email().max(320),
  token: z.string().trim().min(1).max(128),
})

export async function POST(request: NextRequest) {
  // 10 attempts / hour / IP — generous since legitimate use is one-shot,
  // tight enough to slow down token-bruteforcing.
  const limited = await enforceRateLimit(request, {
    key: "newsletter:unsubscribe",
    limit: 10,
    windowSec: 60 * 60,
  })
  if (limited) return limited

  let parsed: z.infer<typeof bodySchema>
  try {
    const body = await request.json()
    parsed = bodySchema.parse(body)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0]?.message ?? "Invalid input" },
        { status: 400 }
      )
    }
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }

  const email = parsed.email.toLowerCase()
  if (!verifyUnsubscribeToken(email, parsed.token)) {
    return NextResponse.json(
      { error: "Invalid or expired unsubscribe link." },
      { status: 400 }
    )
  }

  const supabase = createAdminClient()
  // Idempotent: set unsubscribed_at on any matching row, regardless of
  // whether it was previously active. Returns ok even if the email isn't
  // in our list — don't leak subscriber-status to outside observers.
  const { error } = await supabase
    .from("newsletter_subscribers")
    .update({ unsubscribed_at: new Date().toISOString() })
    .eq("email", email)
    .is("unsubscribed_at", null)

  if (error) {
    console.error("unsubscribe update failed:", error)
    return NextResponse.json(
      { error: "Could not complete unsubscribe. Please try again." },
      { status: 500 }
    )
  }

  return NextResponse.json({ ok: true })
}
