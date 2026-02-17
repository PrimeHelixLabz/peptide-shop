/**
 * Server-side Products API
 * 
 * Direct database access for server components (faster, no HTTP overhead)
 */

import { getProducts, getProductById as getProductByIdDb, getProductBySlug as getProductBySlugDb } from "@/lib/db/supabase"
import type { ProductDetail } from "./types"

/**
 * Fetch all products (server-side)
 */
export async function getAllProducts(options?: { 
  includeArchived?: boolean
  limit?: number
  offset?: number
}): Promise<ProductDetail[]> {
  const products = await getProducts(options)
  return products.map((p) => ({
    ...p,
    longDescription: p.longDescription || "",
    usage: p.usage || "",
    shipping: p.shipping || "",
  }))
}

/**
 * Fetch a single product by ID (server-side)
 */
export async function getProductById(id: string): Promise<ProductDetail | null> {
  const product = await getProductByIdDb(id)
  if (!product) return null
  return {
    ...product,
    longDescription: product.longDescription || "",
    usage: product.usage || "",
    shipping: product.shipping || "",
  }
}

/**
 * Fetch a single product by slug (server-side)
 */
export async function getProductBySlug(slug: string): Promise<ProductDetail | null> {
  const product = await getProductBySlugDb(slug)
  if (!product) return null
  return {
    ...product,
    longDescription: product.longDescription || "",
    usage: product.usage || "",
    shipping: product.shipping || "",
  }
}

/**
 * Fetch related products (server-side)
 */
export async function getRelatedProducts(
  productId: string,
  limit = 3
): Promise<ProductDetail[]> {
  const current = await getProductByIdDb(productId)
  if (!current) return []

  const allProducts = await getProducts()
  const filtered = allProducts.filter((p) => p.id !== productId)

  const sameCategory = filtered.filter(
    (p) => p.category === current.category
  )
  const others = filtered.filter(
    (p) => p.category !== current.category
  )

  const related = [...sameCategory, ...others].slice(0, limit)
  return related.map((p) => ({
    ...p,
    longDescription: p.longDescription || "",
    usage: p.usage || "",
    shipping: p.shipping || "",
  }))
}

/**
 * Get all unique categories (server-side)
 */
export async function getCategories(): Promise<string[]> {
  const { getCategories: getCategoriesFromDb } = await import("@/lib/db/categories")
  const categories = await getCategoriesFromDb()
  const categoryNames = categories.map((c) => c.name)
  return ["All", ...categoryNames]
}
