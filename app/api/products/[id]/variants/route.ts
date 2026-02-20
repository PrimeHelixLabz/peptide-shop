import { NextRequest, NextResponse } from "next/server"
import { requireAdminMiddleware } from "@/lib/auth/middleware"
import { getProductVariants, createVariant } from "@/lib/db/supabase"
import { z } from "zod"

const variantSchema = z.object({
  name: z.string().min(1, "Variant name is required"),
  price: z.number().positive("Price must be a positive number"),
  stockQuantity: z.number().int("Stock quantity must be an integer").min(0, "Stock quantity cannot be negative"),
  image: z.string().url().optional().or(z.literal("")),
  images: z.array(z.string().url()).optional(),
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
      name: data.name,
      price: data.price,
      stockQuantity: data.stockQuantity,
      inStock: data.stockQuantity > 0,
      image: data.image || undefined,
      images: data.images,
      displayOrder: data.displayOrder,
    })

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
