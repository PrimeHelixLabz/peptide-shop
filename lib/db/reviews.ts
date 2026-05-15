import { createPublicClient } from "@/lib/supabase/public"

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
