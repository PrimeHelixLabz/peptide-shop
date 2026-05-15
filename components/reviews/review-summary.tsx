import { StarRating } from "./star-rating"

interface ReviewSummaryProps {
  count: number
  average: number
  size?: "sm" | "md" | "lg"
  showCount?: boolean
  className?: string
}

export function ReviewSummary({
  count,
  average,
  size = "sm",
  showCount = true,
  className = "",
}: ReviewSummaryProps) {
  if (count === 0) {
    return null
  }

  return (
    <div className={`inline-flex items-center gap-1.5 ${className}`}>
      <StarRating value={average} size={size} />
      {showCount && (
        <span className="text-xs text-muted-foreground">
          {average.toFixed(1)}
          {" "}({count})
        </span>
      )}
    </div>
  )
}
