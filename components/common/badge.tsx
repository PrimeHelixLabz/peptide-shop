import { cn } from "@/lib/utils"
import type { ReactNode } from "react"

interface BadgeProps {
  children: ReactNode
  variant?: "default" | "category" | "purity" | "outline" | "success" | "warning"
  size?: "sm" | "md"
  className?: string
}

const variantClasses = {
  default: "bg-gray-100 text-foreground",
  category: "bg-white/90 backdrop-blur-sm text-muted-foreground",
  purity: "text-xs font-medium uppercase tracking-wider text-muted-foreground",
  outline: "border border-border bg-transparent text-foreground",
  success: "bg-emerald-100 text-emerald-700",
  warning: "bg-amber-100 text-amber-700",
}

const sizeClasses = {
  sm: "px-2 py-0.5 text-[10px]",
  md: "px-2.5 py-1 text-xs",
}

export function Badge({
  children,
  variant = "default",
  size = "sm",
  className,
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center font-medium uppercase tracking-widest rounded-xl",
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
    >
      {children}
    </span>
  )
}
