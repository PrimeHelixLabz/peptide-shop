/**
 * Validated, typed access to environment variables.
 *
 * Import as: `import { env } from "@/lib/env"` (server) or
 *           `import { publicEnv } from "@/lib/env"` (client-safe subset).
 *
 * Why this exists: a missing/typo'd env var should fail the process at boot
 * with a clear message naming the offending key, not silently break a payment
 * flow weeks later. Hot-path code in `lib/centryos/`, `lib/link-money/`,
 * `lib/stripe.ts`, etc. still reads `process.env.X` directly — that's
 * intentional during migration. Importing this module from the proxy
 * middleware ensures validation runs once per cold-start and exits early
 * if anything required is missing.
 */

import { z } from "zod"

const nonEmpty = z.string().trim().min(1)
const optionalNonEmpty = z
  .string()
  .trim()
  .min(1)
  .optional()
  .or(z.literal("").transform(() => undefined))

/* ────────────────────────────────────────────────────────────────
 *  Schemas
 *  Payment-provider blocks are optional at the env level — if you
 *  aren't using CentryOS, you don't need its keys. The schema's job
 *  is to catch typos and missing values for what you DO configure,
 *  not to force every store to wire every provider.
 * ────────────────────────────────────────────────────────────── */

const serverSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),

  // Supabase (always required — auth + DB)
  NEXT_PUBLIC_SUPABASE_URL: nonEmpty.url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: nonEmpty,
  SUPABASE_SECRET_KEY: nonEmpty,

  // Email (always required — order receipts depend on it)
  RESEND_API_KEY: nonEmpty,

  // Newsletter (soft-required; the route currently falls back to a hardcoded
  // salt with a warning. Make it required in production.)
  NEWSLETTER_IP_SALT: optionalNonEmpty,
  // HMAC key for one-click unsubscribe tokens. Generated lazily if missing
  // in dev; required in production so URLs survive a deploy.
  NEWSLETTER_UNSUBSCRIBE_SECRET: optionalNonEmpty,

  // Stripe (optional — but if you set one, you must set both)
  STRIPE_SECRET_KEY: optionalNonEmpty,
  STRIPE_WEBHOOK_SECRET: optionalNonEmpty,

  // CentryOS (optional — group of 4 required together if used)
  CENTRYOS_ENV: z.enum(["sandbox", "production"]).optional(),
  CENTRYOS_API_CLIENT_ID: optionalNonEmpty,
  CENTRYOS_API_CLIENT_SECRET: optionalNonEmpty,
  CENTRYOS_WEBHOOK_SECRET: optionalNonEmpty,
  CENTRYOS_ACCOUNT_URL: optionalNonEmpty,
  CENTRYOS_LIQUIDITY_URL: optionalNonEmpty,
  APP_PUBLIC_URL: optionalNonEmpty,

  // Link Money (optional — group of 4 required together if used)
  LINK_MONEY_CLIENT_ID: optionalNonEmpty,
  LINK_MONEY_CLIENT_SECRET: optionalNonEmpty,
  LINK_MONEY_ENV: z.enum(["sandbox", "production"]).optional(),
  LINK_MONEY_REDIRECT_URL: optionalNonEmpty,
  LINK_MONEY_WEBHOOK_SECRET: optionalNonEmpty,

  // Observability (optional)
  SENTRY_DSN: optionalNonEmpty,
})

const clientSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: nonEmpty.url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: nonEmpty,
  NEXT_PUBLIC_SITE_URL: optionalNonEmpty,
  NEXT_PUBLIC_API_URL: optionalNonEmpty,
  NEXT_PUBLIC_SENTRY_DSN: optionalNonEmpty,
  // Trustpilot — both optional. When unset, widgets render nothing (no
  // broken badges in dev). The business unit id is found in your
  // Trustpilot business dashboard under Integrations → TrustBox.
  NEXT_PUBLIC_TRUSTPILOT_BUSINESS_UNIT_ID: optionalNonEmpty,
  NEXT_PUBLIC_TRUSTPILOT_DOMAIN: optionalNonEmpty,
})

/* ────────────────────────────────────────────────────────────────
 *  Cross-field constraints
 *  Catches the "I set the secret but forgot the webhook" class of
 *  half-configured provider bugs.
 * ────────────────────────────────────────────────────────────── */

function assertGrouped(
  name: string,
  values: Record<string, string | undefined>,
  errors: string[]
) {
  const entries = Object.entries(values)
  const set = entries.filter(([, v]) => Boolean(v)).map(([k]) => k)
  if (set.length === 0) return // entire group unused — fine
  const missing = entries.filter(([, v]) => !v).map(([k]) => k)
  if (missing.length === 0) return // fully configured — fine
  errors.push(
    `${name} is partially configured. Set all of: [${entries
      .map(([k]) => k)
      .join(", ")}]. Missing: [${missing.join(", ")}].`
  )
}

