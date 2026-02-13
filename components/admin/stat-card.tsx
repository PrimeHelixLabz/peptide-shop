import type { LucideIcon } from "lucide-react"

export interface StatCardData {
  label: string
  value: string
  change?: string
  trend?: "up" | "down" | "neutral"
  icon: LucideIcon
}

export function StatCard({ stat }: { stat: StatCardData }) {
  const Icon = stat.icon

  const trendColor =
    stat.trend === "up"
      ? "text-foreground"
      : stat.trend === "down"
        ? "text-destructive"
        : "text-muted-foreground"

  return (
    <div className="flex flex-col gap-4 rounded-3xl bg-white dark:bg-gray-900 p-6 shadow-[0_10px_30px_rgba(0,0,0,0.05)] dark:shadow-[0_10px_30px_rgba(0,0,0,0.3)] transition-all duration-300 hover:shadow-[0_20px_40px_rgba(0,0,0,0.08)] dark:hover:shadow-[0_20px_40px_rgba(0,0,0,0.4)]">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
          {stat.label}
        </span>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-r from-emerald-500/10 to-green-600/10">
          <Icon className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-2xl font-semibold tracking-tight text-foreground">
          {stat.value}
        </span>
        {stat.change && (
          <span className={`text-xs font-medium ${trendColor}`}>
            {stat.change}
          </span>
        )}
      </div>
    </div>
  )
}
