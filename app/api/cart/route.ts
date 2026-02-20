import { NextRequest, NextResponse } from "next/server"
import { requireAuthMiddleware } from "@/lib/auth/middleware"
import {
  getCartItems,
  addCartItem,
  clearCart,
} from "@/lib/db/supabase"
import { getProductById, getVariantById } from "@/lib/db/supabase"
import { z } from "zod"

const addItemSchema = z.object({
  productId: z.string(),
  quantity: z.number().int().min(1).max(10),
  variantId: z.string().uuid().optional(),
})

export const GET = requireAuthMiddleware(async (req) => {
  try {
    const userId = req.user!.id
    const cartItems = await getCartItems(userId)

    // Enrich with product data
    const enrichedItems = await Promise.all(
      cartItems.map(async (item) => {
        const product = await getProductById(item.productId)
        return {
          ...item,
          product: product || null,
        }
      })
    )

    return NextResponse.json({ items: enrichedItems })
  } catch (error) {
    console.error("Get cart error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
})

export const POST = requireAuthMiddleware(async (req) => {
  try {
    const userId = req.user!.id
    const body = await req.json()
    const { productId, quantity, variantId } = addItemSchema.parse(body)

    // Verify product exists
    const product = await getProductById(productId)
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 })
    }

    // If variantId is provided, verify variant exists and check its stock
    if (variantId) {
      const variant = await getVariantById(variantId)
      if (!variant) {
        return NextResponse.json({ error: "Variant not found" }, { status: 404 })
      }
      if (variant.productId !== productId) {
        return NextResponse.json({ error: "Variant does not belong to this product" }, { status: 400 })
      }
      if (!variant.inStock) {
        return NextResponse.json({ error: "Variant out of stock" }, { status: 400 })
      }
    } else {
      // No variant selected, check product stock
      if (!product.inStock) {
        return NextResponse.json({ error: "Product out of stock" }, { status: 400 })
      }
    }

    const cartItem = await addCartItem(userId, productId, quantity, variantId)
    return NextResponse.json({ item: cartItem }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      )
    }

    console.error("Add to cart error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
})

export const DELETE = requireAuthMiddleware(async (req) => {
  try {
    const userId = req.user!.id
    await clearCart(userId)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Clear cart error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
})