/* ────────────────────────────────────────────────────────────────
 *  Validation
 * ────────────────────────────────────────────────────────────── */

let cachedServer: z.infer<typeof serverSchema> | null = null
let cachedClient: z.infer<typeof clientSchema> | null = null

function validateServer(): z.infer<typeof serverSchema> {
  if (cachedServer) return cachedServer

  const parsed = serverSchema.safeParse(process.env)
  if (!parsed.success) {
    const issues = parsed.error.errors
      .map((e) => `  - ${e.path.join(".")}: ${e.message}`)
      .join("\n")
    throw new Error(`Invalid environment variables:\n${issues}`)
  }
  const e = parsed.data

  const crossErrors: string[] = []
  assertGrouped(
    "Stripe",
    { STRIPE_SECRET_KEY: e.STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET: e.STRIPE_WEBHOOK_SECRET },
    crossErrors
  )
  assertGrouped(
    "CentryOS",
    {
      CENTRYOS_ENV: e.CENTRYOS_ENV,
      CENTRYOS_API_CLIENT_ID: e.CENTRYOS_API_CLIENT_ID,
      CENTRYOS_API_CLIENT_SECRET: e.CENTRYOS_API_CLIENT_SECRET,
      CENTRYOS_WEBHOOK_SECRET: e.CENTRYOS_WEBHOOK_SECRET,
    },
    crossErrors
  )
  assertGrouped(
    "Link Money",
    {
      LINK_MONEY_CLIENT_ID: e.LINK_MONEY_CLIENT_ID,
      LINK_MONEY_CLIENT_SECRET: e.LINK_MONEY_CLIENT_SECRET,
      LINK_MONEY_ENV: e.LINK_MONEY_ENV,
      LINK_MONEY_REDIRECT_URL: e.LINK_MONEY_REDIRECT_URL,
      LINK_MONEY_WEBHOOK_SECRET: e.LINK_MONEY_WEBHOOK_SECRET,
    },
    crossErrors
  )

  // Production-only stricter checks
  if (e.NODE_ENV === "production") {
    if (!e.NEWSLETTER_IP_SALT) {
      crossErrors.push(
        "NEWSLETTER_IP_SALT must be set in production (used to hash subscriber IPs)."
      )
    }
    if (!e.NEWSLETTER_UNSUBSCRIBE_SECRET) {
      crossErrors.push(
        "NEWSLETTER_UNSUBSCRIBE_SECRET must be set in production (used to sign one-click unsubscribe links)."
      )
    }
  }

  if (crossErrors.length > 0) {
    throw new Error(
      `Environment configuration errors:\n${crossErrors
        .map((m) => `  - ${m}`)
        .join("\n")}`
    )
  }

  cachedServer = e
  return e
}

function validateClient(): z.infer<typeof clientSchema> {
  if (cachedClient) return cachedClient
  // Each NEXT_PUBLIC_* must be referenced literally so Next.js's webpack
  // plugin inlines the value into the client bundle. Passing `process.env`
  // as a whole object on the client yields {} — the static replacement
  // only triggers on explicit property reads.
  const parsed = clientSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
    NEXT_PUBLIC_TRUSTPILOT_BUSINESS_UNIT_ID:
      process.env.NEXT_PUBLIC_TRUSTPILOT_BUSINESS_UNIT_ID,
    NEXT_PUBLIC_TRUSTPILOT_DOMAIN: process.env.NEXT_PUBLIC_TRUSTPILOT_DOMAIN,
  })
  if (!parsed.success) {
    const issues = parsed.error.errors
      .map((e) => `  - ${e.path.join(".")}: ${e.message}`)
      .join("\n")
    throw new Error(`Invalid public environment variables:\n${issues}`)
  }
  cachedClient = parsed.data
  return parsed.data
}

/**
 * Server-side env. Throws on first import if any required value is missing
 * or grouped providers are half-configured.
 */
export const env: z.infer<typeof serverSchema> = (() => {
  // Don't validate at import time during browser bundling — only on the server.
  if (typeof window !== "undefined") {
    return {} as z.infer<typeof serverSchema>
  }
  return validateServer()
})()

/**
 * Public env subset safe for client bundles.
 */
export const publicEnv: z.infer<typeof clientSchema> = (() => {
  // Available in both server + client; client only sees NEXT_PUBLIC_* values.
  return validateClient()
})()

export type ServerEnv = z.infer<typeof serverSchema>
export type ClientEnv = z.infer<typeof clientSchema>
