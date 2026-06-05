/**
 * CentryOS Configuration
 *
 * Server-side only. Never import from a client component — the client
 * id/secret would be exposed in the browser bundle.
 */

// CentryOS (formerly WalletOS) rebranded and moved hosts. These are the
// current centryos.xyz endpoints per https://docs.centryos.xyz — the old
// *.walletos.xyz hosts still route but 500 on the payment-link endpoint.
// The non-prod ("sandbox") environment is served by CentryOS's *-staging-api
// hosts; we use the env name "sandbox" to match the CENTRYOS_ENV enum in
// lib/env.ts.
const SANDBOX_ACCOUNT_URL = "https://account-staging-api.centryos.xyz"
const PROD_ACCOUNT_URL = "https://user-accounts-api.centryos.xyz"
const SANDBOX_LIQUIDITY_URL = "https://liquidity-staging-api.centryos.xyz"
const PROD_LIQUIDITY_URL = "https://ledger-api.centryos.xyz"

export interface CentryOSConfig {
  env: "sandbox" | "production"
  accountUrl: string
  liquidityUrl: string
  apiClientId: string
  apiClientSecret: string
  webhookSecret: string
  appPublicUrl: string
  basicAuth: string
}

const VALID_ENVS = ["sandbox", "production"] as const

export function getCentryOSConfig(): CentryOSConfig {
  // Default to sandbox when unset, but reject any other value rather than
  // silently falling back. A typo previously resolved to the sandbox URLs
  // regardless of value, so production credentials sent against the sandbox
  // host produced a confusing 400 Unauthorized at token-mint time.
  const rawEnv = process.env.CENTRYOS_ENV ?? "sandbox"
  if (!VALID_ENVS.includes(rawEnv as (typeof VALID_ENVS)[number])) {
    throw new Error(
      `Invalid CENTRYOS_ENV "${rawEnv}". Must be one of: ${VALID_ENVS.join(
        ", "
      )}.`
    )
  }
  const env = rawEnv as "sandbox" | "production"

  const apiClientId = process.env.CENTRYOS_API_CLIENT_ID
  const apiClientSecret = process.env.CENTRYOS_API_CLIENT_SECRET
  const webhookSecret = process.env.CENTRYOS_WEBHOOK_SECRET
  const appPublicUrl = process.env.APP_PUBLIC_URL

  if (!apiClientId || !apiClientSecret) {
    throw new Error(
      "CentryOS credentials not configured. Set CENTRYOS_API_CLIENT_ID and CENTRYOS_API_CLIENT_SECRET."
    )
  }
  if (!webhookSecret) {
    throw new Error("CENTRYOS_WEBHOOK_SECRET is not configured.")
  }
  if (!appPublicUrl) {
    throw new Error("APP_PUBLIC_URL is not configured.")
  }

  // Allow per-env overrides but fall back to the documented defaults
  // so misconfiguration cannot silently send staging traffic to prod.
  const accountUrl =
    process.env.CENTRYOS_ACCOUNT_URL ||
    (env === "production" ? PROD_ACCOUNT_URL : SANDBOX_ACCOUNT_URL)
  const liquidityUrl =
    process.env.CENTRYOS_LIQUIDITY_URL ||
    (env === "production" ? PROD_LIQUIDITY_URL : SANDBOX_LIQUIDITY_URL)

  const basicAuth = Buffer.from(`${apiClientId}:${apiClientSecret}`).toString(
    "base64"
  )

  return {
    env,
    accountUrl,
    liquidityUrl,
    apiClientId,
    apiClientSecret,
    webhookSecret,
    appPublicUrl,
    basicAuth,
  }
}
