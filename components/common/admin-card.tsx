/**
 * AdminCard - Reusable card component for admin pages
 * 
 * Provides consistent styling and structure for admin interface cards
 */

import * as React from 'react'
import { cn } from '@/lib/utils'

interface AdminCardProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string
  headerActions?: React.ReactNode
  footer?: React.ReactNode
  /**
   * Drop the inner `p-6` wrapper so flush content (tables, full-bleed lists,
   * components that manage their own padding) can sit edge-to-edge inside the
   * card. Default false — padded.
   */
  flush?: boolean
}

const AdminCard = React.forwardRef<HTMLDivElement, AdminCardProps>(
  ({ className, title, headerActions, footer, flush = false, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'rounded-3xl bg-card text-card-foreground shadow-[0_10px_30px_rgba(0,0,0,0.05)] dark:shadow-[0_10px_30px_rgba(0,0,0,0.3)] overflow-hidden',
          className
        )}
        {...props}
      >
        {(title || headerActions) && (
          <div className="border-b border-border/50 px-6 py-5">
            <div className="flex items-center justify-between">
              {title && (
                <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground">
                  {title}
                </h2>
              )}
              {headerActions && <div>{headerActions}</div>}
            </div>
          </div>
        )}
        {flush ? children : <div className="p-6">{children}</div>}
        {footer && (
          <div className="border-t border-border/50 px-6 py-5">{footer}</div>
        )}
      </div>
    )
  }
)
AdminCard.displayName = 'AdminCard'

export { AdminCard }
