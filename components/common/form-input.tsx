/**
 * FormInput - Reusable input component with consistent styling
 *
 * Provides standardized input styling for forms throughout the application.
 * Supports optional prefix/suffix slots (e.g. a leading search icon, a
 * trailing clear button or unit label).
 */
"use client"

import * as React from 'react'
import { cn } from '@/lib/utils'

export interface FormInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'prefix'> {
  label?: string
  error?: string
  helperText?: string
  /**
   * Decorative or interactive content placed inside the input on the left.
   * Defaults to non-interactive (pointer-events-none) so clicks fall through
   * to the input — typical for icons. Pass `interactivePrefix` to opt out.
   */
  prefix?: React.ReactNode
  /**
   * Content placed inside the input on the right. Interactive by default
   * (e.g. clear button, dropdown chevron). Set `interactiveSuffix={false}`
   * to make it click-through, e.g. for a unit label.
   */
  suffix?: React.ReactNode
  interactivePrefix?: boolean
  interactiveSuffix?: boolean
}

const FormInput = React.forwardRef<HTMLInputElement, FormInputProps>(
  (
    {
      className,
      label,
      error,
      helperText,
      id,
      prefix,
      suffix,
      interactivePrefix = false,
      interactiveSuffix = true,
      ...props
    },
    ref
  ) => {
    // Use React.useId so the generated ID is stable between server and client
    const reactId = React.useId()
    const inputId = id || `input-${reactId}`

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="text-[11px] font-semibold uppercase tracking-wider text-foreground/80"
          >
            {label}
          </label>
        )}
        <div className="relative">
          {prefix && (
            <span
              className={cn(
                'absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground',
                !interactivePrefix && 'pointer-events-none'
              )}
            >
              {prefix}
            </span>
          )}
          <input
            id={inputId}
            ref={ref}
            className={cn(
              'h-12 w-full rounded-xl bg-white dark:bg-gray-900 border border-border/60 dark:border-white/10 shadow-[0_2px_8px_rgba(0,0,0,0.04)] dark:shadow-[0_2px_8px_rgba(0,0,0,0.3)] text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-brand-primary/40 focus:ring-2 focus:ring-brand-primary/20 transition-[box-shadow,border-color]',
              prefix ? 'pl-11' : 'pl-4',
              suffix ? 'pr-11' : 'pr-4',
              error && 'border-destructive ring-2 ring-destructive',
              className
            )}
            {...props}
          />
          {suffix && (
            <span
              className={cn(
                'absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground',
                !interactiveSuffix && 'pointer-events-none'
              )}
            >
              {suffix}
            </span>
          )}
        </div>
        {error && (
          <p className="text-xs text-destructive">{error}</p>
        )}
        {helperText && !error && (
          <p className="text-xs text-muted-foreground/80 leading-snug">{helperText}</p>
        )}
      </div>
    )
  }
)
FormInput.displayName = 'FormInput'

export { FormInput }
