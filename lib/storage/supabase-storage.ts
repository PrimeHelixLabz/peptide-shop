/**
 * Supabase Storage Utilities
 * 
 * Helper functions for working with Supabase Storage
 */

const PRODUCTS_BUCKET = "products"
const AVATARS_BUCKET = "avatars"

/**
 * Get the public URL for a file in Supabase Storage
 * Handles both product images and user avatars
 */
export function getStorageUrl(filePath: string): string {
  // If it's already a full URL, return as is
  if (filePath.startsWith("http://") || filePath.startsWith("https://")) {
    return filePath
  }

  // Remove leading slash if present
  const cleanPath = filePath.startsWith("/") ? filePath.slice(1) : filePath

  // Construct Supabase Storage URL
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!supabaseUrl) {
    console.warn("NEXT_PUBLIC_SUPABASE_URL is not set")
    return filePath
  }

  // Choose bucket based on path prefix:
  // - Product images live in the "products" bucket
  // - Avatars live in the "avatars" bucket and use an "avatars/" path prefix
  const bucket = cleanPath.startsWith("avatars/") ? AVATARS_BUCKET : PRODUCTS_BUCKET

  // Supabase Storage public URL format: {supabaseUrl}/storage/v1/object/public/{bucket}/{path}
  return `${supabaseUrl}/storage/v1/object/public/${bucket}/${cleanPath}`
}

/**
 * Get multiple storage URLs from an array of paths
 */
export function getStorageUrls(filePaths: string[]): string[] {
  return filePaths.map(getStorageUrl)
}

/**
 * Extract the file path from a Supabase Storage URL
 */
export function extractStoragePath(url: string): string | null {
  try {
    const urlObj = new URL(url)
    // Support both products and avatars buckets; always return the path portion.
    const match = urlObj.pathname.match(/\/storage\/v1\/object\/public\/(?:products|avatars)\/(.+)/)
    return match ? match[1] : null
  } catch {
    return null
  }
}

/**
 * Get the storage path for a product image
 * Format: {productId}/{filename}
 */
export function getProductImagePath(productId: string, filename: string): string {
  return `${productId}/${filename}`
}

/**
 * Extract product ID from storage path
 * Returns null if path doesn't match expected format
 */
export function extractProductIdFromPath(path: string): string | null {
  // Path format: {productId}/{filename} or {productId}/filename.ext
  const parts = path.split("/")
  if (parts.length >= 2) {
    // Check if first part is a UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (uuidRegex.test(parts[0])) {
      return parts[0]
    }
  }
  return null
}

/**
 * Check if a URL is a Supabase Storage URL
 */
export function isStorageUrl(url: string): boolean {
  return url.includes("/storage/v1/object/public/")
}
