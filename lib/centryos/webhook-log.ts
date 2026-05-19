import { createAdminClient } from "@/lib/supabase/admin"
import type { ProcessingTrace } from "./processing-trace"

export interface CentryOSWebhookLogEntry {
  eventType: string | null
  status: string | null
  orderId: string | null
  paymentLinkId: string | null
  transactionId: string | null
  signatureValid: boolean
  headers: Record<string, string>
  body: unknown
  rawBody: string
  statusCode: number
  error?: string | null
}

/**
 * Persist the raw webhook request. Never throws — a logger failure
 * must not break the webhook handler itself.
 */
export async function logWebhook(entry: CentryOSWebhookLogEntry): Promise<void> {
  try {
    const supabase = createAdminClient()
    const { error } = await supabase.from("centryos_webhook_logs").insert({
      event_type: entry.eventType,
      status: entry.status,
      order_id: entry.orderId,
      payment_link_id: entry.paymentLinkId,
      transaction_id: entry.transactionId,
      signature_valid: entry.signatureValid,
      headers: entry.headers,
      body: entry.body as Record<string, unknown> | null,
      raw_body: entry.rawBody,
      status_code: entry.statusCode,
      error: entry.error ?? null,
    })
    if (error) console.error("CentryOS logWebhook: insert failed", error)
  } catch (err) {
    console.error("CentryOS logWebhook: unexpected failure", err)
  }
}

// ── Processing trace logging ───────────────────────────────────

export type ProcessingOutcome = "applied" | "skipped" | "failed"

export interface ProcessingLogContext {
  eventType: string | null
  status: string | null
  orderId: string | null
  paymentLinkId: string | null
  transactionId: string | null
  outcome: ProcessingOutcome
  reason?: string | null
  error?: string | null
}

/**
 * Persist the post-200 background-processing trace to
 * `centryos_processing_logs`. Never throws.
 */
export async function logProcessingTrace(
  trace: ProcessingTrace,
  ctx: ProcessingLogContext
): Promise<void> {
  try {
    const supabase = createAdminClient()
    const { error } = await supabase.from("centryos_processing_logs").insert({
      event_type: ctx.eventType,
      status: ctx.status,
      order_id: ctx.orderId,
      payment_link_id: ctx.paymentLinkId,
      transaction_id: ctx.transactionId,
      outcome: ctx.outcome,
      reason: ctx.reason ?? null,
      duration_ms: trace.durationMs,
      context: trace.context,
      steps: trace.steps,
      error: ctx.error ?? null,
    })
    if (error) console.error("CentryOS logProcessingTrace: insert failed", error)
  } catch (err) {
    console.error("CentryOS logProcessingTrace: unexpected failure", err)
  }
}

