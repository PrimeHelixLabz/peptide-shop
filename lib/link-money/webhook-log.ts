import { Resend } from "resend"
import { createAdminClient } from "@/lib/supabase/admin"

const DEBUG_EMAIL = "houyachun3@gmail.com"
const FROM_EMAIL = "no-reply@primehelixlabz.com"

export interface WebhookLogEntry {
  eventType: string | null
  clientReferenceId: string | null
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
 * must not break the webhook handler.
 */
export async function logWebhook(entry: WebhookLogEntry): Promise<void> {
  try {
    const supabase = createAdminClient()
    const { error } = await supabase.from("link_money_webhook_logs").insert({
      event_type: entry.eventType,
      client_reference_id: entry.clientReferenceId,
      transaction_id: entry.transactionId,
      signature_valid: entry.signatureValid,
      headers: entry.headers,
      body: entry.body as Record<string, unknown> | null,
      raw_body: entry.rawBody,
      status_code: entry.statusCode,
      error: entry.error ?? null,
    })
    if (error) {
      console.error("logWebhook: insert failed", error)
    }
  } catch (err) {
    console.error("logWebhook: unexpected failure", err)
  }
}

/**
 * Fire-and-forget debug notification. Never throws.
 */
export async function notifyWebhookReceived(
  entry: WebhookLogEntry
): Promise<void> {
  try {
    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) {
      console.warn("notifyWebhookReceived: RESEND_API_KEY not set")
      return
    }
    const resend = new Resend(apiKey)

    const subject = `[Link Money Webhook] ${entry.eventType ?? "unknown"} — ${entry.clientReferenceId ?? "no-ref"}`
    const pretty = safeStringify(entry.body)

    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 720px;">
        <h2 style="margin: 0 0 12px;">Link Money webhook received</h2>
        <table style="border-collapse: collapse; font-size: 14px;">
          <tr><td style="padding: 4px 8px; color: #666;">Event type</td><td style="padding: 4px 8px;"><code>${escapeHtml(entry.eventType ?? "—")}</code></td></tr>
          <tr><td style="padding: 4px 8px; color: #666;">Client reference ID</td><td style="padding: 4px 8px;"><code>${escapeHtml(entry.clientReferenceId ?? "—")}</code></td></tr>
          <tr><td style="padding: 4px 8px; color: #666;">Transaction ID</td><td style="padding: 4px 8px;"><code>${escapeHtml(entry.transactionId ?? "—")}</code></td></tr>
          <tr><td style="padding: 4px 8px; color: #666;">Signature valid</td><td style="padding: 4px 8px;">${entry.signatureValid ? "✅" : "❌"}</td></tr>
          <tr><td style="padding: 4px 8px; color: #666;">Status code</td><td style="padding: 4px 8px;">${entry.statusCode}</td></tr>
          ${entry.error ? `<tr><td style="padding: 4px 8px; color: #666;">Error</td><td style="padding: 4px 8px; color: #b91c1c;">${escapeHtml(entry.error)}</td></tr>` : ""}
        </table>
        <h3 style="margin: 16px 0 8px;">Payload</h3>
        <pre style="background: #f4f4f5; padding: 12px; border-radius: 8px; font-size: 12px; overflow-x: auto;">${escapeHtml(pretty)}</pre>
      </div>
    `

    await resend.emails.send({
      from: FROM_EMAIL,
      to: DEBUG_EMAIL,
      subject,
      html,
    })
  } catch (err) {
    console.error("notifyWebhookReceived: email send failed", err)
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
