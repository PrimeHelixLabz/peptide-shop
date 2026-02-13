import { NextRequest, NextResponse } from "next/server"
import { getProducts } from "@/lib/db/supabase"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const q = searchParams.get("q")
    const category = searchParams.get("category")
    const limit = parseInt(searchParams.get("limit") || "10")

    if (!q || q.length < 2) {
      return NextResponse.json({ products: [] })
    }

    // Use RPC function for full-text search if available
    const supabase = await createClient()
    const { data, error } = await supabase.rpc("search_products", {
      search_query: q,
      category_filter: category && category !== "All" ? category : null,
      limit_count: limit,
    })

    if (!error && data) {
      return NextResponse.json({ products: data })
    }

    // Fallback to manual search
    const products = await getProducts()
    const query = q.toLowerCase()

    const results = products
      .filter(
        (product) =>
          product.name.toLowerCase().includes(query) ||
          product.description.toLowerCase().includes(query) ||
          product.category?.toLowerCase().includes(query) ||
          product.longDescription?.toLowerCase().includes(query)
      )
      .slice(0, limit)

    return NextResponse.json({ products: results })
  } catch (error) {
    console.error("Search error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
