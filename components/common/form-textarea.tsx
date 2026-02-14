/**
 * FormTextarea - Reusable textarea component with consistent styling
 * 
 * Provides standardized textarea styling for forms throughout the application
 */

import * as React from 'react'
import { cn } from '@/lib/utils'

export interface FormTextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  helperText?: string
}

const FormTextarea = React.forwardRef<HTMLTextAreaElement, FormTextareaProps>(
  ({ className, label, error, helperText, id, ...props }, ref) => {
    const textareaId = id || `textarea-${Math.random().toString(36).substr(2, 9)}`

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={textareaId}
            className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground"
          >
            {label}
          </label>
        )}
        <textarea
          id={textareaId}
          ref={ref}
          className={cn(
            'w-full resize-none rounded-xl bg-background border-0 shadow-[0_10px_30px_rgba(0,0,0,0.05)] dark:shadow-[0_10px_30px_rgba(0,0,0,0.3)] px-4 py-3 text-sm leading-relaxed text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-brand-primary/20 transition-shadow',
            error && 'ring-2 ring-destructive',
            className
          )}
          {...props}
        />
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
FormTextarea.displayName = 'FormTextarea'

export { FormTextarea }
