import { NextRequest, NextResponse } from "next/server"
import { requireAuthMiddleware } from "@/lib/auth/middleware"
import { createClient } from "@/lib/supabase/server"
import { extractStoragePath } from "@/lib/storage/supabase-storage"
import { z } from "zod"

const deleteFileSchema = z.object({
  url: z.string(),
})

/**
 * Delete a file from Supabase Storage
 * Used when removing images from products
 */
export const POST = requireAuthMiddleware(async (req) => {
  try {
    const body = await req.json()
    const { url } = deleteFileSchema.parse(body)

    // Extract storage path from URL
    const storagePath = extractStoragePath(url)
    
    if (!storagePath) {
      // If it's not a Supabase storage URL, nothing to delete
      return NextResponse.json({ 
        success: true, 
        message: "Not a storage URL, skipping deletion" 
      })
    }

    const supabase = await createClient()

    // Delete file from storage
    const { error: deleteError } = await supabase.storage
      .from("products")
      .remove([storagePath])

    if (deleteError) {
      console.error("Delete error:", deleteError)
      return NextResponse.json(
        { error: "Failed to delete file from storage" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: "File deleted successfully",
      path: storagePath,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      )
    }

    console.error("Delete file error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
})
