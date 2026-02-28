import { NextRequest, NextResponse } from "next/server"
import { requireAuthMiddleware } from "@/lib/auth/middleware"
import { createClient } from "@/lib/supabase/server"

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"]

/**
 * Upload user avatar
 * Stores avatars in dedicated "avatars" bucket under avatars/{userId}/ directory
 */
export const POST = requireAuthMiddleware(async (req) => {
  try {
    const formData = await req.formData()
    const file = formData.get("file") as File

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

    // Get user ID
    const supabase = await createClient()
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()

    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Generate unique filename
    const timestamp = Date.now()
    const randomString = Math.random().toString(36).substring(2, 15)
    const extension = file.name.split(".").pop()
    const filename = `avatar-${timestamp}-${randomString}.${extension}`
    const filepath = `avatars/${authUser.id}/${filename}`

    // Upload to Supabase Storage
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Delete old avatar if exists
    const { data: oldFiles } = await supabase.storage
      .from("avatars")
      .list(`avatars/${authUser.id}`)

    if (oldFiles && oldFiles.length > 0) {
      const oldPaths = oldFiles.map((f) => `avatars/${authUser.id}/${f.name}`)
      await supabase.storage.from("avatars").remove(oldPaths)
    }

    const { data, error } = await supabase.storage
      .from("avatars")
      .upload(filepath, buffer, {
        contentType: file.type,
        upsert: false,
      })

    if (error) {
      console.error("Upload error:", error)
      return NextResponse.json({ error: "Failed to upload file" }, { status: 500 })
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from("avatars").getPublicUrl(filepath)

    return NextResponse.json({
      url: publicUrl,
      filename,
      path: filepath,
    })
  } catch (error) {
    console.error("Upload error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
})
