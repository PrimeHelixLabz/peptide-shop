import { cn } from "@/lib/utils"

interface PriceDisplayProps {
  price: number
  className?: string
  size?: "sm" | "md" | "lg"
  showCurrency?: boolean
}

const sizeClasses = {
  sm: "text-base",
  md: "text-lg",
  lg: "text-xl",
}

export function PriceDisplay({
  price,
  className,
  size = "md",
  showCurrency = true,
}: PriceDisplayProps) {
  return (
    <span
      className={cn(
        "font-semibold text-foreground",
        sizeClasses[size],
        className
      )}
    >
      {showCurrency ? `$${price.toFixed(2)}` : price.toFixed(2)}
    </span>
  )
}
