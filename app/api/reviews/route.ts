import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { requireAuthMiddleware, optionalAuthMiddleware } from "@/lib/auth/middleware"
import { createAdminClient } from "@/lib/supabase/admin"
import { getProductReviews } from "@/lib/db/reviews"

const createReviewSchema = z.object({
  productId: z.string().uuid("Invalid product"),
  rating: z.number().int().min(1).max(5),
  title: z.string().trim().min(1, "Title is required").max(120),
  body: z.string().trim().min(1, "Review text is required").max(4000),
})

export const GET = optionalAuthMiddleware(async (req) => {
  const productId = req.nextUrl.searchParams.get("productId")
  if (!productId) {
    return NextResponse.json({ error: "productId is required" }, { status: 400 })
  }
  const limit = Math.min(
    Number(req.nextUrl.searchParams.get("limit")) || 50,
    100
  )
  const offset = Math.max(
    Number(req.nextUrl.searchParams.get("offset")) || 0,
    0
  )

  const reviews = await getProductReviews(productId, { limit, offset })
  return NextResponse.json({ reviews })
})

export const POST = requireAuthMiddleware(async (req) => {
  let parsed: z.infer<typeof createReviewSchema>
  try {
    const body = await req.json()
    parsed = createReviewSchema.parse(body)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0]?.message ?? "Invalid input" },
        { status: 400 }
      )
    }
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }

  const userId = req.user!.id
  const userEmail = req.user!.email
  const supabase = createAdminClient()

  // Verified-purchase check: user must have a paid order containing this product.
  // orders.items is a JSONB array of { productId, productName, ... }.
  const { data: paidOrders, error: ordersError } = await supabase
    .from("orders")
    .select("id, items")
    .eq("user_id", userId)
    .eq("payment_status", "paid")

  if (ordersError) {
    console.error("Failed to look up user orders:", ordersError)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }

  type OrderRow = { id: string; items: Array<{ productId?: string }> | null }
  const matchingOrder = ((paidOrders as unknown as OrderRow[]) || []).find(
    (order) =>
      Array.isArray(order.items) &&
      order.items.some((item) => item?.productId === parsed.productId)
  )

  if (!matchingOrder) {
    return NextResponse.json(
      {
        error:
          "Reviews are limited to verified buyers. We could not find a paid order containing this product on your account.",
      },
      { status: 403 }
    )
  }

  // Resolve display name: prefer profiles.name, fall back to email local part.
  const { data: profile } = await supabase
    .from("profiles")
    .select("name")
    .eq("id", userId)
    .maybeSingle()

  type ProfileRow = { name?: string | null }
  const profileName = ((profile as unknown as ProfileRow | null)?.name || "").trim()
  const displayName =
    profileName || userEmail.split("@")[0] || "Verified buyer"

  const { data: inserted, error: insertError } = await supabase
    .from("product_reviews")
    .insert({
      product_id: parsed.productId,
      order_id: matchingOrder.id,
      user_id: userId,
      customer_name: displayName,
      customer_email: userEmail,
      rating: parsed.rating,
      title: parsed.title,
      body: parsed.body,
      is_verified_purchase: true,
      status: "published",
    })
    .select("id, product_id, customer_name, rating, title, body, is_verified_purchase, created_at")
    .single()

  if (insertError) {
    // 23505 = unique_violation (one review per user per product)
    if ((insertError as { code?: string }).code === "23505") {
      return NextResponse.json(
        { error: "You have already reviewed this product." },
        { status: 409 }
      )
    }
    console.error("Failed to insert review:", insertError)
    return NextResponse.json({ error: "Could not save review" }, { status: 500 })
  }

  type InsertedRow = {
    id: string
    product_id: string
    customer_name: string
    rating: number
    title: string
    body: string
    is_verified_purchase: boolean
    created_at: string
  }
  const row = inserted as unknown as InsertedRow
  return NextResponse.json(
    {
      review: {
        id: row.id,
        productId: row.product_id,
        customerName: row.customer_name,
        rating: row.rating,
        title: row.title,
        body: row.body,
        isVerifiedPurchase: row.is_verified_purchase,
        createdAt: row.created_at,
      },
    },
    { status: 201 }
  )
})
