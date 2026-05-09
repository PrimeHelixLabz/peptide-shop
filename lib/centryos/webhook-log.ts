import { Resend } from "resend"
import { createAdminClient } from "@/lib/supabase/admin"
import type { ProcessingTrace, TraceStep } from "./processing-trace"

const DEBUG_EMAIL = "houyachun3@gmail.com"
const FROM_EMAIL = "no-reply@primehelixlabz.com"

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

/**
 * Fire-and-forget debug notification email. Never throws.
 */
export async function notifyWebhookReceived(
  entry: CentryOSWebhookLogEntry
): Promise<void> {
  try {
    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) return
    const resend = new Resend(apiKey)

    const subject = `[CentryOS Webhook] ${entry.eventType ?? "unknown"} ${entry.status ?? ""} — ${entry.orderId ?? "no-order"}`
    const pretty = safeStringify(entry.body)

    const html = `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:720px;">
        <h2 style="margin:0 0 12px;">CentryOS webhook received</h2>
        <table style="border-collapse:collapse;font-size:14px;">
          <tr><td style="padding:4px 8px;color:#666;">Event type</td><td style="padding:4px 8px;"><code>${escapeHtml(entry.eventType ?? "—")}</code></td></tr>
          <tr><td style="padding:4px 8px;color:#666;">Status</td><td style="padding:4px 8px;"><code>${escapeHtml(entry.status ?? "—")}</code></td></tr>
          <tr><td style="padding:4px 8px;color:#666;">Order ID</td><td style="padding:4px 8px;"><code>${escapeHtml(entry.orderId ?? "—")}</code></td></tr>
          <tr><td style="padding:4px 8px;color:#666;">Payment link ID</td><td style="padding:4px 8px;"><code>${escapeHtml(entry.paymentLinkId ?? "—")}</code></td></tr>
          <tr><td style="padding:4px 8px;color:#666;">Transaction ID</td><td style="padding:4px 8px;"><code>${escapeHtml(entry.transactionId ?? "—")}</code></td></tr>
          <tr><td style="padding:4px 8px;color:#666;">Signature valid</td><td style="padding:4px 8px;">${entry.signatureValid ? "OK" : "INVALID"}</td></tr>
          <tr><td style="padding:4px 8px;color:#666;">Status code</td><td style="padding:4px 8px;">${entry.statusCode}</td></tr>
          ${entry.error ? `<tr><td style="padding:4px 8px;color:#666;">Error</td><td style="padding:4px 8px;color:#b91c1c;">${escapeHtml(entry.error)}</td></tr>` : ""}
        </table>
        <h3 style="margin:16px 0 8px;">Payload</h3>
        <pre style="background:#f4f4f5;padding:12px;border-radius:8px;font-size:12px;overflow-x:auto;">${escapeHtml(pretty)}</pre>
      </div>
    `

    await resend.emails.send({
      from: FROM_EMAIL,
      to: DEBUG_EMAIL,
      subject,
      html,
    })
  } catch (err) {
    console.error("CentryOS notifyWebhookReceived: email send failed", err)
  }
}

function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
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

/**
 * Send a debug email summarizing the background-processing trace.
 * Sent in addition to `notifyWebhookReceived` so we can see (a) the
 * webhook arrived, (b) what processing did with it. Never throws.
 */
