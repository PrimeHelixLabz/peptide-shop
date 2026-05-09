import { getCentryOSConfig } from "./config"
import type { CentryOSTokenResponse } from "./types"

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

function parseExpiry(token: CentryOSTokenResponse): number {
  if (typeof token.expiresAt === "string") {
    const ms = Date.parse(token.expiresAt)
    if (Number.isFinite(ms)) return ms
  }
  if (typeof token.expiresIn === "number" && Number.isFinite(token.expiresIn)) {
    return Date.now() + token.expiresIn * 1000
  }
  return Date.now() + DEFAULT_TTL_MS
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

  // The Account API has historically wrapped its response in `data`
  // for some endpoints. Accept either shape.
  const json = (await res.json()) as
    | CentryOSTokenResponse
    | { data: CentryOSTokenResponse }
  const tokenBody: CentryOSTokenResponse =
    "accessToken" in json ? json : (json as { data: CentryOSTokenResponse }).data

  if (!tokenBody?.accessToken) {
    throw new Error("CentryOS getAccessToken: response missing accessToken")
  }

  cached = {
    accessToken: tokenBody.accessToken,
    expiresAtMs: parseExpiry(tokenBody),
  }
  return cached.accessToken
}

/** Test/admin utility: clear the cached token. */
export function clearAccessTokenCache(): void {
  cached = null
}
