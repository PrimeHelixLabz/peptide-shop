import { cn } from "@/lib/utils"
import type { ReactNode } from "react"

interface SectionProps {
  children: ReactNode
  className?: string
  background?: "default" | "muted" | "white"
  padding?: "none" | "sm" | "md" | "lg"
  id?: string
}

const backgroundClasses = {
  default: "bg-background",
  muted: "bg-[#f6f6f7]",
  white: "bg-white",
}

export function Section({
  children,
  className,
  background = "default",
  padding = "md",
  id,
}: SectionProps) {
  return (
    <section
      id={id}
      className={cn(
        backgroundClasses[background],
        className
      )}
    >
      {children}
    </section>
  )
}