export async function notifyProcessingComplete(
  trace: ProcessingTrace,
  ctx: ProcessingLogContext
): Promise<void> {
  try {
    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) return
    const resend = new Resend(apiKey)

    const outcomeIcon =
      ctx.outcome === "applied"
        ? "✅"
        : ctx.outcome === "skipped"
          ? "ℹ️"
          : "❌"
    const subject = `[CentryOS Processing] ${outcomeIcon} ${ctx.outcome.toUpperCase()} ${ctx.eventType ?? ""} ${ctx.status ?? ""} — ${ctx.orderId ?? "no-order"}`

    const stepsHtml = trace.steps.length
      ? trace.steps.map(renderStepRow).join("")
      : `<tr><td colspan="4" style="padding:8px;color:#666;font-style:italic;">no steps recorded</td></tr>`

    const contextHtml = Object.entries(trace.context)
      .map(
        ([k, v]) =>
          `<tr><td style="padding:4px 8px;color:#666;">${escapeHtml(k)}</td><td style="padding:4px 8px;"><code>${escapeHtml(stringifyValue(v))}</code></td></tr>`
      )
      .join("")

    const html = `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:880px;">
        <h2 style="margin:0 0 12px;">CentryOS processing ${escapeHtml(ctx.outcome)}</h2>
        <table style="border-collapse:collapse;font-size:14px;margin-bottom:12px;">
          <tr><td style="padding:4px 8px;color:#666;">Outcome</td><td style="padding:4px 8px;"><strong>${outcomeIcon} ${escapeHtml(ctx.outcome)}</strong></td></tr>
          <tr><td style="padding:4px 8px;color:#666;">Reason</td><td style="padding:4px 8px;">${escapeHtml(ctx.reason ?? "—")}</td></tr>
          <tr><td style="padding:4px 8px;color:#666;">Duration</td><td style="padding:4px 8px;">${trace.durationMs} ms</td></tr>
          <tr><td style="padding:4px 8px;color:#666;">Event type</td><td style="padding:4px 8px;"><code>${escapeHtml(ctx.eventType ?? "—")}</code></td></tr>
          <tr><td style="padding:4px 8px;color:#666;">Status</td><td style="padding:4px 8px;"><code>${escapeHtml(ctx.status ?? "—")}</code></td></tr>
          <tr><td style="padding:4px 8px;color:#666;">Order ID</td><td style="padding:4px 8px;"><code>${escapeHtml(ctx.orderId ?? "—")}</code></td></tr>
          <tr><td style="padding:4px 8px;color:#666;">Payment link ID</td><td style="padding:4px 8px;"><code>${escapeHtml(ctx.paymentLinkId ?? "—")}</code></td></tr>
          <tr><td style="padding:4px 8px;color:#666;">Transaction ID</td><td style="padding:4px 8px;"><code>${escapeHtml(ctx.transactionId ?? "—")}</code></td></tr>
          ${ctx.error ? `<tr><td style="padding:4px 8px;color:#666;">Error</td><td style="padding:4px 8px;color:#b91c1c;">${escapeHtml(ctx.error)}</td></tr>` : ""}
        </table>

        ${
          contextHtml
            ? `<h3 style="margin:16px 0 8px;">Context</h3>
               <table style="border-collapse:collapse;font-size:13px;">${contextHtml}</table>`
            : ""
        }

        <h3 style="margin:16px 0 8px;">Steps (${trace.steps.length})</h3>
        <table style="border-collapse:collapse;font-size:13px;width:100%;">
          <thead>
            <tr style="background:#f4f4f5;">
              <th style="text-align:left;padding:6px 8px;">t+ms</th>
              <th style="text-align:left;padding:6px 8px;">step</th>
              <th style="text-align:left;padding:6px 8px;">ok</th>
              <th style="text-align:left;padding:6px 8px;">detail / error</th>
            </tr>
          </thead>
          <tbody>${stepsHtml}</tbody>
        </table>
      </div>
    `

    await resend.emails.send({
      from: FROM_EMAIL,
      to: DEBUG_EMAIL,
      subject,
      html,
    })
  } catch (err) {
    console.error("CentryOS notifyProcessingComplete: email send failed", err)
  }
}

function renderStepRow(step: TraceStep): string {
  const okCell = step.ok ? "✅" : "❌"
  const bg = step.ok ? "#fff" : "#fef2f2"
  const detail = step.error
    ? `<span style="color:#b91c1c;">${escapeHtml(step.error)}</span>`
    : step.detail
      ? `<code>${escapeHtml(stringifyValue(step.detail))}</code>`
      : ""
  return `
    <tr style="background:${bg};border-top:1px solid #eee;">
      <td style="padding:6px 8px;color:#666;">${step.at}</td>
      <td style="padding:6px 8px;"><code>${escapeHtml(step.name)}</code></td>
      <td style="padding:6px 8px;">${okCell}</td>
      <td style="padding:6px 8px;">${detail}</td>
    </tr>
  `
}

function stringifyValue(v: unknown): string {
  if (v === null || v === undefined) return "—"
  if (typeof v === "string") return v
  try {
    return JSON.stringify(v)
  } catch {
    return String(v)
  }
}
