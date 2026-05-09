import { NextResponse } from "next/server"
import { requireAdminMiddleware } from "@/lib/auth/middleware"
import {
  buildDemandTrendSeries,
  buildStockOverviewSeries,
  buildDemandVsStockSeries,
  buildShortageMetrics,
  computeKpis,
} from "@/lib/admin/inventory-analytics"

export const GET = requireAdminMiddleware(async (req) => {
  try {
    const { createClient } = await import("@/lib/supabase/server")
    const supabase = await createClient()
    const { searchParams } = new URL(req.url)

    const startParam = searchParams.get("start")
    const endParam = searchParams.get("end")

    if (!startParam || !endParam) {
      return NextResponse.json(
        { error: "start and end query params are required" },
        { status: 400 }
      )
    }

    const start = new Date(startParam)
    const end = new Date(endParam)

    // -----------------------------------------------------------------------
    // 1. Fetch orders within the date range (with items JSONB)
    // -----------------------------------------------------------------------
    const { data: ordersData, error: ordersError } = await supabase
      .from("orders")
      .select("id, items, created_at")
      .gte("created_at", start.toISOString())
      .lte("created_at", end.toISOString())
      .order("created_at", { ascending: true })

    if (ordersError) {
      console.error("Error fetching orders for inventory stats:", ordersError)
      return NextResponse.json(
        { error: "Failed to fetch orders" },
        { status: 500 }
      )
    }

    // -----------------------------------------------------------------------
    // 2. Fetch all non-archived products with their variants
    //    Variant stock is the source of truth — products.stock_quantity is a
    //    legacy column not maintained by the order flow, so summing variants
    //    is the only way to get accurate per-product inventory.
    // -----------------------------------------------------------------------
    const { data: productsData, error: productsError } = await supabase
      .from("products")
      .select("id, name, product_variants(stock)")
      .or("is_archived.is.null,is_archived.eq.false")

    if (productsError) {
      console.error("Error fetching products for inventory stats:", productsError)
      return NextResponse.json(
        { error: "Failed to fetch products" },
        { status: 500 }
      )
    }

    const products = (productsData || []).map((p: any) => {
      const variants = Array.isArray(p.product_variants) ? p.product_variants : []
      const stockQuantity = variants.reduce(
        (sum: number, v: any) => sum + (Number(v?.stock) || 0),
        0
      )
      return {
        id: p.id as string,
        name: p.name as string,
        stockQuantity,
      }
    })

    const orders = (ordersData || []).map((o: any) => ({
      id: o.id as string,
      createdAt: o.created_at as string,
      items: (Array.isArray(o.items) ? o.items : []) as Array<{
        productId: string
        productName: string
        quantity: number
      }>,
    }))

    // -----------------------------------------------------------------------
    // 3. Build lookup maps
    // -----------------------------------------------------------------------
    const productNames: Record<string, string> = {}
    const stockByProduct: Record<string, number> = {}

    for (const p of products) {
      productNames[p.id] = p.name
      stockByProduct[p.id] = p.stockQuantity
    }

    // -----------------------------------------------------------------------
    // 4. Aggregate required quantities per product
    // -----------------------------------------------------------------------
    const requiredByProduct: Record<string, number> = {}

    for (const order of orders) {
      for (const item of order.items) {
        const pid = item.productId
        if (!pid) continue

        requiredByProduct[pid] = (requiredByProduct[pid] || 0) + item.quantity

        // Ensure product name is known even if product was since archived/deleted
        if (!productNames[pid] && item.productName) {
          productNames[pid] = item.productName
        }
      }
    }

    // -----------------------------------------------------------------------
    // 5. Build response payloads
    // -----------------------------------------------------------------------
    const kpis = computeKpis(requiredByProduct, stockByProduct)

    const demandTrend = buildDemandTrendSeries(orders)

    const stockOverview = buildStockOverviewSeries(
      products.map((p) => ({
        name: p.name,
        stockQuantity: p.stockQuantity,
      }))
    )

    const demandVsStock = buildDemandVsStockSeries(
      requiredByProduct,
      stockByProduct,
      productNames
    )

    const shortageRows = buildShortageMetrics(
      requiredByProduct,
      stockByProduct,
      productNames
    )

    return NextResponse.json({
      kpis,
      demandTrend,
      stockOverview,
      demandVsStock,
      shortageRows,
    })
  } catch (error) {
    console.error("Get inventory stats error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
})
