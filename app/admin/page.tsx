"use client"

import { useState, useEffect } from "react"
import {
  DollarSign,
  ShoppingCart,
  Clock,
  Package,
  Info,
  Loader2,
} from "lucide-react"
import { StatCard } from "@/components/admin/stat-card"
import type { StatCardData } from "@/components/admin/stat-card"
import { RecentOrdersTable } from "@/components/admin/recent-orders-table"
import { DashboardChart } from "@/components/admin/dashboard-chart"
import { DateRangePicker } from "@/components/admin/date-range-picker"
import { format } from "date-fns"

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

type GroupBy = "daily" | "weekly" | "monthly"

export default function AdminDashboard() {
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>(() => {
    const end = new Date()
    end.setHours(23, 59, 59, 999)
    const start = new Date()
    start.setDate(end.getDate() - 29)
    start.setHours(0, 0, 0, 0)
    return { from: start, to: end }
  })
  const [selectedPreset, setSelectedPreset] = useState<"7d" | "30d" | "90d" | "all" | "custom">("30d")
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
  const [loading, setLoading] = useState(true)
  const [fetching, setFetching] = useState(false)
  const [chartType, setChartType] = useState<"revenue" | "orders">("revenue")

  useEffect(() => {
    if (dateRange.from && dateRange.to) {
      loadDashboardData()
    }
  }, [dateRange, groupBy])

  useEffect(() => {
    loadRecentOrders()
  }, [])

  async function loadDashboardData() {
    if (!dateRange.from || !dateRange.to) return
    
    // Only show full loading on initial load
    if (!data) {
    setLoading(true)
    } else {
      setFetching(true)
    }
    
    try {
      const response = await fetch(
        `/api/admin/stats?start=${dateRange.from.toISOString()}&end=${dateRange.to.toISOString()}`
      )
      if (response.ok) {
        const dashboardData = await response.json()
        setData(dashboardData)
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
                  {chartType === "revenue" ? "Gross volume" : "Orders"}
                </h2>
                <Info className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setChartType("revenue")}
                  className={`rounded-xl px-4 py-2 text-sm font-medium transition-all ${
                    chartType === "revenue"
                      ? "bg-primary text-white shadow-md"
                      : "bg-gray-100 dark:bg-gray-800 text-muted-foreground hover:bg-gray-200 dark:hover:bg-gray-700"
                  }`}
                >
                  Revenue
                </button>
                <button
                  onClick={() => setChartType("orders")}
                  className={`rounded-xl px-4 py-2 text-sm font-medium transition-all ${
                    chartType === "orders"
                      ? "bg-primary text-white shadow-md"
                      : "bg-gray-100 dark:bg-gray-800 text-muted-foreground hover:bg-gray-200 dark:hover:bg-gray-700"
                  }`}
                >
                  Orders
                </button>
              </div>
            </div>
          </div>
          <div className="p-6">
            <div className="mb-4">
              <p className="text-2xl font-bold text-foreground">
                {chartType === "revenue"
                  ? `$${data.revenue.current.toFixed(2)}`
                  : data.orders.current}
              </p>
              {data.revenue.previous > 0 && (
                <p className="text-sm text-muted-foreground mt-1">
                  {chartType === "revenue"
                    ? `${data.revenue.change >= 0 ? "+" : ""}${data.revenue.change.toFixed(1)}% vs previous period`
                    : `${data.orders.change >= 0 ? "+" : ""}${data.orders.change.toFixed(1)}% vs previous period`}
                </p>
              )}
            </div>
            <DashboardChart
              data={data.chartData}
              type={chartType}
              groupBy={groupBy}
              showComparison={true}
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

      {/* Recent orders */}
      <RecentOrdersTable orders={recentOrders.map((o) => ({
        ...o,
        status: o.status.charAt(0).toUpperCase() + o.status.slice(1) as "Shipped" | "Processing" | "Delivered" | "Pending"
      }))} />
    </div>
  )
}
