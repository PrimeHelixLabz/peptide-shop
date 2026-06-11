import { createPublicClient } from "@/lib/supabase/public"
import { createAdminClient } from "@/lib/supabase/admin"

export type ReviewStatus = "pending" | "published" | "hidden"

export interface ProductReview {
  id: string
  productId: string
  customerName: string
  rating: number
  title: string
  body: string
  isVerifiedPurchase: boolean
  createdAt: string
}

export interface AdminReview extends ProductReview {
  customerEmail: string
  status: ReviewStatus
  updatedAt: string
  productName: string | null
  productSlug: string | null
}

export interface ProductRatingSummary {
  productId: string
  count: number
  average: number
  // Distribution: index 0 = 1-star count, ..., index 4 = 5-star count
  distribution: [number, number, number, number, number]
}

interface ReviewRow {
  id: string
  product_id: string
  customer_name: string
  rating: number
  title: string
  body: string
  is_verified_purchase: boolean
  created_at: string
}

function rowToReview(row: ReviewRow): ProductReview {
  return {
    id: row.id,
    productId: row.product_id,
    customerName: row.customer_name,
    rating: row.rating,
    title: row.title,
    body: row.body,
    isVerifiedPurchase: row.is_verified_purchase,
    createdAt: row.created_at,
  }
}

export async function getProductReviews(
  productId: string,
  options?: { limit?: number; offset?: number }
): Promise<ProductReview[]> {
  const supabase = createPublicClient()
  const limit = options?.limit ?? 50
  const offset = options?.offset ?? 0

  const { data, error } = await supabase
    .from("product_reviews")
    .select(
      "id, product_id, customer_name, rating, title, body, is_verified_purchase, created_at"
    )
    .eq("product_id", productId)
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) {
    console.error("getProductReviews failed:", error)
    return []
  }

  return ((data as unknown as ReviewRow[]) || []).map(rowToReview)
}

export async function getProductRatingSummary(
  productId: string
): Promise<ProductRatingSummary> {
  const supabase = createPublicClient()

  const { data, error } = await supabase
    .from("product_reviews")
    .select("rating")
    .eq("product_id", productId)
    .eq("status", "published")

  if (error || !data) {
    if (error) console.error("getProductRatingSummary failed:", error)
    return emptySummary(productId)
  }

  const ratings = (data as unknown as { rating: number }[]).map((r) => r.rating)
  if (ratings.length === 0) return emptySummary(productId)

  const distribution: [number, number, number, number, number] = [0, 0, 0, 0, 0]
  let total = 0
  for (const r of ratings) {
    if (r >= 1 && r <= 5) {
      distribution[r - 1] += 1
      total += r
    }
  }

  return {
    productId,
    count: ratings.length,
    average: Math.round((total / ratings.length) * 10) / 10,
    distribution,
  }
}

export async function getProductRatingSummaries(
  productIds: string[]
): Promise<Map<string, ProductRatingSummary>> {
  const result = new Map<string, ProductRatingSummary>()
  if (productIds.length === 0) return result

  const supabase = createPublicClient()
  const { data, error } = await supabase
    .from("product_reviews")
    .select("product_id, rating")
    .in("product_id", productIds)
    .eq("status", "published")

  if (error || !data) {
    if (error) console.error("getProductRatingSummaries failed:", error)
    for (const id of productIds) result.set(id, emptySummary(id))
    return result
  }

  // Group by product_id
  const grouped = new Map<string, number[]>()
  for (const row of data as unknown as { product_id: string; rating: number }[]) {
    const arr = grouped.get(row.product_id) || []
    arr.push(row.rating)
    grouped.set(row.product_id, arr)
  }

  for (const id of productIds) {
    const ratings = grouped.get(id) || []
    if (ratings.length === 0) {
      result.set(id, emptySummary(id))
      continue
    }
    const distribution: [number, number, number, number, number] = [0, 0, 0, 0, 0]
    let total = 0
    for (const r of ratings) {
      if (r >= 1 && r <= 5) {
        distribution[r - 1] += 1
        total += r
      }
    }
    result.set(id, {
      productId: id,
      count: ratings.length,
      average: Math.round((total / ratings.length) * 10) / 10,
      distribution,
    })
  }

  return result
}

function emptySummary(productId: string): ProductRatingSummary {
  return {
    productId,
    count: 0,
    average: 0,
    distribution: [0, 0, 0, 0, 0],
  }
}

/* ────────────────────────────────────────────────────────────────
 *  Admin-side helpers — service-role only.
 *  Used by /admin/reviews moderation UI.
 * ────────────────────────────────────────────────────────────── */

interface AdminReviewRow {
  id: string
  product_id: string
  customer_name: string
  customer_email: string
  rating: number
  title: string
  body: string
  is_verified_purchase: boolean
  status: ReviewStatus
  created_at: string
  updated_at: string
  products: { name: string | null; slug: string | null } | null
}

function rowToAdminReview(row: AdminReviewRow): AdminReview {
  return {
    id: row.id,
    productId: row.product_id,
    customerName: row.customer_name,
    customerEmail: row.customer_email,
    rating: row.rating,
    title: row.title,
    body: row.body,
    isVerifiedPurchase: row.is_verified_purchase,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    productName: row.products?.name ?? null,
    productSlug: row.products?.slug ?? null,
  }
}

export async function getAllReviewsAsAdmin(options?: {
  status?: ReviewStatus
}): Promise<AdminReview[]> {
  const supabase = createAdminClient()
  // Inner-joined products so we can render the product name + link without
  // an N+1. Reviews with an orphaned product_id (FK is ON DELETE CASCADE)
  // shouldn't exist in practice.
  let query = supabase
    .from("product_reviews")
    .select(
      "id, product_id, customer_name, customer_email, rating, title, body, is_verified_purchase, status, created_at, updated_at, products(name, slug)"
    )
    .order("created_at", { ascending: false })

  if (options?.status) {
    query = query.eq("status", options.status)
  }

  const { data, error } = await query
  if (error) {
    console.error("getAllReviewsAsAdmin failed:", error)
    return []
  }
  return ((data as unknown as AdminReviewRow[]) || []).map(rowToAdminReview)
}

export async function setReviewStatusAsAdmin(
  id: string,
  status: ReviewStatus
): Promise<AdminReview | null> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from("product_reviews")
    .update({ status })
    .eq("id", id)
    .select(
      "id, product_id, customer_name, customer_email, rating, title, body, is_verified_purchase, status, created_at, updated_at, products(name, slug)"
    )
    .single()
  if (error) {
    console.error("setReviewStatusAsAdmin failed:", error)
    return null
  }
  return rowToAdminReview(data as unknown as AdminReviewRow)
}

export async function deleteReviewAsAdmin(
  id: string
): Promise<{ ok: boolean; productSlug: string | null }> {
  const supabase = createAdminClient()
  // Resolve the product slug before deleting so the route can revalidate the
  // cached detail page. A separate read keeps the delete idempotent — deleting
  // an already-removed review still succeeds, as it did before this returned
  // the slug.
  const { data } = await supabase
    .from("product_reviews")
    .select("products(slug)")
    .eq("id", id)
    .maybeSingle()
  const products = (data as unknown as { products?: { slug?: string | null } | null } | null)
    ?.products

  const { error } = await supabase.from("product_reviews").delete().eq("id", id)
  if (error) {
    console.error("deleteReviewAsAdmin failed:", error)
    return { ok: false, productSlug: null }
  }
  return { ok: true, productSlug: products?.slug ?? null }
}
