import { NextRequest, NextResponse } from "next/server"
import { requireAuthMiddleware } from "@/lib/auth/middleware"
import { removeWishlistItem } from "@/lib/db/supabase"

export const DELETE = requireAuthMiddleware(async (
  req: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) => {
  try {
    const userId = req.user!.id
    const { productId } = await params

    const deleted = await removeWishlistItem(userId, productId)
    if (!deleted) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Remove wishlist item error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
})
