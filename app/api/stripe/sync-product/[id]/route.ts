import { NextResponse } from "next/server"
import { requireAdminMiddleware, type AuthenticatedRequest } from "@/lib/auth/middleware"
import { getProductById, getProductVariants, updateProduct, updateVariant } from "@/lib/db/supabase"
import { stripe } from "@/lib/stripe"

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
      // Best-effort keep name/active status in sync
      await stripe.products.update(stripeProductId, {
        name: product.name,
        description: product.longDescription || undefined,
        active: !product.isArchived,
      })
    }

    const priceMappings: Array<{ variantId: string; stripePriceId: string }> = []

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

