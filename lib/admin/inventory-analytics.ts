/**
 * Inventory Analytics - Data Transformation Helpers
 *
 * Reusable functions that transform raw order/product data into
 * chart-ready series for the admin dashboard.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DemandTrendPoint {
  date: string
  quantity: number
}

export interface StockOverviewPoint {
  productName: string
  stockQuantity: number
}

export interface DemandVsStockPoint {
  productName: string
  requiredQuantity: number
  stockQuantity: number
}

export interface ShortageRow {
  productId: string
  productName: string
  requiredQuantity: number
  stockQuantity: number
  shortageQuantity: number
}

export interface InventoryKpis {
  totalRequiredQuantity: number
  totalStockQuantity: number
  totalShortageQuantity: number
}

// ---------------------------------------------------------------------------
// Series builders
// ---------------------------------------------------------------------------

/** Build a daily demand trend series from order items. */
export function buildDemandTrendSeries(
  orders: Array<{ createdAt: string; items: Array<{ quantity: number }> }>
): DemandTrendPoint[] {
  const daily: Record<string, number> = {}

  for (const order of orders) {
    const date = new Date(order.createdAt).toISOString().split("T")[0]
    const totalQty = order.items.reduce((sum, item) => sum + item.quantity, 0)
    daily[date] = (daily[date] || 0) + totalQty
  }

  return Object.entries(daily)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, quantity]) => ({ date, quantity }))
}

/** Build stock overview series from products. */
export function buildStockOverviewSeries(
  products: Array<{ name: string; stockQuantity: number }>
): StockOverviewPoint[] {
  return products
    .map((p) => ({ productName: p.name, stockQuantity: p.stockQuantity }))
    .sort((a, b) => b.stockQuantity - a.stockQuantity)
}

/** Build demand vs stock comparison series. */
export function buildDemandVsStockSeries(
  requiredByProduct: Record<string, number>,
  stockByProduct: Record<string, number>,
  productNames: Record<string, string>
): DemandVsStockPoint[] {
  const productIds = new Set([
    ...Object.keys(requiredByProduct),
    ...Object.keys(stockByProduct),
  ])

  return Array.from(productIds)
    .map((id) => ({
      productName: productNames[id] || id,
      requiredQuantity: requiredByProduct[id] || 0,
      stockQuantity: stockByProduct[id] || 0,
    }))
    .sort((a, b) => b.requiredQuantity - a.requiredQuantity)
}

/** Build shortage metrics sorted by highest shortage first. */
export function buildShortageMetrics(
  requiredByProduct: Record<string, number>,
  stockByProduct: Record<string, number>,
  productNames: Record<string, string>
): ShortageRow[] {
  const productIds = new Set([
    ...Object.keys(requiredByProduct),
    ...Object.keys(stockByProduct),
  ])

  return Array.from(productIds)
    .map((id) => {
      const required = requiredByProduct[id] || 0
      const stock = stockByProduct[id] || 0
      return {
        productId: id,
        productName: productNames[id] || id,
        requiredQuantity: required,
        stockQuantity: stock,
        shortageQuantity: Math.max(required - stock, 0),
      }
    })
    .sort((a, b) => b.shortageQuantity - a.shortageQuantity)
}

/** Compute top-level KPI values. */
export function computeKpis(
  requiredByProduct: Record<string, number>,
  stockByProduct: Record<string, number>
): InventoryKpis {
  const totalRequired = Object.values(requiredByProduct).reduce(
    (s, v) => s + v,
    0
  )
  const totalStock = Object.values(stockByProduct).reduce((s, v) => s + v, 0)

  let totalShortage = 0
  for (const id of Object.keys(requiredByProduct)) {
    const required = requiredByProduct[id] || 0
    const stock = stockByProduct[id] || 0
    totalShortage += Math.max(required - stock, 0)
  }

  return {
    totalRequiredQuantity: totalRequired,
    totalStockQuantity: totalStock,
    totalShortageQuantity: totalShortage,
  }
}
