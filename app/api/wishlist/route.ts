import { NextRequest, NextResponse } from "next/server"
import { requireAuthMiddleware } from "@/lib/auth/middleware"
import { getWishlistItems, addWishlistItem } from "@/lib/db/supabase"
import { getProductById } from "@/lib/db/supabase"
import { z } from "zod"

const addItemSchema = z.object({
  productId: z.string(),
})

export const GET = requireAuthMiddleware(async (req) => {
  try {
    const userId = req.user!.id
    const wishlistItems = await getWishlistItems(userId)

    // Enrich with product data
    const enrichedItems = await Promise.all(
      wishlistItems.map(async (item) => {
        const product = await getProductById(item.productId)
        return {
          ...item,
          product: product || null,
        }
      })
    )

    return NextResponse.json({ items: enrichedItems })
  } catch (error) {
    console.error("Get wishlist error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
})

export const POST = requireAuthMiddleware(async (req) => {
  try {
    const userId = req.user!.id
    const body = await req.json()
    const { productId } = addItemSchema.parse(body)

    // Verify product exists
    const product = await getProductById(productId)
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 })
    }

    const wishlistItem = await addWishlistItem(userId, productId)
    return NextResponse.json({ item: wishlistItem }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      )
    }

    console.error("Add to wishlist error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
})
