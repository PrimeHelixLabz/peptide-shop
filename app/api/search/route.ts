import { NextRequest, NextResponse } from "next/server"
import { getProducts } from "@/lib/db/supabase"
import { createClient } from "@/lib/supabase/server"
import { getStorageUrl, getStorageUrls } from "@/lib/storage/supabase-storage"

// Helper to transform RPC result to ProductDetail format
function transformRpcResult(row: any) {
  // Convert image paths to Supabase Storage URLs
  const image = row.image ? getStorageUrl(row.image) : ""
  const images = row.images && Array.isArray(row.images) 
    ? getStorageUrls(row.images) 
    : (row.images ? [getStorageUrl(row.images)] : [])

  return {
    id: row.id,
    slug: row.slug || row.id, // Fallback to id if slug is missing
    name: row.name,
    price: parseFloat(row.price),
    description: row.description || "",
    longDescription: row.long_description || "",
    image,
    images: images.length > 0 ? images : (image ? [image] : []),
    category: row.category || undefined,
    inStock: row.in_stock ?? true,
    stockQuantity: row.stock_quantity || 0,
    specifications: row.specifications || {},
    usage: row.usage || "",
    shipping: row.shipping || "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

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
      // Transform RPC results to ensure all fields are present
      const transformedProducts = data.map(transformRpcResult)
      return NextResponse.json({ products: transformedProducts })
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
