/**
 * HMAC-signed unsubscribe tokens.
 *
 * Tokens are scoped to a single email address — knowing the secret + an
 * email is enough to forge a valid token (which is the intended semantic).
 * The secret itself must NOT be derivable from public output.
 *
 * Token format: base64url(HMAC-SHA256(secret, email_lowercased))
 *
 * In dev, if NEWSLETTER_UNSUBSCRIBE_SECRET is unset, we derive a stable
 * fallback from a per-process random — links generated in dev won't survive
 * a restart, which is fine. In production the env validator (`lib/env.ts`)
 * requires the secret to be set.
 */

import { createHmac, randomBytes } from "crypto"
import { env } from "@/lib/env"

let devSecret: string | null = null
function resolveSecret(): string {
  if (env.NEWSLETTER_UNSUBSCRIBE_SECRET) {
    return env.NEWSLETTER_UNSUBSCRIBE_SECRET
  }
  if (!devSecret) {
    devSecret = randomBytes(32).toString("hex")
    console.warn(
      "[newsletter] NEWSLETTER_UNSUBSCRIBE_SECRET is not set — using a per-process random. Unsubscribe links won't survive a restart."
    )
  }
  return devSecret
}

function base64url(buf: Buffer): string {
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "")
}

function timingSafeEqualString(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let mismatch = 0
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return mismatch === 0
}

export function signUnsubscribeToken(email: string): string {
  const secret = resolveSecret()
  const normalized = email.trim().toLowerCase()
  const mac = createHmac("sha256", secret).update(normalized).digest()
  return base64url(mac)
}

export function verifyUnsubscribeToken(email: string, token: string): boolean {
  if (!email || !token) return false
  const expected = signUnsubscribeToken(email)
  return timingSafeEqualString(expected, token)
}

/**
 * Human-facing unsubscribe link — points at the /unsubscribe page, which
 * renders a confirm button. Use this for the visible "Unsubscribe" link in
 * email bodies.
 */
export function buildUnsubscribeUrl(email: string, origin: string): string {
  const token = signUnsubscribeToken(email)
  const params = new URLSearchParams({ email: email.trim().toLowerCase(), token })
  return `${origin}/unsubscribe?${params.toString()}`
}

/**
 * Machine-facing unsubscribe URL — points at the API route, which processes
 * the unsubscribe directly (GET or one-click POST). Use this for the RFC 8058
 * `List-Unsubscribe` header so Gmail/Outlook's native one-click button works.
 * The page URL must NOT be used there: a one-click POST to a page route 405s
 * and the subscriber is never removed.
 */
export function buildUnsubscribeApiUrl(email: string, origin: string): string {
  const token = signUnsubscribeToken(email)
  const params = new URLSearchParams({ email: email.trim().toLowerCase(), token })
  return `${origin}/api/newsletter/unsubscribe?${params.toString()}`
}
