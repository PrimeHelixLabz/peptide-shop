import { cn } from "@/lib/utils"
import type { ReactNode } from "react"

interface PageHeaderProps {
  label?: string
  title: string
  description?: string
  align?: "left" | "center"
  className?: string
  children?: ReactNode
}

export function PageHeader({
  label,
  title,
  description,
  align = "left",
  className,
  children,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3",
        align === "center" && "items-center text-center",
        className
      )}
    >
      {label && (
        <span className="text-xs font-medium uppercase tracking-[0.3em] text-muted-foreground">
          {label}
        </span>
      )}
      <h1
        className={cn(
          "text-3xl font-semibold tracking-tight text-foreground md:text-4xl lg:text-5xl text-balance",
          align === "center" && "md:text-5xl lg:text-6xl"
        )}
      >
        {title}
      </h1>
      {description && (
        <p
          className={cn(
            "text-base leading-relaxed text-muted-foreground lg:text-lg",
            align === "center" && "mx-auto max-w-2xl"
          )}
        >
          {description}
        </p>
      )}
      {children}
    </div>
  )
}
