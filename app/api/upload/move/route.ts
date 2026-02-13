import { NextRequest, NextResponse } from "next/server"
import { requireAuthMiddleware } from "@/lib/auth/middleware"
import { createClient } from "@/lib/supabase/server"
import { z } from "zod"

const moveFileSchema = z.object({
  sourcePath: z.string(),
  productId: z.string().uuid(),
})

/**
 * Move uploaded file from temp directory to product directory
 * Used when creating a new product - images are uploaded to temp first,
 * then moved to the product's UUID directory after product creation
 */
export const POST = requireAuthMiddleware(async (req) => {
  try {
    const body = await req.json()
    const { sourcePath, productId } = moveFileSchema.parse(body)

    const supabase = await createClient()

    // Extract filename from source path
    const filename = sourcePath.split("/").pop()
    if (!filename) {
      return NextResponse.json({ error: "Invalid source path" }, { status: 400 })
    }

    const destinationPath = `${productId}/${filename}`

    // Copy file to new location
    const { data: copyData, error: copyError } = await supabase.storage
      .from("products")
      .copy(sourcePath, destinationPath)

    if (copyError) {
      console.error("Copy error:", copyError)
      return NextResponse.json({ error: "Failed to move file" }, { status: 500 })
    }

    // Delete original file from temp
    if (sourcePath.startsWith("temp/")) {
      const { error: deleteError } = await supabase.storage
        .from("products")
        .remove([sourcePath])

      if (deleteError) {
        console.warn("Failed to delete temp file:", deleteError)
        // Don't fail the request, just log the warning
      }
    }

    // Get public URL for new location
    const {
      data: { publicUrl },
    } = supabase.storage.from("products").getPublicUrl(destinationPath)

    return NextResponse.json({
      url: publicUrl,
      path: destinationPath,
      productId,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      )
    }

    console.error("Move file error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
})
