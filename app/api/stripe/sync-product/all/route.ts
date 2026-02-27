import { NextResponse } from "next/server"
import { requireAdminMiddleware, type AuthenticatedRequest } from "@/lib/auth/middleware"
import { getProducts, getProductById, getProductVariants, updateProduct, updateVariant } from "@/lib/db/supabase"
import { stripe } from "@/lib/stripe"

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
            description: product.longDescription || undefined,
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
            description: product.longDescription || undefined,
            active: !product.isArchived,
          })
        }

        // Ensure Stripe prices for all variants
        for (const variant of variants) {
          const unitAmount = Math.round(variant.price * 100)
          let stripePriceId = variant.stripePriceId

          if (!stripePriceId) {
            const price = await stripe.prices.create({
              currency: "usd",
              unit_amount: unitAmount,
              product: stripeProductId,
              nickname: variant.sku,
              metadata: {
                variantId: variant.id,
                productId: product.id,
              },
            })
            stripePriceId = price.id
            await updateVariant(variant.id, { stripePriceId })
          }
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

