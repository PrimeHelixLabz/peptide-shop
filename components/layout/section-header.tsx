import { cn } from "@/lib/utils"
import type { ReactNode } from "react"

interface SectionHeaderProps {
  label?: string
  title: string
  description?: string
  action?: ReactNode
  align?: "left" | "center" | "right"
  className?: string
}

export function SectionHeader({
  label,
  title,
  description,
  action,
  align = "left",
  className,
}: SectionHeaderProps) {
  const alignClasses = {
    left: "text-left",
    center: "text-center",
    right: "text-right",
  }

  return (
    <div
      className={cn(
        "flex flex-col gap-3",
        align === "center" && "items-center",
        align === "right" && "items-end",
        className
      )}
    >
      <div className={cn("flex w-full flex-col gap-3", alignClasses[align])}>
        {label && (
          <span className="text-xs font-medium uppercase tracking-[0.3em] text-muted-foreground">
            {label}
          </span>
        )}
        <div className="flex items-end justify-between gap-4">
          <h2 className="text-2xl font-semibold text-foreground md:text-3xl text-balance">
            {title}
          </h2>
          {action && <div className="shrink-0">{action}</div>}
        </div>
        {description && (
          <p
            className={cn(
              "text-base leading-relaxed text-muted-foreground",
              align === "center" && "mx-auto max-w-md",
              align === "left" && "max-w-2xl"
            )}
          >
            {description}
          </p>
        )}
      </div>
    </div>
  )
}
