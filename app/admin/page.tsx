"use client"

import { useState, useEffect, useMemo } from "react"
import {
  DollarSign,
  ShoppingCart,
  Clock,
  Package,
  Info,
  Loader2,
  TrendingUp,
  BarChart3,
  AlertTriangle,
} from "lucide-react"
import { StatCard } from "@/components/admin/stat-card"
import type { StatCardData } from "@/components/admin/stat-card"
import { RecentOrdersTable } from "@/components/admin/recent-orders-table"
import { DashboardChart, type SeriesVisibility } from "@/components/admin/dashboard-chart"
import { DateRangePicker } from "@/components/admin/date-range-picker"
import {
  StockOverviewChart,
  DemandVsStockChart,
} from "@/components/admin/inventory-charts"
// import { ShortageRiskTable } from "@/components/admin/shortage-risk-table"
import { format } from "date-fns"
import type {
  DemandTrendPoint,
  StockOverviewPoint,
  DemandVsStockPoint,
  ShortageRow,
  InventoryKpis,
} from "@/lib/admin/inventory-analytics"

interface DashboardData {
  revenue: {
    current: number
    previous: number
    change: number
    trend: "up" | "down" | "neutral"
  }
  orders: {
    current: number
    previous: number
    change: number
    trend: "up" | "down" | "neutral"
  }
  pendingOrders: number
  activeProducts: number
  chartData: Array<{
    date: string
    revenue: number
    orders: number
    previousRevenue?: number
    previousOrders?: number
  }>
  period: {
    start: string
    end: string
    previousStart: string
    previousEnd: string
  }
}

interface InventoryData {
  kpis: InventoryKpis
  demandTrend: DemandTrendPoint[]
  stockOverview: StockOverviewPoint[]
  demandVsStock: DemandVsStockPoint[]
  shortageRows: ShortageRow[]
}

type GroupBy = "daily" | "weekly" | "monthly"

