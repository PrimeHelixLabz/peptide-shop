/**
 * StatusBadge - Reusable badge component for status indicators
 * 
 * Provides consistent styling for status badges throughout the application
 */

import * as React from 'react'
import { cn } from '@/lib/utils'

export type StatusVariant = 'success' | 'warning' | 'error' | 'neutral' | 'info'

interface StatusBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: StatusVariant
  children: React.ReactNode
}

const statusVariants: Record<StatusVariant, string> = {
  success: 'bg-gradient-to-r from-brand-primary to-brand-secondary text-brand-primary-foreground',
  warning: 'bg-warning/10 text-warning border border-warning/20',
  error: 'bg-destructive/10 text-destructive border border-destructive/20',
  neutral: 'bg-muted text-muted-foreground',
  info: 'bg-info/10 text-info border border-info/20',
}

const StatusBadge = React.forwardRef<HTMLSpanElement, StatusBadgeProps>(
  ({ className, variant = 'neutral', children, ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={cn(
          'inline-block rounded-xl px-3 py-1 text-xs font-semibold uppercase tracking-wider',
          statusVariants[variant],
          className
        )}
        {...props}
      >
        {children}
      </span>
    )
  }
)
StatusBadge.displayName = 'StatusBadge'

export { StatusBadge, type StatusVariant }
