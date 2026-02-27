import { NextRequest, NextResponse } from "next/server"
import { requireAdminMiddleware } from "@/lib/auth/middleware"
import { getVariantImages, replaceVariantImages } from "@/lib/db/variant-images"
import { z } from "zod"

const replaceImagesSchema = z.object({
  images: z.array(
    z.object({
      imageUrl: z.string().min(1, "Image URL is required"),
      isPrimary: z.boolean().optional(),
      sortOrder: z.number().int().optional(),
    })
  ),
})

export const GET = requireAdminMiddleware(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string; variantId: string }> }
) => {
  try {
    const { variantId } = await params
    const images = await getVariantImages(variantId)
    return NextResponse.json({ images })
  } catch (error) {
    console.error("Admin get variant images error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
})

export const PUT = requireAdminMiddleware(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string; variantId: string }> }
) => {
  try {
    const { variantId } = await params
    const body = await req.json()
    const { images } = replaceImagesSchema.parse(body)

    const updated = await replaceVariantImages(variantId, images)
    return NextResponse.json({ images: updated })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      )
    }

    console.error("Admin replace variant images error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
})

