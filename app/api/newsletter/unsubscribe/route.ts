import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { createAdminClient } from "@/lib/supabase/admin"
import { verifyUnsubscribeToken } from "@/lib/newsletter/unsubscribe-token"
import { enforceRateLimit } from "@/lib/rate-limit"

const credsSchema = z.object({
  email: z.string().trim().email().max(320),
  token: z.string().trim().min(1).max(128),
})

type UnsubResult = { ok: true } | { ok: false; status: number; error: string }

/**
 * Core unsubscribe. Possession of a valid HMAC token is the authority to
 * unsubscribe the email it was signed for, so there's no other auth check.
 * Idempotent: only flips still-active rows, and returns ok even when the
 * email isn't in our list — don't leak subscriber-status to outsiders.
 */
async function doUnsubscribe(email: string, token: string): Promise<UnsubResult> {
  const normalized = email.toLowerCase()
  if (!verifyUnsubscribeToken(normalized, token)) {
    return { ok: false, status: 400, error: "Invalid or expired unsubscribe link." }
  }

  const supabase = createAdminClient()
  const { error } = await supabase
    .from("newsletter_subscribers")
    .update({ unsubscribed_at: new Date().toISOString() })
    .eq("email", normalized)
    .is("unsubscribed_at", null)

  if (error) {
    console.error("unsubscribe update failed:", error)
    return {
      ok: false,
      status: 500,
      error: "Could not complete unsubscribe. Please try again.",
    }
  }

  return { ok: true }
}

function htmlResponse(body: string, status = 200): Response {
  return new Response(
    `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Unsubscribe | PrimeHelix Labz</title><style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f3f4f6;margin:0;padding:48px 20px;color:#111827}main{max-width:520px;margin:0 auto;background:#fff;border-radius:12px;padding:32px;box-shadow:0 1px 3px rgba(0,0,0,.08)}h1{margin:0 0 12px;font-size:22px}p{margin:8px 0;line-height:1.6;color:#374151}a{color:#1e293b}</style></head><body><main>${body}</main></body></html>`,
    { status, headers: { "Content-Type": "text/html; charset=utf-8" } }
  )
}

/**
 * Unsubscribe endpoint.
 *
 * Two callers:
 *  1. The /unsubscribe page form — POSTs JSON {email, token}. Rate-limited
 *     per-IP since it's a public, scriptable surface.
 *  2. RFC 8058 one-click — Gmail/Outlook POST to the `List-Unsubscribe` URL
 *     (email+token in the query string, body "List-Unsubscribe=One-Click").
 *     These arrive proxied through the provider's shared IPs, so a per-IP
 *     rate limit would wrongly throttle unrelated users — we skip it. The
 *     HMAC token (SHA-256, infeasible to forge/brute-force) is the real gate.
 */
export async function POST(request: NextRequest) {
  const url = new URL(request.url)
  const qpEmail = url.searchParams.get("email")
  const qpToken = url.searchParams.get("token")

  // One-click path: credentials in the query string.
  if (qpEmail && qpToken) {
    const parsed = credsSchema.safeParse({ email: qpEmail, token: qpToken })
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 })
    }
    const result = await doUnsubscribe(parsed.data.email, parsed.data.token)
    return result.ok
      ? NextResponse.json({ ok: true })
      : NextResponse.json({ error: result.error }, { status: result.status })
  }

  // Page-form path: rate-limited JSON body.
  const limited = await enforceRateLimit(request, {
    key: "newsletter:unsubscribe",
    limit: 10,
    windowSec: 60 * 60,
  })
  if (limited) return limited

  let parsed: z.infer<typeof credsSchema>
  try {
    const body = await request.json()
    parsed = credsSchema.parse(body)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0]?.message ?? "Invalid input" },
        { status: 400 }
      )
    }
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }

  const result = await doUnsubscribe(parsed.email, parsed.token)
  return result.ok
    ? NextResponse.json({ ok: true })
    : NextResponse.json({ error: result.error }, { status: result.status })
}

/**
 * Some mail clients render the `List-Unsubscribe` URL as a plain link and
 * follow it with a GET instead of doing the one-click POST. Handle that too,
 * responding with a small HTML confirmation rather than a JSON blob.
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const email = url.searchParams.get("email")
  const token = url.searchParams.get("token")

  const invalid = `<h1>Invalid link</h1><p>This unsubscribe link is missing or malformed. Use the unsubscribe link in any email we've sent you, or contact <a href="mailto:support@primehelixlabz.com">support@primehelixlabz.com</a>.</p>`

  if (!email || !token) return htmlResponse(invalid, 400)
  const parsed = credsSchema.safeParse({ email, token })
  if (!parsed.success) return htmlResponse(invalid, 400)

  const result = await doUnsubscribe(parsed.data.email, parsed.data.token)
  if (!result.ok) {
    if (result.status === 400) return htmlResponse(invalid, 400)
    return htmlResponse(
      `<h1>Something went wrong</h1><p>We couldn't process your unsubscribe right now. Please email <a href="mailto:support@primehelixlabz.com">support@primehelixlabz.com</a> and we'll handle it manually.</p>`,
      result.status
    )
  }

  return htmlResponse(
    `<h1>You're unsubscribed</h1><p>You won't receive any more newsletter emails from us. Changed your mind? You can re-subscribe anytime from <a href="https://www.primehelixlabz.com">primehelixlabz.com</a>.</p>`
  )
}
