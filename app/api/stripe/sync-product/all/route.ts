import { NextResponse } from "next/server"
import { requireAdminMiddleware, type AuthenticatedRequest } from "@/lib/auth/middleware"
import { getProducts, getProductById, getProductVariants, updateProduct, updateVariant } from "@/lib/db/supabase"
import { stripe } from "@/lib/stripe"

async function ensureStripePriceForVariant(args: {
  stripeProductId: string
  productId: string
  variant: { id: string; sku: string; price: number; stripePriceId?: string }
}) {
  const { stripeProductId, productId, variant } = args
  const desiredUnitAmount = Math.round(variant.price * 100)

  // Stripe Prices are immutable for amount/currency; if the amount changes, create a new price,
  // deactivate the old one, and update our DB mapping.
  if (variant.stripePriceId) {
    try {
      const existing = await stripe.prices.retrieve(variant.stripePriceId)
      const existingAmount = existing.unit_amount ?? null
      const existingCurrency = existing.currency

      const needsNew =
        existingAmount !== desiredUnitAmount || existingCurrency.toLowerCase() !== "usd"

      if (!needsNew) {
        return variant.stripePriceId
      }

      const next = await stripe.prices.create({
        currency: "usd",
        unit_amount: desiredUnitAmount,
        product: stripeProductId,
        nickname: variant.sku,
        metadata: {
          variantId: variant.id,
          productId,
          replacesPriceId: variant.stripePriceId,
        },
      })

      // Best-effort deactivate old price so it doesn't show up as selectable in Stripe UI.
      try {
        await stripe.prices.update(variant.stripePriceId, { active: false })
      } catch (e) {
        console.warn("Failed to deactivate old Stripe price", variant.stripePriceId, e)
      }

      await updateVariant(variant.id, { stripePriceId: next.id })
      return next.id
    } catch (e) {
      // If retrieval fails (deleted/invalid), fall through to creating a new price.
      console.warn("Failed to retrieve Stripe price, will recreate", variant.stripePriceId, e)
    }
  }

  const created = await stripe.prices.create({
    currency: "usd",
    unit_amount: desiredUnitAmount,
    product: stripeProductId,
    nickname: variant.sku,
    metadata: {
      variantId: variant.id,
      productId,
    },
  })

  await updateVariant(variant.id, { stripePriceId: created.id })
  return created.id
}

export const POST = requireAdminMiddleware(async (req: AuthenticatedRequest) => {
  try {
    // Fetch all products (including archived) so we can sync the full catalog.
    const products = await getProducts({ includeArchived: true, limit: 10000 })

    const results: Array<{
      productId: string
      stripeProductId?: string
      synced: boolean
      error?: string
    }> = []

    for (const p of products) {
      try {
        const product = await getProductById(p.id)
        if (!product) {
          results.push({ productId: p.id, synced: false, error: "Product not found on reload" })
          continue
        }

        const variants = await getProductVariants(p.id)
        if (!variants || variants.length === 0) {
          results.push({ productId: p.id, synced: false, error: "No variants to sync" })
          continue
        }

        // Ensure Stripe product exists
        let stripeProductId = product.stripeProductId
        if (!stripeProductId) {
          const stripeProduct = await stripe.products.create({
            name: product.name,
            // We don't store description on Stripe; always keep it empty/cleared.
            description: "",
            active: !product.isArchived,
            metadata: {
              productId: product.id,
              slug: product.slug,
            },
          })

          stripeProductId = stripeProduct.id
          await updateProduct(product.id, { stripeProductId })
        } else {
          await stripe.products.update(stripeProductId, {
            name: product.name,
            // We don't store description on Stripe; always keep it empty/cleared.
            description: "",
            active: !product.isArchived,
          })
        }

        // Ensure Stripe prices for all variants
        for (const variant of variants) {
          await ensureStripePriceForVariant({
            stripeProductId,
            productId: product.id,
            variant: {
              id: variant.id,
              sku: variant.sku,
              price: variant.price,
              stripePriceId: variant.stripePriceId,
            },
          })
        }

        results.push({ productId: product.id, stripeProductId, synced: true })
      } catch (err) {
        console.error("Stripe bulk sync error for product", p.id, err)
        results.push({
          productId: p.id,
          synced: false,
          error: err instanceof Error ? err.message : "Unknown sync error",
        })
      }
    }

    return NextResponse.json({ success: true, results })
  } catch (error) {
    console.error("Stripe bulk product sync error:", error)
    return NextResponse.json({ error: "Failed to bulk sync products with Stripe" }, { status: 500 })
  }
})

