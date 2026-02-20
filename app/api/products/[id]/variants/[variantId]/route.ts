import { NextRequest, NextResponse } from "next/server"
import { requireAdminMiddleware } from "@/lib/auth/middleware"
import { getVariantById, updateVariant, deleteVariant, getProductVariants } from "@/lib/db/supabase"
import { z } from "zod"

const updateVariantSchema = z.object({
  name: z.string().min(1, "Variant name is required").optional(),
  price: z.number().positive("Price must be a positive number").optional(),
  stockQuantity: z.number().int("Stock quantity must be an integer").min(0, "Stock quantity cannot be negative").optional(),
  image: z.string().url().optional().or(z.literal("")),
  images: z.array(z.string().url()).optional(),
  displayOrder: z.number().int().optional(),
})

export const GET = async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string; variantId: string }> }
) => {
  try {
    const { variantId } = await params
    const variant = await getVariantById(variantId)
    
    if (!variant) {
      return NextResponse.json({ error: "Variant not found" }, { status: 404 })
    }

    return NextResponse.json({ variant })
  } catch (error) {
    console.error("Get variant error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export const PUT = requireAdminMiddleware(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string; variantId: string }> }
) => {
  try {
    const { variantId } = await params
    const body = await req.json()
    const data = updateVariantSchema.parse(body)

    const updates: any = {}
    if (data.name !== undefined) updates.name = data.name
    if (data.price !== undefined) updates.price = data.price
    if (data.stockQuantity !== undefined) {
      updates.stockQuantity = data.stockQuantity
      updates.inStock = data.stockQuantity > 0
    }
    if (data.image !== undefined) updates.image = data.image || undefined
    if (data.images !== undefined) updates.images = data.images
    if (data.displayOrder !== undefined) updates.displayOrder = data.displayOrder

    const variant = await updateVariant(variantId, updates)
    
    if (!variant) {
      return NextResponse.json({ error: "Variant not found" }, { status: 404 })
    }

    return NextResponse.json({ variant })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      )
    }

    console.error("Update variant error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
})

export const DELETE = requireAdminMiddleware(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string; variantId: string }> }
) => {
  try {
    const { id: productId, variantId } = await params
    
    // Check how many variants this product has
    const variants = await getProductVariants(productId)
    
    if (variants.length <= 1) {
      return NextResponse.json(
        { error: "Cannot delete the last variant. A product must have at least one variant." },
        { status: 400 }
      )
    }
    
    const deleted = await deleteVariant(variantId)
    
    if (!deleted) {
      return NextResponse.json({ error: "Variant not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Delete variant error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
})
