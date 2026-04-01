"use client"

import { useMemo } from "react"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart"
import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts"
import type {
  StockOverviewPoint,
  DemandVsStockPoint,
} from "@/lib/admin/inventory-analytics"

// ---------------------------------------------------------------------------
// Shared constants
// ---------------------------------------------------------------------------

const MAX_PRODUCTS_DISPLAYED = 15
const MAX_LABEL_LENGTH = 18

const COLORS = {
  demand: "hsl(262, 83%, 58%)", // Purple — matches existing primary
  stock: "hsl(173, 58%, 39%)",  // Teal
} as const

/** Truncate long product names for axis labels, full name shows in tooltip. */
function truncateLabel(name: string): string {
  if (name.length <= MAX_LABEL_LENGTH) return name
  return name.slice(0, MAX_LABEL_LENGTH - 1) + "…"
}

// ---------------------------------------------------------------------------
// Stock Quantity Overview (bar chart)
// ---------------------------------------------------------------------------

interface StockOverviewChartProps {
  data: StockOverviewPoint[]
}

export function StockOverviewChart({ data }: StockOverviewChartProps) {
  const chartData = useMemo(
    () =>
      data.slice(0, MAX_PRODUCTS_DISPLAYED).map((d) => ({
        ...d,
        shortName: truncateLabel(d.productName),
      })),
    [data]
  )

  const config = {
    stockQuantity: { label: "Stock Quantity", color: COLORS.stock },
  }

  if (chartData.length === 0) {
    return <EmptyChart message="No product stock data available" />
  }

  return (
    <ChartContainer config={config} className="h-[350px] w-full">
      <BarChart data={chartData} margin={{ bottom: 20 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" />
        <XAxis
          dataKey="shortName"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          className="text-xs text-muted-foreground"
          interval={0}
          angle={-35}
          textAnchor="end"
          height={80}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          className="text-xs text-muted-foreground"
          allowDecimals={false}
        />
        <ChartTooltip
          content={<ChartTooltipContent nameKey="productName" />}
          labelFormatter={(_v, payload) => {
            const item = payload?.[0]?.payload
            return item?.productName ?? _v
          }}
        />
        <Bar
          dataKey="stockQuantity"
          fill={COLORS.stock}
          radius={[6, 6, 0, 0]}
        />
      </BarChart>
    </ChartContainer>
  )
}

// ---------------------------------------------------------------------------
// Demand vs Stock (grouped bar chart)
// ---------------------------------------------------------------------------

interface DemandVsStockChartProps {
  data: DemandVsStockPoint[]
}

export function DemandVsStockChart({ data }: DemandVsStockChartProps) {
  const chartData = useMemo(
    () =>
      data.slice(0, MAX_PRODUCTS_DISPLAYED).map((d) => ({
        ...d,
        shortName: truncateLabel(d.productName),
      })),
    [data]
  )

  const config = {
    requiredQuantity: { label: "Customer Demand", color: COLORS.demand },
    stockQuantity: { label: "Stock on Hand", color: COLORS.stock },
  }

  if (chartData.length === 0) {
    return <EmptyChart message="No demand or stock data available" />
  }

  return (
    <ChartContainer config={config} className="h-[350px] w-full">
      <BarChart data={chartData} margin={{ bottom: 20 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" />
        <XAxis
          dataKey="shortName"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          className="text-xs text-muted-foreground"
          interval={0}
          angle={-35}
          textAnchor="end"
          height={80}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          className="text-xs text-muted-foreground"
          allowDecimals={false}
        />
        <ChartTooltip
          content={<ChartTooltipContent />}
          labelFormatter={(_v, payload) => {
            const item = payload?.[0]?.payload
            return item?.productName ?? _v
          }}
        />
        <ChartLegend content={<ChartLegendContent />} />
        <Bar
          dataKey="requiredQuantity"
          fill={COLORS.demand}
          radius={[6, 6, 0, 0]}
        />
        <Bar
          dataKey="stockQuantity"
          fill={COLORS.stock}
          radius={[6, 6, 0, 0]}
        />
      </BarChart>
    </ChartContainer>
  )
}

// ---------------------------------------------------------------------------
// Empty state placeholder
// ---------------------------------------------------------------------------

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="flex h-[350px] w-full items-center justify-center">
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  )
}
