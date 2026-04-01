"use client"

import type { ShortageRow } from "@/lib/admin/inventory-analytics"

interface ShortageRiskTableProps {
  rows: ShortageRow[]
}

export function ShortageRiskTable({ rows }: ShortageRiskTableProps) {
  if (rows.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-sm text-muted-foreground">
          No shortage data available for this period
        </p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-border/50 text-xs font-medium uppercase tracking-widest text-muted-foreground">
            <th className="py-3 pr-4">Product</th>
            <th className="py-3 px-4 text-right">Demand</th>
            <th className="py-3 px-4 text-right">Stock</th>
            <th className="py-3 pl-4 text-right">Shortage</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.productId}
              className="border-b border-border/30 last:border-0"
            >
              <td className="py-3 pr-4 font-medium text-foreground">
                {row.productName}
              </td>
              <td className="py-3 px-4 text-right tabular-nums text-foreground">
                {row.requiredQuantity.toLocaleString()}
              </td>
              <td className="py-3 px-4 text-right tabular-nums text-foreground">
                {row.stockQuantity.toLocaleString()}
              </td>
              <td className="py-3 pl-4 text-right tabular-nums">
                <span
                  className={
                    row.shortageQuantity > 0
                      ? "font-semibold text-destructive"
                      : "text-foreground"
                  }
                >
                  {row.shortageQuantity > 0
                    ? `-${row.shortageQuantity.toLocaleString()}`
                    : "0"}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
