import { NextRequest, NextResponse } from "next/server"
import { requireAdminMiddleware } from "@/lib/auth/middleware"
import { syncProductThumbnailToDefaultVariant } from "@/lib/db/supabase"

// Sync products.thumbnail_url from the primary image of the default variant.
// - If the product already has a non-empty thumbnail and force is not requested, it is left as-is.
// - This is used by the admin panel after saving variants/images when no explicit thumbnail was uploaded.
export const POST = requireAdminMiddleware(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const { id } = await params
    await syncProductThumbnailToDefaultVariant(id, { force: false })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Sync thumbnail error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
})

