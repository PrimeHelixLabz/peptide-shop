import { NextRequest, NextResponse } from "next/server"
import { getProducts } from "@/lib/db/supabase"
import { createClient } from "@/lib/supabase/server"
import { getStorageUrl, getStorageUrls } from "@/lib/storage/supabase-storage"
import type { ProductVariant } from "@/lib/db/schema"

// Helper to convert database row to ProductVariant
function rowToVariant(row: any): ProductVariant {
  return {
    id: row.id,
    productId: row.product_id,
    sku: row.sku || row.name || row.id,
    name: row.name || undefined,
    price: parseFloat(row.price),
    stock: row.stock ?? 0,
    inStock: (row.stock ?? 0) > 0 ? true : (row.in_stock ?? false),
    displayOrder: row.display_order || 0,
    color: row.color ?? null,
    size: row.size ?? null,
    isDefault: row.is_default ?? false,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

// Helper to transform RPC result to ProductDetail format
async function transformRpcResult(row: any, supabase: any) {
  // Convert image paths to Supabase Storage URLs
  const image = row.image ? getStorageUrl(row.image) : ""
  const images = row.images && Array.isArray(row.images) 
    ? getStorageUrls(row.images) 
    : (row.images ? [getStorageUrl(row.images)] : [])
  const thumbnailUrl = row.thumbnail_url ? getStorageUrl(row.thumbnail_url) : undefined

  // Fetch variants for this product
  const { data: variantRows } = await supabase
    .from("product_variants")
    .select("*")
    .eq("product_id", row.id)
    .order("display_order", { ascending: true })
    .order("name", { ascending: true })

  let variants: ProductVariant[] | undefined
  if (variantRows && variantRows.length > 0) {
    variants = variantRows.map(rowToVariant)
  }

  // Use variant price if variants exist
  const displayPrice = variants && variants.length > 0 ? variants[0].price : parseFloat(row.price)
  const displayImage = thumbnailUrl || image
  const displayImages = thumbnailUrl ? [thumbnailUrl] : (images.length > 0 ? images : (image ? [image] : []))

  // Calculate overall stock status from variants
  const hasVariants = variants && variants.length > 0
  const overallInStock = hasVariants
    ? variants.some(v => v.inStock)
    : (row.in_stock ?? true)
  const overallStockQuantity = hasVariants
    ? variants.reduce((sum, v) => sum + v.stock, 0)
    : 0

  return {
    id: row.id,
    slug: row.slug || row.id, // Fallback to id if slug is missing
    name: row.name,
    price: displayPrice,
    description: row.description || "",
    longDescription: row.long_description || "",
    thumbnailUrl,
    image: displayImage,
    images: displayImages,
    category: row.category || undefined,
    inStock: overallInStock,
    stockQuantity: overallStockQuantity,
    specifications: row.specifications || {},
    usage: row.usage || "",
    shipping: row.shipping || "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    variants, // Include variants
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const q = searchParams.get("q")
    const category = searchParams.get("category")
    const limit = parseInt(searchParams.get("limit") || "10")

    if (!q || q.length < 2 || q.length > 200) {
      return NextResponse.json({ products: [] })
    }

    // Cap limit to prevent abuse
    const cappedLimit = Math.min(Math.max(limit, 1), 50)

    // Use RPC function for full-text search if available
    const supabase = await createClient()
    const { data, error } = await supabase.rpc("search_products", {
      search_query: q,
      category_filter: category && category !== "All" ? category : null,
      limit_count: cappedLimit,
    })

    if (!error && data) {
      // Transform RPC results to ensure all fields are present, including variants
      const transformedProducts = await Promise.all(
        data.map((row: any) => transformRpcResult(row, supabase))
      )
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
      .slice(0, cappedLimit)

    return NextResponse.json({ products: results })
  } catch (error) {
    console.error("Search error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
