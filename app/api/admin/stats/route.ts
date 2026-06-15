import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { requireAdminMiddleware } from "@/lib/auth/middleware"
import { dayKeyInTz, eachDayKey } from "@/lib/admin/date-tz"

type Duration = "7d" | "30d" | "90d" | "1y" | "all"

function getDateRange(duration: Duration): { start: Date; end: Date } {
  const end = new Date()
  const start = new Date()

  switch (duration) {
    case "7d":
      start.setDate(end.getDate() - 7)
      break
    case "30d":
      start.setDate(end.getDate() - 30)
      break
    case "90d":
      start.setDate(end.getDate() - 90)
      break
    case "1y":
      start.setFullYear(end.getFullYear() - 1)
      break
    case "all":
      start.setFullYear(2020) // Arbitrary old date
      break
  }

  return { start, end }
}

function getPreviousPeriod(start: Date, end: Date): { start: Date; end: Date } {
  const duration = end.getTime() - start.getTime()
  return {
    start: new Date(start.getTime() - duration),
    end: start,
  }
}

export const GET = requireAdminMiddleware(async (req) => {
  try {
    const { createClient } = await import("@/lib/supabase/server")
    const supabase = await createClient()
    const { searchParams } = new URL(req.url)

    // Admin's browser timezone — calendar-day bucketing is done in this tz so
    // an order placed late in the evening lands on the day the admin sees it.
    const tz = searchParams.get("tz") || "UTC"

    // Support both old duration param and new date range params
    const startParam = searchParams.get("start")
    const endParam = searchParams.get("end")
    
    let start: Date
    let end: Date
    
    if (startParam && endParam) {
      start = new Date(startParam)
      end = new Date(endParam)
    } else {
      const duration = (searchParams.get("duration") || "30d") as Duration
      const range = getDateRange(duration)
      start = range.start
      end = range.end
    }

    const previousPeriod = getPreviousPeriod(start, end)

    // Get orders for current period
    const { data: ordersData, error: ordersError } = await supabase
      .from("orders")
      .select("total, status, payment_status, created_at")
      .gte("created_at", start.toISOString())
      .lte("created_at", end.toISOString())
      .order("created_at", { ascending: true })

    if (ordersError) {
      console.error("Error fetching orders:", ordersError)
      return NextResponse.json({ error: "Failed to fetch orders" }, { status: 500 })
    }

    // Get orders for previous period
    const { data: previousOrdersData } = await supabase
      .from("orders")
      .select("total, status, payment_status, created_at")
      .gte("created_at", previousPeriod.start.toISOString())
      .lt("created_at", previousPeriod.end.toISOString())

    const orders = ordersData || []
    const previousOrders = previousOrdersData || []

    // Calculate revenue
    const revenue = orders
      .filter((o: any) => o.payment_status === "paid" || o.status === "delivered")
      .reduce((sum: number, o: any) => sum + parseFloat(o.total || "0"), 0)

    const previousRevenue = previousOrders
      .filter((o: any) => o.payment_status === "paid" || o.status === "delivered")
      .reduce((sum: number, o: any) => sum + parseFloat(o.total || "0"), 0)

    const revenueChange =
      previousRevenue > 0 ? ((revenue - previousRevenue) / previousRevenue) * 100 : 0

    // Calculate orders count
    const ordersCount = orders.length
    const previousOrdersCount = previousOrders.length
    const ordersChange =
      previousOrdersCount > 0
        ? ((ordersCount - previousOrdersCount) / previousOrdersCount) * 100
        : 0

    // Calculate daily revenue for chart (current period), bucketed by tz day
    const dailyRevenue: Record<string, number> = {}
    orders
      .filter((o: any) => o.payment_status === "paid" || o.status === "delivered")
      .forEach((o: any) => {
        const date = dayKeyInTz(o.created_at, tz)
        dailyRevenue[date] = (dailyRevenue[date] || 0) + parseFloat(o.total || "0")
      })

    // Calculate daily orders for chart (current period)
    const dailyOrders: Record<string, number> = {}
    orders.forEach((o: any) => {
      const date = dayKeyInTz(o.created_at, tz)
      dailyOrders[date] = (dailyOrders[date] || 0) + 1
    })

    // Calculate daily revenue for previous period
    const previousDailyRevenue: Record<string, number> = {}
    previousOrders
      .filter((o: any) => o.payment_status === "paid" || o.status === "delivered")
      .forEach((o: any) => {
        const date = dayKeyInTz(o.created_at, tz)
        previousDailyRevenue[date] = (previousDailyRevenue[date] || 0) + parseFloat(o.total || "0")
      })

    // Calculate daily orders for previous period
    const previousDailyOrders: Record<string, number> = {}
    previousOrders.forEach((o: any) => {
      const date = dayKeyInTz(o.created_at, tz)
      previousDailyOrders[date] = (previousDailyOrders[date] || 0) + 1
    })

    // Generate chart data points with comparison. Axis days are the calendar
    // days (in the admin's tz) spanning the selected window; each current day
    // is compared to the previous-period day at the same offset.
    const dayKeys = eachDayKey(dayKeyInTz(start, tz), dayKeyInTz(end, tz))
    const previousDayKeys = eachDayKey(
      dayKeyInTz(previousPeriod.start, tz),
      dayKeyInTz(previousPeriod.end, tz)
    )

    const chartData = dayKeys.map((dateStr, i) => {
      const previousDateStr = previousDayKeys[i]
      return {
        date: dateStr,
        revenue: dailyRevenue[dateStr] || 0,
        orders: dailyOrders[dateStr] || 0,
        previousRevenue: previousDateStr ? previousDailyRevenue[previousDateStr] || 0 : 0,
        previousOrders: previousDateStr ? previousDailyOrders[previousDateStr] || 0 : 0,
      }
    })

    // Get pending orders
    const pendingOrders = orders.filter(
      (o: any) => o.status === "pending" || o.status === "processing"
    ).length

    // Get products count
    const { data: productsData } = await supabase
      .from("products")
      .select("id, in_stock")
      .eq("in_stock", true)

    const activeProducts = productsData?.length || 0

    return NextResponse.json({
      revenue: {
        current: revenue,
        previous: previousRevenue,
        change: revenueChange,
        trend: revenueChange >= 0 ? "up" : "down",
      },
      orders: {
        current: ordersCount,
        previous: previousOrdersCount,
        change: ordersChange,
        trend: ordersChange >= 0 ? "up" : "down",
      },
      pendingOrders,
      activeProducts,
      chartData,
      period: {
        start: start.toISOString(),
        end: end.toISOString(),
        previousStart: previousPeriod.start.toISOString(),
        previousEnd: previousPeriod.end.toISOString(),
      },
    })
  } catch (error) {
    console.error("Get admin stats error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
})
