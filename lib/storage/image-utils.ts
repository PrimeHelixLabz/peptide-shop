/**
 * Image Utility Functions
 * 
 * Helper functions for handling product images with Supabase Storage
 */

import { getStorageUrl } from "./supabase-storage"

/**
 * Get the primary product image URL
 * Handles both Supabase Storage paths and full URLs
 * Returns placeholder if no image is available
 */
export function getProductImageUrl(
  image?: string | null,
  images?: string[] | null
): string {
  // Use first image from images array if available
  if (images && Array.isArray(images) && images.length > 0 && images[0]) {
    const firstImage = images[0].trim()
    if (firstImage) {
      return getStorageUrl(firstImage)
    }
  }
  
  // Fall back to image field
  if (image && typeof image === "string" && image.trim()) {
    return getStorageUrl(image.trim())
  }
  
  // Default placeholder - use a data URL or a simple placeholder
  // Using a simple SVG placeholder that works everywhere
  return "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400' viewBox='0 0 400 400'%3E%3Crect fill='%23f3f4f6' width='400' height='400'/%3E%3Ctext fill='%239ca3af' font-family='sans-serif' font-size='18' x='50%25' y='50%25' text-anchor='middle' dominant-baseline='middle'%3ENo Image%3C/text%3E%3C/svg%3E"
}

/**
 * Get all product image URLs
 */
export function getProductImageUrls(
  image?: string | null,
  images?: string[] | null
): string[] {
  const urls: string[] = []
  const placeholder = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400' viewBox='0 0 400 400'%3E%3Crect fill='%23f3f4f6' width='400' height='400'/%3E%3Ctext fill='%239ca3af' font-family='sans-serif' font-size='18' x='50%25' y='50%25' text-anchor='middle' dominant-baseline='middle'%3ENo Image%3C/text%3E%3C/svg%3E"
  
  if (images && Array.isArray(images) && images.length > 0) {
    const validImages = images.filter(img => img && typeof img === "string" && img.trim())
    if (validImages.length > 0) {
      urls.push(...validImages.map(img => getStorageUrl(img.trim())))
    }
  }
  
  if (urls.length === 0 && image && typeof image === "string" && image.trim()) {
    urls.push(getStorageUrl(image.trim()))
  }
  
  return urls.length > 0 ? urls : [placeholder]
}
