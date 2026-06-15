"use client"

import { useMemo } from "react"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { parseDayKey, formatDayKey } from "@/lib/admin/date-tz"

interface ChartDataPoint {
  date: string
  revenue: number
  orders: number
  demand?: number
  previousRevenue?: number
  previousOrders?: number
}

export type SeriesVisibility = {
  revenue: boolean
  orders: boolean
  demand: boolean
}

interface DashboardChartProps {
  data: ChartDataPoint[]
  visible: SeriesVisibility
  groupBy: "daily" | "weekly" | "monthly"
}

const SERIES_COLORS = {
  revenue: "hsl(262, 83%, 58%)",  // Purple
  orders: "hsl(173, 58%, 39%)",   // Teal
  demand: "hsl(38, 92%, 50%)",    // Amber
} as const

export function DashboardChart({
  data,
  visible,
  groupBy,
}: DashboardChartProps) {
  const chartData = useMemo(() => {
    // point.date is a "YYYY-MM-DD" key already in the admin's tz. Parse it via
    // parseDayKey (local midnight) rather than `new Date(str)` so the label
    // doesn't drift a day earlier in negative-offset zones.
    if (groupBy === "daily") {
      return data.map((point) => ({
        date: parseDayKey(point.date).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
        revenue: point.revenue,
        orders: point.orders,
        demand: point.demand ?? 0,
      }))
    }

    const buckets: Record<string, { revenue: number; orders: number; demand: number }> = {}

    data.forEach((point) => {
      const d = parseDayKey(point.date)
      let key: string

      if (groupBy === "weekly") {
        const weekStart = new Date(d)
        weekStart.setDate(d.getDate() - d.getDay())
        key = formatDayKey(weekStart)
      } else {
        key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
      }

      if (!buckets[key]) {
        buckets[key] = { revenue: 0, orders: 0, demand: 0 }
      }
      buckets[key].revenue += point.revenue
      buckets[key].orders += point.orders
      buckets[key].demand += point.demand ?? 0
    })

    return Object.entries(buckets).map(([key, values]) => ({
      date:
        groupBy === "weekly"
          ? parseDayKey(key).toLocaleDateString("en-US", { month: "short", day: "numeric" })
          : parseDayKey(key + "-01").toLocaleDateString("en-US", { month: "short", year: "numeric" }),
      ...values,
    }))
  }, [data, groupBy])

  const config = {
    ...(visible.revenue && {
      revenue: { label: "Revenue", color: SERIES_COLORS.revenue },
    }),
    ...(visible.orders && {
      orders: { label: "Orders", color: SERIES_COLORS.orders },
    }),
    ...(visible.demand && {
      demand: { label: "Customer Demand", color: SERIES_COLORS.demand },
    }),
  }

  // Revenue uses a separate right Y-axis (dollars) while orders/demand share the left axis (counts).
  // If only revenue is visible we put it on the left axis instead.
  const showRightAxis = visible.revenue && (visible.orders || visible.demand)

  return (
    <ChartContainer config={config} className="h-[350px] w-full">
      <AreaChart data={chartData}>
        <defs>
          <linearGradient id="fill-revenue" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={SERIES_COLORS.revenue} stopOpacity={0.3} />
            <stop offset="95%" stopColor={SERIES_COLORS.revenue} stopOpacity={0} />
          </linearGradient>
          <linearGradient id="fill-orders" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={SERIES_COLORS.orders} stopOpacity={0.3} />
            <stop offset="95%" stopColor={SERIES_COLORS.orders} stopOpacity={0} />
          </linearGradient>
          <linearGradient id="fill-demand" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={SERIES_COLORS.demand} stopOpacity={0.3} />
            <stop offset="95%" stopColor={SERIES_COLORS.demand} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" />
        <XAxis
          dataKey="date"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          className="text-xs text-muted-foreground"
        />

        {/* Left Y-axis: counts (orders/demand) or revenue when it's the only series */}
        <YAxis
          yAxisId="left"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          className="text-xs text-muted-foreground"
          allowDecimals={false}
          tickFormatter={(value) => {
            if (!showRightAxis && visible.revenue) {
              return `$${value.toLocaleString()}`
            }
            return value.toLocaleString()
          }}
        />

        {/* Right Y-axis: revenue (only when other series are also visible) */}
        {showRightAxis && (
          <YAxis
            yAxisId="right"
            orientation="right"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            className="text-xs text-muted-foreground"
            tickFormatter={(value) => `$${value.toLocaleString()}`}
          />
        )}

        <ChartTooltip
          content={<ChartTooltipContent />}
          labelFormatter={(value) => `Date: ${value}`}
        />

        {visible.revenue && (
          <Area
            type="monotone"
            dataKey="revenue"
            yAxisId={showRightAxis ? "right" : "left"}
            stroke={SERIES_COLORS.revenue}
            fill="url(#fill-revenue)"
            strokeWidth={2.5}
          />
        )}
        {visible.orders && (
          <Area
            type="monotone"
            dataKey="orders"
            yAxisId="left"
            stroke={SERIES_COLORS.orders}
            fill="url(#fill-orders)"
            strokeWidth={2.5}
          />
        )}
        {visible.demand && (
          <Area
            type="monotone"
            dataKey="demand"
            yAxisId="left"
            stroke={SERIES_COLORS.demand}
            fill="url(#fill-demand)"
            strokeWidth={2.5}
          />
        )}
      </AreaChart>
    </ChartContainer>
  )
}
