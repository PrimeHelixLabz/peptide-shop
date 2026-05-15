"use client"

import { useState } from "react"
import { Star } from "lucide-react"

interface StarInputProps {
  value: number
  onChange: (value: number) => void
  disabled?: boolean
  ariaLabel?: string
}

export function StarInput({
  value,
  onChange,
  disabled = false,
  ariaLabel = "Rating",
}: StarInputProps) {
  const [hover, setHover] = useState(0)

  const display = hover || value

  return (
    <div
      className="inline-flex items-center gap-1"
      role="radiogroup"
      aria-label={ariaLabel}
    >
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = n <= display
        return (
          <button
            key={n}
            type="button"
            disabled={disabled}
            role="radio"
            aria-checked={value === n}
            aria-label={`${n} ${n === 1 ? "star" : "stars"}`}
            onClick={() => onChange(n)}
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(0)}
            onFocus={() => setHover(n)}
            onBlur={() => setHover(0)}
            className="rounded-md p-1 transition-transform duration-150 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-amber-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Star
              className={`h-7 w-7 transition-colors ${
                filled
                  ? "fill-amber-400 text-amber-400"
                  : "text-gray-300"
              }`}
            />
          </button>
        )
      })}
      {value > 0 && (
        <span className="ml-2 text-sm text-muted-foreground">
          {value} / 5
        </span>
      )}
    </div>
  )
}
