/**
 * CentryOS Configuration
 *
 * Server-side only. Never import from a client component — the client
 * id/secret would be exposed in the browser bundle.
 */

// CentryOS (formerly WalletOS) rebranded and moved hosts. These are the
// current centryos.xyz endpoints per https://docs.centryos.xyz — the old
// *.walletos.xyz hosts still route but 500 on the payment-link endpoint.
const STAGING_ACCOUNT_URL = "https://account-staging-api.centryos.xyz"
const PROD_ACCOUNT_URL = "https://user-accounts-api.centryos.xyz"
const STAGING_LIQUIDITY_URL = "https://liquidity-staging-api.centryos.xyz"
const PROD_LIQUIDITY_URL = "https://ledger-api.centryos.xyz"

export interface CentryOSConfig {
  env: "staging" | "production"
  accountUrl: string
  liquidityUrl: string
  apiClientId: string
  apiClientSecret: string
  webhookSecret: string
  appPublicUrl: string
  basicAuth: string
}

export function getCentryOSConfig(): CentryOSConfig {
  const env = (process.env.CENTRYOS_ENV ?? "staging") as
    | "staging"
    | "production"

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
    (env === "production" ? PROD_ACCOUNT_URL : STAGING_ACCOUNT_URL)
  const liquidityUrl =
    process.env.CENTRYOS_LIQUIDITY_URL ||
    (env === "production" ? PROD_LIQUIDITY_URL : STAGING_LIQUIDITY_URL)

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
