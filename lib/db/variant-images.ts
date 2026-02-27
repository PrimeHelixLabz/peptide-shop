/**
 * Variant Images DB access
 *
 * Normalized variant image architecture:
 * - One variant has many images
 * - Exactly one image per variant can be primary
 * - Images are ordered by sort_order
 */

import { createClient } from "@/lib/supabase/server"
import { createPublicClient } from "@/lib/supabase/public"
import { extractStoragePath, getStorageUrl } from "@/lib/storage/supabase-storage"
import type { VariantImage } from "./schema"

function rowToVariantImage(row: any): VariantImage {
  return {
    id: row.id,
    variantId: row.variant_id,
    imageUrl: getStorageUrl(row.image_url),
    isPrimary: !!row.is_primary,
    sortOrder: row.sort_order ?? 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export async function getVariantImages(variantId: string): Promise<VariantImage[]> {
  const supabase = createPublicClient()
  const { data, error } = await supabase
    .from("variant_images")
    .select("*")
    .eq("variant_id", variantId)
    .order("is_primary", { ascending: false })
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true })

  if (error || !data) return []
  return data.map(rowToVariantImage)
}

export type ReplaceVariantImagesInput = Array<{
  imageUrl: string
  isPrimary?: boolean
  sortOrder?: number
}>

/**
 * Replace all images for a variant (admin-only write path).
 * Enforces:
 * - exactly one primary image (defaults to first if any images provided)
 * - sort_order is assigned if missing
 */
export async function replaceVariantImages(
  variantId: string,
  images: ReplaceVariantImagesInput
): Promise<VariantImage[]> {
  const normalized = (images || [])
    .map((img, idx) => ({
      image_url: extractStoragePath(img.imageUrl) || img.imageUrl,
      is_primary: !!img.isPrimary,
      sort_order: img.sortOrder ?? idx,
    }))
    .sort((a, b) => a.sort_order - b.sort_order)

  // Ensure exactly one primary if there are any images
  if (normalized.length > 0) {
    const primaryCount = normalized.filter((i) => i.is_primary).length
    if (primaryCount === 0) {
      normalized[0].is_primary = true
    } else if (primaryCount > 1) {
      let first = true
      for (const img of normalized) {
        if (img.is_primary) {
          if (first) first = false
          else img.is_primary = false
        }
      }
    }
  }

  const supabase = await createClient()

  // Delete existing rows then insert new ones.
  // (Supabase PostgREST doesn't provide multi-statement transactions here; keep the operation simple.)
  const { error: deleteError } = await supabase
    .from("variant_images")
    .delete()
    .eq("variant_id", variantId)

  if (deleteError) throw deleteError

  const { data, error: insertError } = await supabase
    .from("variant_images")
    .insert(
      normalized.map((img) => ({
        variant_id: variantId,
        image_url: img.image_url,
        is_primary: img.is_primary,
        sort_order: img.sort_order,
      }))
    )
    .select("*")

  if (insertError) throw insertError
  return (data || []).map(rowToVariantImage)
}

