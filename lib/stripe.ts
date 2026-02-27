import Stripe from "stripe"

if (!process.env.STRIPE_SECRET_KEY) {
  // In development we log a warning; in production this should be configured.
  // We don't throw here to avoid breaking non-payment parts of the app.
  console.warn("STRIPE_SECRET_KEY is not set. Stripe payments will not work.")
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  // Use a known recent API version; keep in sync with Stripe docs when upgrading.
  apiVersion: "2026-02-25.clover",
})

