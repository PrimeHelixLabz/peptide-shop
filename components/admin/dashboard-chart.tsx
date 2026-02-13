"use client"

import { useMemo } from "react"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { Area, AreaChart, CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts"

interface ChartDataPoint {
  date: string
  revenue: number
  orders: number
  previousRevenue?: number
  previousOrders?: number
}

interface DashboardChartProps {
  data: ChartDataPoint[]
  type: "revenue" | "orders"
  groupBy: "daily" | "weekly" | "monthly"
  showComparison?: boolean
}

export function DashboardChart({
  data,
  type,
  groupBy,
  showComparison = true,
}: DashboardChartProps) {
  const chartConfig = {
    revenue: {
      label: "Revenue",
      color: "hsl(262, 83%, 58%)", // Purple like Stripe
    },
    orders: {
      label: "Orders",
      color: "hsl(262, 83%, 58%)",
    },
    previous: {
      label: "Previous period",
      color: "hsl(0, 0%, 70%)", // Gray for comparison
    },
  }

  const chartData = useMemo(() => {
    if (groupBy === "daily") {
      return data.map((point) => ({
        date: new Date(point.date).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
        value: point[type],
        previous: showComparison ? point[`previous${type.charAt(0).toUpperCase() + type.slice(1)}` as keyof ChartDataPoint] : undefined,
      }))
    } else if (groupBy === "weekly") {
      // Group by week
      const weekly: Record<string, { value: number; previous: number }> = {}
      data.forEach((point) => {
        const date = new Date(point.date)
        const weekStart = new Date(date)
        weekStart.setDate(date.getDate() - date.getDay())
        const weekKey = weekStart.toISOString().split("T")[0]
        
        if (!weekly[weekKey]) {
          weekly[weekKey] = { value: 0, previous: 0 }
        }
        weekly[weekKey].value += point[type]
        if (showComparison) {
          const prevKey = `previous${type.charAt(0).toUpperCase() + type.slice(1)}` as keyof ChartDataPoint
          weekly[weekKey].previous += (point[prevKey] as number) || 0
        }
      })

      return Object.entries(weekly).map(([date, values]) => ({
        date: new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        value: values.value,
        previous: showComparison ? values.previous : undefined,
      }))
    } else {
      // Group by month
      const monthly: Record<string, { value: number; previous: number }> = {}
      data.forEach((point) => {
        const date = new Date(point.date)
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
        
        if (!monthly[monthKey]) {
          monthly[monthKey] = { value: 0, previous: 0 }
        }
        monthly[monthKey].value += point[type]
        if (showComparison) {
          const prevKey = `previous${type.charAt(0).toUpperCase() + type.slice(1)}` as keyof ChartDataPoint
          monthly[monthKey].previous += (point[prevKey] as number) || 0
        }
      })

      return Object.entries(monthly).map(([date, values]) => ({
        date: new Date(date + "-01").toLocaleDateString("en-US", { month: "short", year: "numeric" }),
        value: values.value,
        previous: showComparison ? values.previous : undefined,
      }))
    }
  }, [data, type, groupBy, showComparison])

  const config = {
    value: {
      label: chartConfig[type].label,
      color: chartConfig[type].color,
    },
    ...(showComparison && {
      previous: {
        label: chartConfig.previous.label,
        color: chartConfig.previous.color,
      },
    }),
  }

  return (
    <ChartContainer config={config} className="h-[350px] w-full">
      {showComparison && chartData.some((d) => d.previous !== undefined) ? (
        <LineChart data={chartData}>
          <defs>
            <linearGradient id={`fill-${type}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={chartConfig[type].color} stopOpacity={0.3} />
              <stop offset="95%" stopColor={chartConfig[type].color} stopOpacity={0} />
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
          <YAxis
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            className="text-xs text-muted-foreground"
            tickFormatter={(value) => {
              if (type === "revenue") {
                return `$${value.toLocaleString()}`
              }
              return value.toString()
            }}
          />
          <ChartTooltip
            content={<ChartTooltipContent />}
            labelFormatter={(value) => `Date: ${value}`}
          />
          {showComparison && (
            <Line
              type="monotone"
              dataKey="previous"
              stroke={chartConfig.previous.color}
              strokeWidth={1.5}
              strokeDasharray="5 5"
              dot={false}
            />
          )}
          <Line
            type="monotone"
            dataKey="value"
            stroke={chartConfig[type].color}
            strokeWidth={2.5}
            dot={false}
          />
        </LineChart>
      ) : (
        <AreaChart data={chartData}>
          <defs>
            <linearGradient id={`fill-${type}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={chartConfig[type].color} stopOpacity={0.3} />
              <stop offset="95%" stopColor={chartConfig[type].color} stopOpacity={0} />
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
          <YAxis
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            className="text-xs text-muted-foreground"
            tickFormatter={(value) => {
              if (type === "revenue") {
                return `$${value.toLocaleString()}`
              }
              return value.toString()
            }}
          />
          <ChartTooltip
            content={<ChartTooltipContent />}
            labelFormatter={(value) => `Date: ${value}`}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke={chartConfig[type].color}
            fill={`url(#fill-${type})`}
            strokeWidth={2.5}
          />
        </AreaChart>
      )}
    </ChartContainer>
  )
}