export default function AdminDashboard() {
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>(() => {
    const end = new Date()
    end.setHours(23, 59, 59, 999)
    const start = new Date()
    start.setDate(end.getDate() - 6)
    start.setHours(0, 0, 0, 0)
    return { from: start, to: end }
  })
  const [selectedPreset, setSelectedPreset] = useState<"7d" | "30d" | "90d" | "all" | "custom">("7d")
  const [groupBy, setGroupBy] = useState<GroupBy>("daily")
  const [data, setData] = useState<DashboardData | null>(null)
  const [recentOrders, setRecentOrders] = useState<Array<{
    id: string
    customer: string
    email: string
    items: number
    total: string
    status: string
    date: string
  }>>([])
  const [inventoryData, setInventoryData] = useState<InventoryData | null>(null)
  const [loading, setLoading] = useState(true)
  const [fetching, setFetching] = useState(false)
  const [seriesVisibility, setSeriesVisibility] = useState<SeriesVisibility>({
    revenue: true,
    orders: true,
    demand: true,
  })

  useEffect(() => {
    if (dateRange.from && dateRange.to) {
      loadAllData()
    }
  }, [dateRange, groupBy])

  useEffect(() => {
    loadRecentOrders()
  }, [])

  async function loadAllData() {
    if (!dateRange.from || !dateRange.to) return

    // Only show full loading on initial load
    if (!data) {
      setLoading(true)
    } else {
      setFetching(true)
    }

    const params = `start=${dateRange.from.toISOString()}&end=${dateRange.to.toISOString()}`

    try {
      const [statsRes, inventoryRes] = await Promise.all([
        fetch(`/api/admin/stats?${params}`),
        fetch(`/api/admin/inventory-stats?${params}`),
      ])

      if (statsRes.ok) {
        setData(await statsRes.json())
      }
      if (inventoryRes.ok) {
        setInventoryData(await inventoryRes.json())
      }
    } catch (error) {
      console.error("Error loading dashboard data:", error)
    } finally {
      setLoading(false)
      setFetching(false)
    }
  }

  async function loadRecentOrders() {
    try {
      const response = await fetch("/api/admin/orders/recent")
      if (response.ok) {
        const data = await response.json()
        setRecentOrders(data.orders || [])
      }
    } catch (error) {
      console.error("Error loading recent orders:", error)
    }
  }

  // Merge demand trend data into the existing chart data points by date
  const mergedChartData = useMemo(() => {
    if (!data?.chartData || !inventoryData?.demandTrend) return data?.chartData ?? []

    const demandByDate: Record<string, number> = {}
    for (const point of inventoryData.demandTrend) {
      demandByDate[point.date] = point.quantity
    }

    return data.chartData.map((point) => ({
      ...point,
      demand: demandByDate[point.date] || 0,
    }))
  }, [data?.chartData, inventoryData?.demandTrend])

  // Total demand for the summary display
  const totalDemand = useMemo(() => {
    if (!inventoryData?.demandTrend) return 0
    return inventoryData.demandTrend.reduce((sum, p) => sum + p.quantity, 0)
  }, [inventoryData?.demandTrend])

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-muted-foreground" />
      </div>
    )
  }

  const stats: StatCardData[] = [
    {
      label: "Total Revenue",
      value: `$${data.revenue.current.toFixed(2)}`,
      change:
        data.revenue.previous > 0
          ? `${data.revenue.change >= 0 ? "+" : ""}${data.revenue.change.toFixed(1)}% vs previous period`
          : "No previous data",
      trend: data.revenue.trend,
      icon: DollarSign,
    },
    {
      label: "Total Orders",
      value: String(data.orders.current),
      change:
        data.orders.previous > 0
          ? `${data.orders.change >= 0 ? "+" : ""}${data.orders.change.toFixed(1)}% vs previous period`
          : "No previous data",
      trend: data.orders.trend,
      icon: ShoppingCart,
    },
    {
      label: "Pending Orders",
      value: String(data.pendingOrders),
      change: `${data.pendingOrders} require attention`,
      trend: "neutral" as const,
      icon: Clock,
    },
    {
      label: "Active Products",
      value: String(data.activeProducts),
      change: "In stock",
      trend: "neutral" as const,
      icon: Package,
    },
  ]

  // Get period display text based on preset
  const getPeriodText = () => {
    if (selectedPreset === "custom" && dateRange.from && dateRange.to) {
      return `${format(dateRange.from, "MMM d, yyyy")} - ${format(dateRange.to, "MMM d, yyyy")}`
    }
    switch (selectedPreset) {
      case "7d":
        return "Last 7 days"
      case "30d":
        return "Last 30 days"
      case "90d":
        return "Last 90 days"
      case "all":
        return "All time"
      default:
        return dateRange.from && dateRange.to
    ? `${format(dateRange.from, "MMM d, yyyy")} - ${format(dateRange.to, "MMM d, yyyy")}`
    : "Select date range"
    }
  }

  const dateRangeText = getPeriodText()

  return (
    <div className="flex flex-col gap-8 relative">
      {/* Loading overlay when fetching new data */}
      {fetching && (
        <div className="absolute inset-0 bg-background/50 backdrop-blur-sm z-50 flex items-center justify-center rounded-3xl">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Loading data...</span>
          </div>
        </div>
      )}
      
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Your overview</h1>
          <p className="text-sm text-muted-foreground mt-1">{dateRangeText}</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Date Range Picker */}
          <DateRangePicker
            value={dateRange}
            onChange={setDateRange}
            preset={selectedPreset === "custom" ? "30d" : selectedPreset}
            onPresetChange={(preset) => setSelectedPreset(preset)}
          />
          
          {/* Group By Toggle */}
          <div className="inline-flex items-center rounded-xl border border-border bg-white dark:bg-gray-900 shadow-[0_10px_30px_rgba(0,0,0,0.05)] dark:shadow-[0_10px_30px_rgba(0,0,0,0.3)] p-1">
            <button
              onClick={() => setGroupBy("daily")}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                groupBy === "daily"
                  ? "bg-primary text-white shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Daily
            </button>
            <button
              onClick={() => setGroupBy("weekly")}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                groupBy === "weekly"
                  ? "bg-primary text-white shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Weekly
            </button>
            <button
              onClick={() => setGroupBy("monthly")}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                groupBy === "monthly"
                  ? "bg-primary text-white shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Monthly
            </button>
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <section aria-label="Key metrics">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((stat) => (
            <StatCard key={stat.label} stat={stat} />
          ))}
        </div>
      </section>

      {/* Chart */}
      <section aria-label="Performance chart">
        <div className="rounded-3xl bg-white dark:bg-gray-900 shadow-[0_10px_30px_rgba(0,0,0,0.05)] dark:shadow-[0_10px_30px_rgba(0,0,0,0.3)] overflow-hidden">
          <div className="border-b border-border/50 px-6 py-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-foreground">
                  Overview
                </h2>
                <Info className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setSeriesVisibility((v) => ({ ...v, revenue: !v.revenue }))}
                  className={`rounded-xl px-4 py-2 text-sm font-medium transition-all flex items-center gap-2 ${
                    seriesVisibility.revenue
                      ? "bg-[hsl(262,83%,58%)] text-white shadow-md"
                      : "bg-gray-100 dark:bg-gray-800 text-muted-foreground hover:bg-gray-200 dark:hover:bg-gray-700"
                  }`}
                >
                  <span className="h-2 w-2 rounded-full bg-current" />
                  Revenue
                </button>
                <button
                  onClick={() => setSeriesVisibility((v) => ({ ...v, orders: !v.orders }))}
                  className={`rounded-xl px-4 py-2 text-sm font-medium transition-all flex items-center gap-2 ${
                    seriesVisibility.orders
                      ? "bg-[hsl(173,58%,39%)] text-white shadow-md"
                      : "bg-gray-100 dark:bg-gray-800 text-muted-foreground hover:bg-gray-200 dark:hover:bg-gray-700"
                  }`}
                >
                  <span className="h-2 w-2 rounded-full bg-current" />
                  Orders
                </button>
                <button
                  onClick={() => setSeriesVisibility((v) => ({ ...v, demand: !v.demand }))}
                  className={`rounded-xl px-4 py-2 text-sm font-medium transition-all flex items-center gap-2 ${
                    seriesVisibility.demand
                      ? "bg-[hsl(38,92%,50%)] text-white shadow-md"
                      : "bg-gray-100 dark:bg-gray-800 text-muted-foreground hover:bg-gray-200 dark:hover:bg-gray-700"
                  }`}
                >
                  <span className="h-2 w-2 rounded-full bg-current" />
                  Demand
                </button>
              </div>
            </div>
          </div>
          <div className="p-6">
            <div className="mb-4 flex flex-wrap items-baseline gap-6">
              {seriesVisibility.revenue && (
                <div>
                  <p className="text-2xl font-bold text-foreground">
                    ${data.revenue.current.toFixed(2)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">Revenue</p>
                </div>
              )}
              {seriesVisibility.orders && (
                <div>
                  <p className="text-2xl font-bold text-foreground">
                    {data.orders.current}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">Orders</p>
                </div>
              )}
              {seriesVisibility.demand && (
                <div>
                  <p className="text-2xl font-bold text-foreground">
                    {totalDemand.toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">Demand (units)</p>
                </div>
              )}
            </div>
            <DashboardChart
              data={mergedChartData}
              visible={seriesVisibility}
              groupBy={groupBy}
            />
            <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
              <span>Updated just now</span>
              <button className="text-blue-600 dark:text-blue-400 hover:underline">
                More details
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Inventory KPI Cards */}
      {inventoryData && (
        <section aria-label="Inventory metrics">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard
              stat={{
                label: "Customer Demand",
                value: inventoryData.kpis.totalRequiredQuantity.toLocaleString(),
                change: "Total requested quantity",
                trend: "neutral",
                icon: TrendingUp,
              }}
            />
            <StatCard
              stat={{
                label: "Stock on Hand",
                value: inventoryData.kpis.totalStockQuantity.toLocaleString(),
                change: "Current inventory",
                trend: "neutral",
                icon: BarChart3,
              }}
            />
            <StatCard
              stat={{
                label: "Shortage Risk",
                value: inventoryData.kpis.totalShortageQuantity.toLocaleString(),
                change:
                  inventoryData.kpis.totalShortageQuantity > 0
                    ? "Units short of demand"
                    : "Fully stocked",
                trend:
                  inventoryData.kpis.totalShortageQuantity > 0
                    ? "down"
                    : "up",
                icon: AlertTriangle,
              }}
            />
          </div>
        </section>
      )}

      {/* Stock Overview & Demand vs Stock - side by side on large screens */}
      {inventoryData && (
        <section aria-label="Stock and demand charts" className="grid grid-cols-1 gap-8 xl:grid-cols-2">
          <div className="rounded-3xl bg-white dark:bg-gray-900 shadow-[0_10px_30px_rgba(0,0,0,0.05)] dark:shadow-[0_10px_30px_rgba(0,0,0,0.3)] overflow-hidden">
            <div className="border-b border-border/50 px-6 py-5">
              <h2 className="text-base font-semibold text-foreground">
                Stock by Product
              </h2>
            </div>
            <div className="p-6">
              <StockOverviewChart data={inventoryData.stockOverview} />
            </div>
          </div>

          <div className="rounded-3xl bg-white dark:bg-gray-900 shadow-[0_10px_30px_rgba(0,0,0,0.05)] dark:shadow-[0_10px_30px_rgba(0,0,0,0.3)] overflow-hidden">
            <div className="border-b border-border/50 px-6 py-5">
              <h2 className="text-base font-semibold text-foreground">
                Demand vs Stock
              </h2>
            </div>
            <div className="p-6">
              <DemandVsStockChart data={inventoryData.demandVsStock} />
            </div>
          </div>
        </section>
      )}

      {/* Shortage Risk Table - commented out for now, uncomment to re-enable
      {inventoryData && (
        <section aria-label="Shortage risk table">
          <div className="rounded-3xl bg-white dark:bg-gray-900 shadow-[0_10px_30px_rgba(0,0,0,0.05)] dark:shadow-[0_10px_30px_rgba(0,0,0,0.3)] overflow-hidden">
            <div className="border-b border-border/50 px-6 py-5">
              <h2 className="text-base font-semibold text-foreground">
                Shortage Risk
              </h2>
            </div>
            <div className="p-6">
              <ShortageRiskTable rows={inventoryData.shortageRows} />
            </div>
          </div>
        </section>
      )}
      */}

      {/* Recent orders */}
      <RecentOrdersTable orders={recentOrders.map((o) => ({
        ...o,
        status: o.status.charAt(0).toUpperCase() + o.status.slice(1) as "Shipped" | "Processing" | "Delivered" | "Pending"
      }))} />
    </div>
  )
}
