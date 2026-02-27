import { NextRequest, NextResponse } from "next/server"
import { getVariantImages } from "@/lib/db/variant-images"

// Public read endpoint used by the product detail page.
// Returns CDN-ready URLs and ordered images for a given variant.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ variantId: string }> }
) {
  try {
    const { variantId } = await params
    const images = await getVariantImages(variantId)
    return NextResponse.json({ images })
  } catch (error) {
    console.error("Get variant images error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

