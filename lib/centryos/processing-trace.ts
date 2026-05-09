/**
 * Step-by-step recorder for CentryOS webhook background processing.
 *
 * The webhook handler returns 200 quickly (so CentryOS stops retrying)
 * and runs business logic in `after()`. Without instrumentation, those
 * steps are invisible — silent failures only show up in console logs
 * that are easy to miss. The trace captures each step with timing so
 * the post-processing email + DB row can show exactly what happened.
 *
 * Pass an instance into `applyCollectionWebhook` and helpers; record
 * key transitions; serialize to JSON at the end for storage / email.
 */

export interface TraceStep {
  /** Milliseconds since trace start. */
  at: number
  name: string
  ok: boolean
  detail?: Record<string, unknown>
  error?: string
}

export class ProcessingTrace {
  readonly startedAt = Date.now()
  readonly steps: TraceStep[] = []
  readonly context: Record<string, unknown> = {}

  /** Attach a top-level context value (orderId, paymentLinkId, …). */
  attach(key: string, value: unknown): void {
    if (value === undefined || value === null) return
    this.context[key] = value
  }

  /** Record a discrete step. `error` is normalized to a string. */
  step(
    name: string,
    ok: boolean,
    detail?: Record<string, unknown>,
    error?: unknown
  ): void {
    this.steps.push({
      at: Date.now() - this.startedAt,
      name,
      ok,
      detail,
      error:
        error instanceof Error
          ? error.message
          : error
            ? String(error)
            : undefined,
    })
  }

  get durationMs(): number {
    return Date.now() - this.startedAt
  }

  toJSON() {
    return {
      durationMs: this.durationMs,
      context: this.context,
      steps: this.steps,
    }
  }
}
