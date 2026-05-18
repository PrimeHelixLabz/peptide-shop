/**
 * Structured logger + error capture shim.
 *
 * Designed to be wired to Sentry without code changes. The Sentry SDK isn't
 * a hard dependency: if `@sentry/nextjs` is installed AND `SENTRY_DSN` is set,
 * `captureError`/`captureMessage` forward there. Otherwise they fall back to
 * console output with structured context.
 *
 * Use these instead of `console.error(...)` for anything that should reach
 * an operator. The signal-to-noise ratio in console.* is poor under load.
 *
 * Install Sentry later with:
 *   pnpm add @sentry/nextjs
 *   pnpm dlx @sentry/wizard@latest -i nextjs
 * Then set SENTRY_DSN in your environment. No changes to call sites required.
 */

import { env } from "@/lib/env"

type LogLevel = "debug" | "info" | "warn" | "error"

interface LogContext {
  [key: string]: unknown
}

// Resolved lazily so the @sentry/nextjs import doesn't break builds when the
// package isn't installed yet.
type SentryShape = {
  captureException: (err: unknown, ctx?: { extra?: LogContext; tags?: Record<string, string> }) => void
  captureMessage: (msg: string, ctx?: { level?: LogLevel; extra?: LogContext; tags?: Record<string, string> }) => void
}

let sentryPromise: Promise<SentryShape | null> | null = null

function loadSentry(): Promise<SentryShape | null> {
  if (sentryPromise) return sentryPromise
  if (!env.SENTRY_DSN) {
    sentryPromise = Promise.resolve(null)
    return sentryPromise
  }
  sentryPromise = import("@sentry/nextjs" as string)
    .then((m) => m as unknown as SentryShape)
    .catch(() => {
      // Sentry env var set but package missing — log once and degrade.
      console.warn(
        "[observability] SENTRY_DSN is set but @sentry/nextjs is not installed; falling back to console."
      )
      return null
    })
  return sentryPromise
}

function formatConsole(level: LogLevel, message: string, ctx?: LogContext) {
  const line = ctx ? `${message} ${JSON.stringify(ctx)}` : message
  switch (level) {
    case "debug":
      console.debug(`[debug] ${line}`)
      return
    case "info":
      console.info(`[info] ${line}`)
      return
    case "warn":
      console.warn(`[warn] ${line}`)
      return
    case "error":
      console.error(`[error] ${line}`)
      return
  }
}

export async function captureError(
  err: unknown,
  ctx?: { extra?: LogContext; tags?: Record<string, string> }
): Promise<void> {
  const sentry = await loadSentry()
  if (sentry) {
    sentry.captureException(err, ctx)
    return
  }
  const message =
    err instanceof Error
      ? `${err.name}: ${err.message}`
      : `Non-error thrown: ${String(err)}`
  formatConsole("error", message, {
    ...(ctx?.extra ?? {}),
    ...(ctx?.tags ?? {}),
    stack: err instanceof Error ? err.stack : undefined,
  })
}

export async function captureMessage(
  message: string,
  ctx?: { level?: LogLevel; extra?: LogContext; tags?: Record<string, string> }
): Promise<void> {
  const sentry = await loadSentry()
  if (sentry) {
    sentry.captureMessage(message, ctx)
    return
  }
  formatConsole(ctx?.level ?? "info", message, {
    ...(ctx?.extra ?? {}),
    ...(ctx?.tags ?? {}),
  })
}

/**
 * Fire-and-forget helper for hot paths where awaiting the logger would add
 * latency to a user response. Errors during capture are swallowed so the
 * caller's response path is never affected by observability failures.
 */
export function captureErrorAsync(
  err: unknown,
  ctx?: { extra?: LogContext; tags?: Record<string, string> }
): void {
  captureError(err, ctx).catch(() => {
    /* swallow */
  })
}
