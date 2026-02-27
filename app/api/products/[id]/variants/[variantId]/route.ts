import { NextRequest, NextResponse } from "next/server"
import { requireAdminMiddleware } from "@/lib/auth/middleware"
import { getVariantById, updateVariant, deleteVariant, getProductVariants, ensureDefaultVariant, setDefaultVariant, syncProductThumbnailToDefaultVariant } from "@/lib/db/supabase"
import { z } from "zod"

const updateVariantSchema = z.object({
  sku: z.string().min(1, "SKU is required").optional(),
  name: z.string().min(1, "Variant name is required").optional(),
  price: z.number().positive("Price must be a positive number").optional(),
  stock: z.number().int("Stock must be an integer").min(0, "Stock cannot be negative").optional(),
  color: z.string().nullable().optional(),
  size: z.string().nullable().optional(),
  isDefault: z.boolean().optional(),
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
    const { id: productId, variantId } = await params
    const body = await req.json()
    const data = updateVariantSchema.parse(body)

    const updates: any = {}
    if (data.sku !== undefined) updates.sku = data.sku
    if (data.name !== undefined) updates.name = data.name
    if (data.price !== undefined) updates.price = data.price
    if (data.stock !== undefined) {
      updates.stock = data.stock
      updates.inStock = data.stock > 0
    }
    if (data.color !== undefined) updates.color = data.color
    if (data.size !== undefined) updates.size = data.size
    if (data.isDefault !== undefined) updates.isDefault = data.isDefault
    if (data.displayOrder !== undefined) updates.displayOrder = data.displayOrder

    const variant = await updateVariant(variantId, updates)
    
    if (!variant) {
      return NextResponse.json({ error: "Variant not found" }, { status: 404 })
    }

    if (data.isDefault === true) {
      await setDefaultVariant(productId, variantId, { syncThumbnail: true })
    } else if (data.isDefault === false) {
      // Never leave a product without a default variant.
      await ensureDefaultVariant(productId)
      await syncProductThumbnailToDefaultVariant(productId, { force: false })
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
    
    const wasDefault = variants.some((v) => v.id === variantId && v.isDefault)
    const deleted = await deleteVariant(variantId)
    
    if (!deleted) {
      return NextResponse.json({ error: "Variant not found" }, { status: 404 })
    }

    if (wasDefault) {
      await ensureDefaultVariant(productId)
      await syncProductThumbnailToDefaultVariant(productId, { force: true })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Delete variant error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
})
