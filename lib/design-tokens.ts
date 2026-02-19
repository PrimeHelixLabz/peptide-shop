/**
 * Design Tokens
 * 
 * Centralized design system tokens for colors, spacing, shadows, etc.
 * Use these tokens instead of hard-coding values throughout the codebase.
 */

export const designTokens = {
  colors: {
    // Brand colors - use these instead of hard-coded colors
    brand: {
      primary: 'hsl(var(--brand-primary))',
      primaryForeground: 'hsl(var(--brand-primary-foreground))',
      secondary: 'hsl(var(--brand-secondary))',
      secondaryForeground: 'hsl(var(--brand-secondary-foreground))',
    },
    // Status colors
    status: {
      success: 'hsl(var(--success))',
      successForeground: 'hsl(var(--success-foreground))',
      warning: 'hsl(var(--warning))',
      warningForeground: 'hsl(var(--warning-foreground))',
      error: 'hsl(var(--destructive))',
      errorForeground: 'hsl(var(--destructive-foreground))',
      info: 'hsl(var(--info))',
      infoForeground: 'hsl(var(--info-foreground))',
    },
  },
  shadows: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    default: '0 10px 30px rgba(0, 0, 0, 0.05)',
    md: '0 20px 40px rgba(0, 0, 0, 0.08)',
    lg: '0 20px 40px rgba(0, 0, 0, 0.15)',
    dark: '0 10px 30px rgba(0, 0, 0, 0.3)',
  },
  borderRadius: {
    sm: 'calc(var(--radius) - 6px)',
    md: 'calc(var(--radius) - 4px)',
    lg: 'var(--radius)',
    xl: 'calc(var(--radius) + 0.25rem)',
    '2xl': 'calc(var(--radius) + 0.5rem)',
    '3xl': 'calc(var(--radius) + 0.75rem)',
  },
  spacing: {
    cardPadding: 'p-6',
    cardGap: 'gap-6',
  },
} as const

/**
 * CSS class utilities for common patterns
 */
export const designClasses = {
  // Card styles
  card: {
    base: 'rounded-3xl bg-card text-card-foreground shadow-[0_10px_30px_rgba(0,0,0,0.05)] dark:shadow-[0_10px_30px_rgba(0,0,0,0.3)]',
    header: 'border-b border-border/50 px-6 py-5',
    content: 'p-6',
  },
  // Button styles
  button: {
    primary: 'bg-gradient-to-r from-brand-primary to-brand-secondary text-brand-primary-foreground shadow-[0_10px_30px_rgba(0,0,0,0.1)] hover:shadow-[0_20px_40px_rgba(0,0,0,0.15)] hover:scale-105',
    secondary: 'border border-border bg-background hover:bg-accent hover:text-accent-foreground',
    destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
  },
  // Input styles
  input: {
    base: 'h-12 w-full rounded-xl bg-background border-0 shadow-[0_10px_30px_rgba(0,0,0,0.05)] dark:shadow-[0_10px_30px_rgba(0,0,0,0.3)] px-4 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-brand-primary/20 transition-shadow',
  },
  // Badge styles
  badge: {
    success: 'bg-gradient-to-r from-brand-primary to-brand-secondary text-brand-primary-foreground',
    neutral: 'bg-muted text-muted-foreground',
    warning: 'bg-warning/10 text-warning border border-warning/20',
    error: 'bg-destructive/10 text-destructive border border-destructive/20',
  },
} as const
