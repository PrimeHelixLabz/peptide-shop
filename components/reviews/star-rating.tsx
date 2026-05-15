import { Star } from "lucide-react"

interface StarRatingProps {
  value: number
  size?: "sm" | "md" | "lg"
  className?: string
  ariaLabel?: string
}

const SIZE_CLASS = {
  sm: "h-3.5 w-3.5",
  md: "h-4 w-4",
  lg: "h-5 w-5",
} as const

export function StarRating({
  value,
  size = "md",
  className = "",
  ariaLabel,
}: StarRatingProps) {
  const safe = Math.max(0, Math.min(5, value))
  const sizeClass = SIZE_CLASS[size]

  return (
    <div
      className={`inline-flex items-center gap-0.5 ${className}`}
      role="img"
      aria-label={ariaLabel ?? `${safe.toFixed(1)} out of 5 stars`}
    >
      {[0, 1, 2, 3, 4].map((i) => {
        const fillRatio = Math.max(0, Math.min(1, safe - i))
        return (
          <span key={i} className="relative inline-block">
            <Star className={`${sizeClass} text-gray-300`} aria-hidden="true" />
            {fillRatio > 0 && (
              <span
                className="absolute inset-0 overflow-hidden"
                style={{ width: `${fillRatio * 100}%` }}
                aria-hidden="true"
              >
                <Star
                  className={`${sizeClass} fill-amber-400 text-amber-400`}
                />
              </span>
            )}
          </span>
        )
      })}
    </div>
  )
}
