/**
 * Rate limiting with a pluggable adapter.
 *
 * The default in-memory adapter is per-process and DOES NOT survive across
 * serverless function instances. It is fine for:
 *   - local dev
 *   - single-instance Node servers
 *   - "good enough" defense-in-depth on serverless (each cold-started
 *     instance has its own limiter, so an attacker would still hit some
 *     limit eventually as Vercel reuses instances)
 *
 * For correctness under serverless load, swap in the Upstash adapter:
 *   pnpm add @upstash/ratelimit @upstash/redis
 * then set UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN and replace
 * `inMemoryAdapter` with the Upstash-backed implementation.
 *
 * Usage:
 *   const limit = await rateLimit(req, { key: "newsletter", limit: 5, windowSec: 60 })
 *   if (!limit.ok) return new Response(..., { status: 429, headers: limit.headers })
 */

import type { NextRequest } from "next/server"

export interface RateLimitOptions {
  /** Logical bucket name; combined with the client identifier. */
  key: string
  /** Maximum requests allowed within `windowSec`. */
  limit: number
  /** Window length in seconds. */
  windowSec: number
}

export interface RateLimitResult {
  ok: boolean
  /** Remaining requests in this window after the current one. */
  remaining: number
  /** Unix timestamp (ms) when the current window resets. */
  resetAt: number
  /** Standard RateLimit-* headers to attach to the response. */
  headers: Record<string, string>
}

interface Adapter {
  hit: (key: string, windowSec: number, limit: number) => Promise<{ count: number; resetAt: number }>
}

/* ────────────────────────────────────────────────────────────────
 *  Default in-memory adapter
 * ────────────────────────────────────────────────────────────── */

interface Bucket {
  count: number
  resetAt: number
}

const buckets = new Map<string, Bucket>()
// Best-effort cleanup so the Map doesn't grow without bound under attack.
const CLEANUP_INTERVAL_MS = 60_000
let lastCleanup = Date.now()

function maybeCleanup(now: number) {
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return
  lastCleanup = now
  for (const [k, v] of buckets) {
    if (v.resetAt <= now) buckets.delete(k)
  }
}

const inMemoryAdapter: Adapter = {
  async hit(key, windowSec, _limit) {
    const now = Date.now()
    maybeCleanup(now)
    const existing = buckets.get(key)
    if (!existing || existing.resetAt <= now) {
      const fresh = { count: 1, resetAt: now + windowSec * 1000 }
      buckets.set(key, fresh)
      return fresh
    }
    existing.count += 1
    return existing
  },
}

let activeAdapter: Adapter = inMemoryAdapter

/** Swap the adapter at boot (e.g. inject an Upstash-backed implementation). */
export function setRateLimitAdapter(adapter: Adapter) {
  activeAdapter = adapter
}

/* ────────────────────────────────────────────────────────────────
 *  Client identifier
 *  Prefer the authenticated user id (set by upstream auth middleware)
 *  so a logged-in attacker can't trivially bypass via IP rotation.
 * ────────────────────────────────────────────────────────────── */

function clientIdentifier(req: NextRequest): string {
  const userId =
    req.headers.get("x-rate-limit-user") || // explicit override from upstream auth
    ""
  if (userId) return `u:${userId}`

  // Vercel / typical proxy chain
  const forwarded = req.headers.get("x-forwarded-for")
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim()
    if (first) return `ip:${first}`
  }
  const real = req.headers.get("x-real-ip")
  if (real) return `ip:${real}`

  // Last resort — same bucket for every request (degraded but safe).
  return "ip:unknown"
}

/* ────────────────────────────────────────────────────────────────
 *  Public API
 * ────────────────────────────────────────────────────────────── */

export async function rateLimit(
  req: NextRequest,
  options: RateLimitOptions
): Promise<RateLimitResult> {
  const id = clientIdentifier(req)
  const bucketKey = `${options.key}:${id}`
  const { count, resetAt } = await activeAdapter.hit(
    bucketKey,
    options.windowSec,
    options.limit
  )
  const remaining = Math.max(0, options.limit - count)
  const ok = count <= options.limit
  const resetSeconds = Math.ceil((resetAt - Date.now()) / 1000)
  const headers: Record<string, string> = {
    "RateLimit-Limit": String(options.limit),
    "RateLimit-Remaining": String(remaining),
    "RateLimit-Reset": String(Math.max(1, resetSeconds)),
  }
  if (!ok) {
    headers["Retry-After"] = String(Math.max(1, resetSeconds))
  }
  return { ok, remaining, resetAt, headers }
}

/**
 * Convenience helper: returns a 429 Response if the bucket is exceeded,
 * otherwise returns null (caller continues).
 */
export async function enforceRateLimit(
  req: NextRequest,
  options: RateLimitOptions
): Promise<Response | null> {
  const result = await rateLimit(req, options)
  if (result.ok) return null
  return new Response(
    JSON.stringify({
      error: "Too many requests. Please try again shortly.",
    }),
    {
      status: 429,
      headers: {
        ...result.headers,
        "Content-Type": "application/json",
      },
    }
  )
}
