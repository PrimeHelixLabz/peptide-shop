/**
 * Product COAs DB access
 *
 * One product has many Certificates of Analysis (image + optional label).
 * Ordered by sort_order. Mirrors the variant-images pattern.
 */

import { createClient } from "@/lib/supabase/server"
import { createPublicClient } from "@/lib/supabase/public"
import { extractStoragePath, getStorageUrl } from "@/lib/storage/supabase-storage"
import type { ProductCoa } from "./schema"

export function rowToProductCoa(row: any): ProductCoa {
  return {
    id: row.id,
    productId: row.product_id,
    imageUrl: getStorageUrl(row.image_url),
    label: row.label || undefined,
    sortOrder: row.sort_order ?? 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export async function getProductCoas(productId: string): Promise<ProductCoa[]> {
  const supabase = createPublicClient()
  const { data, error } = await supabase
    .from("product_coas")
    .select("*")
    .eq("product_id", productId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true })

  if (error || !data) return []
  return data.map(rowToProductCoa)
}

export type ReplaceProductCoasInput = Array<{
  imageUrl: string
  label?: string | null
  sortOrder?: number
}>

/**
 * Replace all COAs for a product (admin-only write path).
 * Sort order is assigned by array position when not provided.
 */
export async function replaceProductCoas(
  productId: string,
  coas: ReplaceProductCoasInput
): Promise<ProductCoa[]> {
  const normalized = (coas || []).map((coa, idx) => ({
    image_url: extractStoragePath(coa.imageUrl) || coa.imageUrl,
    label: coa.label?.trim() ? coa.label.trim() : null,
    sort_order: coa.sortOrder ?? idx,
  }))

  const supabase = await createClient()

  const { error: deleteError } = await supabase
    .from("product_coas")
    .delete()
    .eq("product_id", productId)

  if (deleteError) throw deleteError

  if (normalized.length === 0) return []

  const { data, error: insertError } = await supabase
    .from("product_coas")
    .insert(
      normalized.map((coa) => ({
        product_id: productId,
        image_url: coa.image_url,
        label: coa.label,
        sort_order: coa.sort_order,
      }))
    )
    .select("*")

  if (insertError) throw insertError
  return (data || []).map(rowToProductCoa)
}
