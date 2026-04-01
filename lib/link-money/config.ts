/**
 * Link Money Configuration
 *
 * Server-side only. Never import this in client components.
 */

export function getLinkMoneyConfig() {
  const clientId = process.env.LINK_MONEY_CLIENT_ID
  const clientSecret = process.env.LINK_MONEY_CLIENT_SECRET
  const env = process.env.LINK_MONEY_ENV || "sandbox"
  const redirectUrl = process.env.LINK_MONEY_REDIRECT_URL

  if (!clientId || !clientSecret) {
    throw new Error(
      "Link Money credentials not configured. Set LINK_MONEY_CLIENT_ID and LINK_MONEY_CLIENT_SECRET."
    )
  }

  if (!redirectUrl) {
    throw new Error(
      "LINK_MONEY_REDIRECT_URL is not configured."
    )
  }

  const baseUrl =
    env === "production"
      ? "https://api.link.money"
      : "https://api.link-sandbox.money"

  const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64")

  return { clientId, clientSecret, env, redirectUrl, baseUrl, basicAuth }
}
