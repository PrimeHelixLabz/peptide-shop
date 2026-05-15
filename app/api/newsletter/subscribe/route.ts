import { NextRequest, NextResponse } from "next/server"
import { createHash } from "crypto"
import { z } from "zod"
import { createAdminClient } from "@/lib/supabase/admin"
import { sendNewsletterWelcomeEmail } from "@/lib/email"

const subscribeSchema = z.object({
  email: z.string().trim().email("Please enter a valid email").max(320),
  source: z.string().trim().max(50).optional().default("popup"),
  // Honeypot field — bots tend to fill every input. Real users leave blank.
  website: z.string().max(0).optional().or(z.literal("")),
})

function hashIp(ip: string | null): string | null {
  if (!ip) return null
  const salt = process.env.NEWSLETTER_IP_SALT || "default-salt-change-me"
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex").slice(0, 32)
}

function getClientIp(req: NextRequest): string | null {
  const forwarded = req.headers.get("x-forwarded-for")
  if (forwarded) return forwarded.split(",")[0]?.trim() || null
  return req.headers.get("x-real-ip")
}

export async function POST(request: NextRequest) {
  if (!process.env.RESEND_API_KEY) {
    console.error("RESEND_API_KEY is not configured")
    return NextResponse.json(
      { error: "Subscription is temporarily unavailable. Please try again later." },
      { status: 503 }
    )
  }

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

  // Honeypot tripped — pretend success and drop silently.
  if (parsed.website && parsed.website.length > 0) {
    return NextResponse.json({ ok: true })
  }

  const email = parsed.email.toLowerCase()
  const supabase = createAdminClient()

  // Check for existing active subscriber.
  const { data: existing } = await supabase
    .from("newsletter_subscribers")
    .select("id, unsubscribed_at")
    .eq("email", email)
    .maybeSingle()

  if (existing && !existing.unsubscribed_at) {
    // Already subscribed; return success without re-sending welcome email
    // to prevent re-trigger abuse.
    return NextResponse.json({ ok: true, alreadySubscribed: true })
  }

  const ipHash = hashIp(getClientIp(request))
  const userAgent = request.headers.get("user-agent")?.slice(0, 500) ?? null

  if (existing && existing.unsubscribed_at) {
    // Re-subscribe path
    const { error: updateError } = await supabase
      .from("newsletter_subscribers")
      .update({
        unsubscribed_at: null,
        subscribed_at: new Date().toISOString(),
        source: parsed.source,
        ip_hash: ipHash,
        user_agent: userAgent,
      })
      .eq("id", existing.id)

    if (updateError) {
      console.error("Failed to re-activate subscriber:", updateError)
      return NextResponse.json(
        { error: "Could not complete subscription. Please try again." },
        { status: 500 }
      )
    }
  } else {
    const { error: insertError } = await supabase
      .from("newsletter_subscribers")
      .insert({
        email,
        source: parsed.source,
        ip_hash: ipHash,
        user_agent: userAgent,
      })

    if (insertError) {
      console.error("Failed to insert subscriber:", insertError)
      return NextResponse.json(
        { error: "Could not complete subscription. Please try again." },
        { status: 500 }
      )
    }
  }

  // Best-effort welcome email; do not fail the subscription if it fails.
  try {
    await sendNewsletterWelcomeEmail(email)
  } catch (err) {
    console.error("Welcome email failed (subscription saved):", err)
  }

  return NextResponse.json({ ok: true })
}
