import { NextRequest, NextResponse } from "next/server"
import { requireAuthMiddleware } from "@/lib/auth/middleware"
import { createClient } from "@/lib/supabase/server"

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"]

export const POST = requireAuthMiddleware(async (req) => {
  try {
    const formData = await req.formData()
    const file = formData.get("file") as File
    const productId = formData.get("productId") as string | null
    const variantId = formData.get("variantId") as string | null
    const kind = (formData.get("kind") as string | null) || null

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Only JPEG, PNG, and WebP are allowed." },
        { status: 400 }
      )
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 5MB." },
        { status: 400 }
      )
    }

    // Generate unique filename
    const timestamp = Date.now()
    const randomString = Math.random().toString(36).substring(2, 15)
    const extension = file.name.split(".").pop()
    const filename = `${timestamp}-${randomString}.${extension}`

    // If productId is provided, store under that product directory. Otherwise, use temp.
    // Supports sub-arch paths for thumbnails and variant images. Blog images
    // live under a flat `blog/` prefix so they can be referenced
    // independently of any product lifecycle.
    const baseDir = kind === "blog" ? "blog" : productId || "temp"
    const subDir =
      kind === "blog"
        ? ""
        : productId && kind === "thumbnail"
          ? "thumbnail"
          : productId && kind === "variant" && variantId
            ? `variants/${variantId}`
            : productId && kind === "coa"
              ? "coa"
              : ""

    const directory = subDir ? `${baseDir}/${subDir}` : baseDir
    const filepath = `${directory}/${filename}`

    // Upload to Supabase Storage
    const supabase = await createClient()

    // Pass the File object directly to Supabase. This avoids relying on Node's
    // Buffer API and works in both Node.js and edge-like runtimes.
    const { data, error } = await supabase.storage
      .from("products")
      .upload(filepath, file, {
        contentType: file.type,
        upsert: false,
      })

    if (error) {
      console.error("Upload error:", error)
      return NextResponse.json(
        { error: "Failed to upload file", details: error.message ?? String(error) },
        { status: 500 }
      )
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from("products").getPublicUrl(filepath)

    return NextResponse.json({ 
      url: publicUrl, 
      filename, 
      path: filepath,
      productId: productId || null 
    })
  } catch (error) {
    console.error("Upload error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
})
