import { NextResponse } from "next/server"
import { requireAdminMiddleware, type AuthenticatedRequest } from "@/lib/auth/middleware"
import { getProductById, getProductVariants, updateProduct, updateVariant } from "@/lib/db/supabase"
import { stripe } from "@/lib/stripe"

async function ensureStripePriceForVariant(args: {
  stripeProductId: string
  productId: string
  variant: { id: string; sku: string; price: number; stripePriceId?: string }
}) {
  const { stripeProductId, productId, variant } = args
  const desiredUnitAmount = Math.round(variant.price * 100)

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

      try {
        await stripe.prices.update(variant.stripePriceId, { active: false })
      } catch (e) {
        console.warn("Failed to deactivate old Stripe price", variant.stripePriceId, e)
      }

      await updateVariant(variant.id, { stripePriceId: next.id })
      return next.id
    } catch (e) {
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

export const POST = requireAdminMiddleware(async (req: AuthenticatedRequest, { params }: { params: Promise<{ id: string }> }) => {
  try {
    const { id } = await params

    const product = await getProductById(id)
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 })
    }

    const variants = await getProductVariants(id)
    if (!variants || variants.length === 0) {
      return NextResponse.json({ error: "Product has no variants to sync" }, { status: 400 })
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
      // Best-effort keep name/active status in sync
      await stripe.products.update(stripeProductId, {
        name: product.name,
        // We don't store description on Stripe; always keep it empty/cleared.
        description: "",
        active: !product.isArchived,
      })
    }

    const priceMappings: Array<{ variantId: string; stripePriceId: string }> = []

    for (const variant of variants) {
      const stripePriceId = await ensureStripePriceForVariant({
        stripeProductId,
        productId: product.id,
        variant: {
          id: variant.id,
          sku: variant.sku,
          price: variant.price,
          stripePriceId: variant.stripePriceId,
        },
      })

      priceMappings.push({ variantId: variant.id, stripePriceId })
    }

    return NextResponse.json({
      success: true,
      productId: product.id,
      stripeProductId,
      variants: priceMappings,
    })
  } catch (error) {
    console.error("Stripe sync product error:", error)
    return NextResponse.json({ error: "Failed to sync product with Stripe" }, { status: 500 })
  }
})

