import { NextRequest, NextResponse } from "next/server"
import { getProductById, updateProduct, deleteProduct, archiveProduct } from "@/lib/db/supabase"
import { requireAdminMiddleware } from "@/lib/auth/middleware"
import { z } from "zod"

const updateProductSchema = z.object({
  name: z.string().min(1).optional(),
  price: z.number().positive().optional(),
  longDescription: z.string().optional(),
  thumbnailUrl: z.string().url().nullable().optional(),
  category: z.string().optional(),
  categoryId: z.string().uuid().optional(),
  inStock: z.boolean().optional(),
  isActive: z.boolean().optional(),
  stockQuantity: z.number().int().min(0).optional(),
  specifications: z.record(z.union([z.string(), z.number()])).optional(),
  usage: z.string().optional(),
  shipping: z.string().optional(),
})

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const product = await getProductById(id)

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 })
    }

    return NextResponse.json({ product })
  } catch (error) {
    console.error("Get product error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export const PUT = requireAdminMiddleware(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const { id } = await params
    const body = await req.json()
    const data = updateProductSchema.parse(body)

    const product = await updateProduct(id, data)

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 })
    }

    return NextResponse.json({ product })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      )
    }

    console.error("Update product error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
})

export const DELETE = requireAdminMiddleware(
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    try {
      const { id } = await params
      const url = new URL(req.url)
      const mode = url.searchParams.get("mode") ?? "archive"

      if (mode === "delete") {
        const deleted = await deleteProduct(id)

        if (!deleted) {
          return NextResponse.json({ error: "Product not found" }, { status: 404 })
        }

        return NextResponse.json({
          success: true,
          message: "Product deleted permanently",
        })
      }

      const archived = await archiveProduct(id)

      if (!archived) {
        return NextResponse.json({ error: "Product not found" }, { status: 404 })
      }

      return NextResponse.json({ success: true, message: "Product archived successfully" })
    } catch (error) {
      console.error("Archive/delete product error:", error)
      return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
  }
)
