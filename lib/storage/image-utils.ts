/**
 * Image Utility Functions
 * 
 * Helper functions for handling product images with Supabase Storage
 */

import { getStorageUrl } from "./supabase-storage"

/**
 * Get the primary product image URL
 * Handles both Supabase Storage paths and full URLs
 */
export function getProductImageUrl(
  image?: string,
  images?: string[]
): string {
  // Use first image from images array if available
  if (images && images.length > 0) {
    return getStorageUrl(images[0])
  }
  
  // Fall back to image field
  if (image) {
    return getStorageUrl(image)
  }
  
  // Default placeholder (you can replace with a Supabase Storage placeholder)
  return "/placeholder-product.jpg"
}

/**
 * Get all product image URLs
 */
export function getProductImageUrls(
  image?: string,
  images?: string[]
): string[] {
  const urls: string[] = []
  
  if (images && images.length > 0) {
    urls.push(...images.map(getStorageUrl))
  } else if (image) {
    urls.push(getStorageUrl(image))
  }
  
  return urls.length > 0 ? urls : ["/placeholder-product.jpg"]
}
