import { NextRequest, NextResponse } from "next/server"
import { randomBytes } from "crypto"
import { z } from "zod"
import { createAdminClient } from "@/lib/supabase/admin"
import { enforceRateLimit } from "@/lib/rate-limit"

const subscribeSchema = z.object({
  email: z.string().trim().email("Please enter a valid email").max(320),
  variantId: z.string().uuid("Invalid variant"),
  // Honeypot — bots fill every field. Real users leave blank.
  website: z.string().max(0).optional().or(z.literal("")),
})

function generateUnsubscribeToken(): string {
  // 32 bytes -> 43-char base64url. Cryptographically unguessable; stored
  // directly in DB with a unique index, so possession of the token equals
  // row-level delete authority.
  return randomBytes(32).toString("base64url")
}

export async function POST(request: NextRequest) {
  // 10 attempts / hour / IP. A single user might legitimately subscribe to
  // a few different out-of-stock variants in one session, but not dozens.
  const limited = await enforceRateLimit(request, {
    key: "restock:subscribe",
    limit: 10,
    windowSec: 60 * 60,
  })
  if (limited) return limited

  let parsed: z.infer<typeof subscribeSchema>
  try {
    const body = await request.json()
    parsed = subscribeSchema.parse(body)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0]?.message ?? "Invalid input" },
        { status: 400 }
      )
    }
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }

  if (parsed.website && parsed.website.length > 0) {
    return NextResponse.json({ ok: true })
  }

  const email = parsed.email.toLowerCase()
  const supabase = createAdminClient()

  // Verify the variant exists and is actually out of stock — no point
  // accepting subscriptions for in-stock variants (the cron would fire an
  // email immediately, which would feel like spam to the user).
  const { data: variant, error: variantError } = await supabase
    .from("product_variants")
    .select("id, in_stock")
    .eq("id", parsed.variantId)
    .maybeSingle()

  if (variantError || !variant) {
    return NextResponse.json({ error: "Variant not found" }, { status: 404 })
  }

  if (variant.in_stock) {
    return NextResponse.json(
      { error: "This product is currently in stock — no notification needed." },
      { status: 400 }
    )
  }

  // Idempotent insert: if (variant_id, email) already exists we silently
  // succeed. The user gets a consistent "we'll let you know" experience
  // even if they click twice.
  const { error: insertError } = await supabase
    .from("restock_notifications")
    .insert({
      variant_id: parsed.variantId,
      email,
      unsubscribe_token: generateUnsubscribeToken(),
    })

  if (insertError) {
    // Postgres unique-violation code; treat as already subscribed.
    if (insertError.code === "23505") {
      return NextResponse.json({ ok: true, alreadySubscribed: true })
    }
    console.error("Failed to insert restock notification:", insertError)
    return NextResponse.json(
      { error: "Could not save your notification request. Please try again." },
      { status: 500 }
    )
  }

  return NextResponse.json({ ok: true })
}
