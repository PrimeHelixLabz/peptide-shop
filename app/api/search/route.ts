import { NextRequest, NextResponse } from "next/server"
import { getProducts, getProductVariants } from "@/lib/db/supabase"
import { createClient } from "@/lib/supabase/server"
import { getStorageUrl, getStorageUrls } from "@/lib/storage/supabase-storage"
import type { ProductVariant } from "@/lib/db/schema"

// Helper to convert database row to ProductVariant
function rowToVariant(row: any): ProductVariant {
  const image = row.image ? getStorageUrl(row.image) : undefined
  const images = row.images && Array.isArray(row.images) && row.images.length > 0
    ? getStorageUrls(row.images)
    : undefined

  return {
    id: row.id,
    productId: row.product_id,
    name: row.name,
    price: parseFloat(row.price),
    stockQuantity: row.stock_quantity,
    inStock: row.in_stock,
    image,
    images,
    displayOrder: row.display_order || 0,
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

  // Use variant price/image if variants exist
  const displayPrice = variants && variants.length > 0 ? variants[0].price : parseFloat(row.price)
  let displayImage = image
  let displayImages = images.length > 0 ? images : (image ? [image] : [])
  
  if (variants && variants.length > 0) {
    // If product has no image, use first variant's image as placeholder
    if (!displayImage || displayImage === "") {
      const firstVariant = variants[0]
      if (firstVariant.images && firstVariant.images.length > 0) {
        displayImage = firstVariant.images[0]
        displayImages = firstVariant.images
      } else if (firstVariant.image) {
        displayImage = firstVariant.image
        displayImages = [firstVariant.image]
      }
    }
    // If product has image but variant has images, prefer variant images for display
    else if (variants[0].images && variants[0].images.length > 0) {
      displayImages = variants[0].images
    } else if (variants[0].image) {
      displayImages = [variants[0].image]
    }
  }

  // Calculate overall stock status from variants
  const hasVariants = variants && variants.length > 0
  const overallInStock = hasVariants
    ? variants.some(v => v.inStock)
    : (row.in_stock ?? true)
  const overallStockQuantity = hasVariants
    ? variants.reduce((sum, v) => sum + v.stockQuantity, 0)
    : (row.stock_quantity || 0)

  return {
    id: row.id,
    slug: row.slug || row.id, // Fallback to id if slug is missing
    name: row.name,
    price: displayPrice,
    description: row.description || "",
    longDescription: row.long_description || "",
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
      .slice(0, limit)

    return NextResponse.json({ products: results })
  } catch (error) {
    console.error("Search error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
