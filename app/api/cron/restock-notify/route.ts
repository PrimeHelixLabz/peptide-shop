import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { sendRestockNotificationEmail } from "@/lib/email"
import { getStorageUrl } from "@/lib/storage/supabase-storage"

/**
 * Vercel Cron — restock notification fan-out.
 *
 * Schedule: every 15 minutes (see vercel.json).
 *
 * Picks restock_notifications rows where notified_at IS NULL whose
 * underlying variant is currently in_stock = true. For each one we look up
 * the product, send the email, and stamp notified_at to mark it done.
 *
 * The in_stock flag is maintained by a trigger on product_variants (see
 * migration 019), so a single inventory restock by an admin transparently
 * makes every waiting notification fire on the next cron tick.
 */
export const dynamic = "force-dynamic"
export const maxDuration = 60

function isAuthorized(request: NextRequest): boolean {
  const expected = process.env.CRON_SECRET
  if (!expected) {
    return process.env.NODE_ENV !== "production"
  }
  const header = request.headers.get("authorization") ?? ""
  return header === `Bearer ${expected}`
}

interface PendingRow {
  id: string
  email: string
  unsubscribe_token: string
  variant_id: string
  product_variants: {
    sku: string
    in_stock: boolean
    products: {
      name: string
      slug: string
      thumbnail_url: string | null
      image: string | null
    } | null
  } | null
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const supabase = createAdminClient()

  // Pull pending notifications joined with their variant + product. We
  // filter to in_stock=true on the join target via .eq below so the cron
  // skips variants still out of stock.
  const { data: rows, error } = await supabase
    .from("restock_notifications")
    .select(
      `id, email, unsubscribe_token, variant_id,
       product_variants!inner (
         sku, in_stock,
         products!inner ( name, slug, thumbnail_url, image )
       )`
    )
    .is("notified_at", null)
    .eq("product_variants.in_stock", true)
    .limit(200)

  if (error) {
    console.error("restock-notify cron: query failed", error)
    return NextResponse.json({ error: "Query failed" }, { status: 500 })
  }

  if (!rows || rows.length === 0) {
    return NextResponse.json({ ok: true, processed: 0 })
  }

  const origin =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "") ||
    "https://primehelixlabz.com"

  let sent = 0
  let skipped = 0
  let failed = 0

  for (const raw of rows as unknown as PendingRow[]) {
    const variant = raw.product_variants
    const product = variant?.products
    if (!variant || !product) {
      // Orphaned row — claim it so we don't re-scan forever.
      await supabase
        .from("restock_notifications")
        .update({ notified_at: new Date().toISOString() })
        .eq("id", raw.id)
      skipped++
      continue
    }

    // Claim before sending to prevent double-fire across overlapping crons.
    const { data: claimed, error: claimError } = await supabase
      .from("restock_notifications")
      .update({ notified_at: new Date().toISOString() })
      .eq("id", raw.id)
      .is("notified_at", null)
      .select("id")
      .maybeSingle()

    if (claimError || !claimed) {
      skipped++
      continue
    }

    const productImagePath = product.thumbnail_url || product.image
    const productImageUrl = productImagePath
      ? getStorageUrl(productImagePath)
      : undefined

    try {
      await sendRestockNotificationEmail({
        toEmail: raw.email,
        productName: product.name,
        variantSku: variant.sku,
        productUrl: `${origin}/shop/${product.slug}`,
        productImage: productImageUrl,
        unsubscribeUrl: `${origin}/api/restock-notifications/unsubscribe?token=${encodeURIComponent(raw.unsubscribe_token)}`,
      })
      sent++
    } catch (err) {
      console.error(
        `restock-notify cron: send failed for notification ${raw.id}`,
        err
      )
      failed++
    }
  }

  return NextResponse.json({
    ok: true,
    processed: rows.length,
    sent,
    skipped,
    failed,
  })
}
