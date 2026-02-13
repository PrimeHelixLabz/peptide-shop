/**
 * Products data access layer
 * 
 * This file provides backward-compatible exports and re-exports from the API layer.
 * For server components, use server-products.ts directly.
 * For client components, use the API routes.
 */

export type { ProductDetail } from "./api/types"

// Re-export server-side functions for backward compatibility
// These are for use in server components
export {
  getAllProducts as getProducts,
  getProductById as getProductBySlug,
  getRelatedProducts,
  getCategories,
} from "./api/server-products"
