import { NextRequest, NextResponse } from "next/server"
import { getProductById, getProducts } from "@/lib/db/supabase"
import { createClient } from "@/lib/supabase/server"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get("limit") || "3")

    const currentProduct = await getProductById(id)
    if (!currentProduct) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 })
    }

    // Use RPC function if available, otherwise fallback to manual query
    const supabase = await createClient()
    const { data, error } = await supabase.rpc("get_related_products", {
      product_uuid: id,
      limit_count: limit,
    })

    if (!error && data) {
      return NextResponse.json({ products: data })
    }

    // Fallback to manual query
    const allProducts = await getProducts()
    const filtered = allProducts.filter((p) => p.id !== id)

    const sameCategory = filtered.filter(
      (p) => p.category === currentProduct.category
    )
    const others = filtered.filter(
      (p) => p.category !== currentProduct.category
    )

    const related = [...sameCategory, ...others].slice(0, limit)

    return NextResponse.json({ products: related })
  } catch (error) {
    console.error("Get related products error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
