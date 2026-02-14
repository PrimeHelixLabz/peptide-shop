/**
 * FormSelect - Reusable select component with consistent styling
 * 
 * Provides standardized select styling for forms throughout the application
 */

import * as React from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface FormSelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  helperText?: string
  options: Array<{ value: string; label: string }>
}

const FormSelect = React.forwardRef<HTMLSelectElement, FormSelectProps>(
  ({ className, label, error, helperText, id, options, ...props }, ref) => {
    const selectId = id || `select-${Math.random().toString(36).substr(2, 9)}`

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={selectId}
            className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground"
          >
            {label}
          </label>
        )}
        <div className="relative">
          <select
            id={selectId}
            ref={ref}
            className={cn(
              'h-12 w-full appearance-none rounded-xl bg-background border-0 shadow-[0_10px_30px_rgba(0,0,0,0.05)] dark:shadow-[0_10px_30px_rgba(0,0,0,0.3)] pl-4 pr-10 text-sm text-foreground outline-none focus:ring-2 focus:ring-brand-primary/20',
              error && 'ring-2 ring-destructive',
              className
            )}
            {...props}
          >
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        </div>
        {error && (
          <p className="text-xs text-destructive">{error}</p>
        )}
        {helperText && !error && (
          <p className="text-xs text-muted-foreground">{helperText}</p>
        )}
      </div>
    )
  }
)
FormSelect.displayName = 'FormSelect'

export { FormSelect }
