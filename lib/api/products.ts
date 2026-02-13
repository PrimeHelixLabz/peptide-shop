/**
 * Products API abstraction layer
 * 
 * This file provides an abstraction for fetching products.
 * Uses Supabase backend API endpoints.
 */

import type { ProductDetail } from "./types"

const API_BASE = process.env.NEXT_PUBLIC_API_URL || ""

/**
 * Fetch all products
 */
export async function getAllProducts(): Promise<ProductDetail[]> {
  try {
    const response = await fetch(`${API_BASE}/api/products`, {
      cache: "no-store",
    })
    if (!response.ok) throw new Error("Failed to fetch products")
    const data = await response.json()
    return data.products || []
  } catch (error) {
    console.error("Error fetching products:", error)
    // Fallback to empty array
    return []
  }
}

/**
 * Fetch a single product by ID
 */
export async function getProductById(id: string): Promise<ProductDetail | null> {
  try {
    const response = await fetch(`${API_BASE}/api/products/${id}`, {
      cache: "no-store",
    })
    if (!response.ok) {
      if (response.status === 404) return null
      throw new Error("Failed to fetch product")
    }
    const data = await response.json()
    return data.product || null
  } catch (error) {
    console.error("Error fetching product:", error)
    return null
  }
}

/**
 * Fetch products by category
 */
export async function getProductsByCategory(
  category: string
): Promise<ProductDetail[]> {
  try {
    const url = new URL(`${API_BASE}/api/products`)
    if (category && category !== "All") {
      url.searchParams.set("category", category)
    }
    const response = await fetch(url.toString(), {
      cache: "no-store",
    })
    if (!response.ok) throw new Error("Failed to fetch products")
    const data = await response.json()
    return data.products || []
  } catch (error) {
    console.error("Error fetching products by category:", error)
    return []
  }
}

/**
 * Fetch related products
 */
export async function getRelatedProducts(
  productId: string,
  limit = 3
): Promise<ProductDetail[]> {
  try {
    const url = new URL(`${API_BASE}/api/products/${productId}/related`)
    url.searchParams.set("limit", limit.toString())
    const response = await fetch(url.toString(), {
      cache: "no-store",
    })
    if (!response.ok) throw new Error("Failed to fetch related products")
    const data = await response.json()
    return data.products || []
  } catch (error) {
    console.error("Error fetching related products:", error)
    return []
  }
}

/**
 * Get all unique categories
 */
export async function getCategories(): Promise<string[]> {
  try {
    const response = await fetch(`${API_BASE}/api/products/categories`, {
      cache: "no-store",
    })
    if (!response.ok) throw new Error("Failed to fetch categories")
    const data = await response.json()
    return data.categories || ["All"]
  } catch (error) {
    console.error("Error fetching categories:", error)
    return ["All"]
  }
}
