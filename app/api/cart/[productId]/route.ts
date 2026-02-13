import { NextRequest, NextResponse } from "next/server"
import { requireAuthMiddleware } from "@/lib/auth/middleware"
import { updateCartItem, removeCartItem } from "@/lib/db/supabase"
import { z } from "zod"

const updateSchema = z.object({
  quantity: z.number().int().min(0).max(10),
})

export const PUT = requireAuthMiddleware(async (
  req: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) => {
  try {
    const userId = req.user!.id
    const { productId } = await params
    const body = await req.json()
    const { quantity } = updateSchema.parse(body)

    if (quantity === 0) {
      await removeCartItem(userId, productId)
      return NextResponse.json({ success: true })
    }

    const item = await updateCartItem(userId, productId, quantity)
    if (!item) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 })
    }

    return NextResponse.json({ item })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      )
    }

    console.error("Update cart item error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
})

export const DELETE = requireAuthMiddleware(async (
  req: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) => {
  try {
    const userId = req.user!.id
    const { productId } = await params

    const deleted = await removeCartItem(userId, productId)
    if (!deleted) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Remove cart item error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
})
