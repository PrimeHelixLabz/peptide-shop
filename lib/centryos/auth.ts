import { getCentryOSConfig } from "./config"

/**
 * In-memory access-token cache. Lambdas/serverless instances may not
 * share this, but each instance still avoids hammering CentryOS for
 * a fresh token on every API call within its lifetime.
 *
 * The cache stores the absolute epoch-ms expiry (with a safety
 * skew applied) so freshness checks are O(1).
 */
interface CachedToken {
  accessToken: string
  expiresAtMs: number
}

let cached: CachedToken | null = null

const SAFETY_SKEW_MS = 60_000 // refresh 60s before the API-reported expiry
const DEFAULT_TTL_MS = 10 * 60 * 1000 // fall back to 10 minutes if no TTL is returned

// CentryOS / WalletOS has shipped multiple response shapes for this
// endpoint. We accept any of these key names at root or under `data`.
const TOKEN_KEYS = [
  "accessToken",
  "access_token",
  "token",
  "jwt",
  "authToken",
  "auth_token",
] as const
const EXPIRY_DATE_KEYS = [
  "expiresAt",
  "expires_at",
  "expiredAt",
  "expired_at",
  "expiry",
] as const
const EXPIRY_TTL_KEYS = ["expiresIn", "expires_in", "ttl"] as const

function pickFirstString(
  obj: Record<string, unknown>,
  keys: readonly string[]
): string | undefined {
  for (const key of keys) {
    const v = obj[key]
    if (typeof v === "string" && v.length > 0) return v
  }
  return undefined
}

function pickFirstNumber(
  obj: Record<string, unknown>,
  keys: readonly string[]
): number | undefined {
  for (const key of keys) {
    const v = obj[key]
    if (typeof v === "number" && Number.isFinite(v)) return v
    if (typeof v === "string" && v && Number.isFinite(Number(v))) return Number(v)
  }
  return undefined
}

interface ExtractedToken {
  accessToken: string
  expiresAtMs: number
}

function extractToken(json: unknown): ExtractedToken | null {
  if (!json || typeof json !== "object") return null
  const top = json as Record<string, unknown>

  // Try root, then `.data`, then any other single-level wrapper that
  // looks like a container (e.g. `result`, `payload`).
  const candidates: Record<string, unknown>[] = [top]
  for (const wrapperKey of ["data", "result", "payload"]) {
    const wrapper = top[wrapperKey]
    if (wrapper && typeof wrapper === "object" && !Array.isArray(wrapper)) {
      candidates.push(wrapper as Record<string, unknown>)
    }
  }

  for (const candidate of candidates) {
    const token = pickFirstString(candidate, TOKEN_KEYS)
    if (!token) continue

    const dateStr = pickFirstString(candidate, EXPIRY_DATE_KEYS)
    const ttl = pickFirstNumber(candidate, EXPIRY_TTL_KEYS)

    let expiresAtMs = Date.now() + DEFAULT_TTL_MS
    if (dateStr) {
      const parsed = Date.parse(dateStr)
      if (Number.isFinite(parsed)) expiresAtMs = parsed
    } else if (typeof ttl === "number") {
      // Heuristic: very large numbers are probably ms-epoch; small
      // numbers are seconds-of-TTL.
      expiresAtMs =
        ttl > 1_000_000_000_000 ? ttl : Date.now() + ttl * 1000
    }

    return { accessToken: token, expiresAtMs }
  }

  return null
}

/** Visible-but-redacted summary of the response, used in error messages
 *  so we can diagnose without leaking the token itself if one is present. */
function describeShape(json: unknown): string {
  if (!json || typeof json !== "object") return typeof json
  const top = json as Record<string, unknown>
  const keys = Object.keys(top)
  const parts = [`keys=[${keys.join(",")}]`]
  for (const k of keys) {
    const v = top[k]
    if (v && typeof v === "object" && !Array.isArray(v)) {
      parts.push(`${k}.keys=[${Object.keys(v as object).join(",")}]`)
    }
  }
  return parts.join(" ")
}

/**
 * Returns a valid bearer token. Uses a cached token if it is still
 * fresh; otherwise calls CentryOS to mint a new one.
 *
 * Throws on any non-2xx response so callers can surface a clear error
 * to the user rather than continuing with an invalid token.
 */
export async function getAccessToken(force = false): Promise<string> {
  const now = Date.now()
  if (!force && cached && cached.expiresAtMs - SAFETY_SKEW_MS > now) {
    return cached.accessToken
  }

  const config = getCentryOSConfig()
  const res = await fetch(`${config.accountUrl}/v1/ext/jwt/generate-token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${config.basicAuth}`,
      Accept: "application/json",
    },
  })

  if (!res.ok) {
    const text = await res.text().catch(() => "")
    throw new Error(
      `CentryOS getAccessToken failed: ${res.status} ${text || res.statusText}`
    )
  }

  const json = await res.json().catch(() => null)
  const extracted = extractToken(json)

  if (!extracted) {
    // Log shape (no values) so we can update TOKEN_KEYS if CentryOS
    // ships a new field name. Never log the body verbatim — even though
    // we failed to extract, an unexpected key may carry the secret.
    console.error("CentryOS getAccessToken: unrecognized response shape", {
      shape: describeShape(json),
    })
    throw new Error(
      `CentryOS getAccessToken: response missing token field (shape: ${describeShape(
        json
      )})`
    )
  }

  cached = extracted
  return cached.accessToken
}

/** Test/admin utility: clear the cached token. */
export function clearAccessTokenCache(): void {
  cached = null
}
