import { NextRequest, NextResponse } from "next/server"
import { requireAdminMiddleware } from "@/lib/auth/middleware"
import { getProductVariants, createVariant, setDefaultVariant, syncProductThumbnailToDefaultVariant } from "@/lib/db/supabase"
import { revalidateShopPagesById } from "@/lib/revalidate-shop"
import { z } from "zod"

const variantSchema = z.object({
  sku: z.string().min(1, "SKU is required"),
  price: z.number().positive("Price must be a positive number"),
  stock: z.number().int("Stock must be an integer").min(0, "Stock cannot be negative"),
  isDefault: z.boolean().default(false),
  displayOrder: z.number().int().default(0),
})

export const GET = async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const { id } = await params
    const variants = await getProductVariants(id)
    return NextResponse.json({ variants })
  } catch (error) {
    console.error("Get variants error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export const POST = requireAdminMiddleware(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const { id } = await params
    const body = await req.json()
    const data = variantSchema.parse(body)

    const variant = await createVariant({
      productId: id,
      sku: data.sku,
      price: data.price,
      stock: data.stock,
      inStock: data.stock > 0,
      displayOrder: data.displayOrder,
      isDefault: data.isDefault,
    })

    if (data.isDefault) {
      await setDefaultVariant(id, variant.id, { syncThumbnail: true })
    } else {
      // If product has no thumbnail yet, attempt to derive it from default variant.
      await syncProductThumbnailToDefaultVariant(id, { force: false })
    }

    await revalidateShopPagesById(id)
    return NextResponse.json({ variant }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      )
    }

    console.error("Create variant error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
})
