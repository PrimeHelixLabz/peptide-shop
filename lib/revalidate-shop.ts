/**
 * On-demand invalidation for statically cached shop pages.
 *
 * The shop list (/shop) and homepage product section (/) are prerendered and
 * served from the Full Route Cache. Any admin mutation that changes what the
 * catalog shows must call this, or new/edited products stay invisible until
 * the next ISR window.
 */

import { revalidatePath } from "next/cache"
import { createAdminClient } from "@/lib/supabase/admin"

export function revalidateShopPages(slug?: string | null) {
  revalidatePath("/")
  revalidatePath("/shop")
  if (slug) {
    revalidatePath(`/shop/${slug}`)
  }
}

/**
 * Variant/COA/image/review routes only carry the product id, so resolve the
 * slug here. Admin client: the product may be archived or inactive (hidden
 * from the public client) and its detail page still needs invalidating.
 * Lookup failures fall back to list-page revalidation only — never let a
 * cache refresh break the mutation that triggered it.
 */
export async function revalidateShopPagesById(productId: string) {
  let slug: string | null | undefined
  try {
    const supabase = createAdminClient()
    const { data } = await supabase
      .from("products")
      .select("slug")
      .eq("id", productId)
      .single()
    slug = data?.slug as string | null | undefined
  } catch (error) {
    console.error("revalidateShopPagesById: slug lookup failed", error, { productId })
  }
  revalidateShopPages(slug)
}
