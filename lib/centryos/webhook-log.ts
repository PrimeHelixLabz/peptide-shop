import { Resend } from "resend"
import { createAdminClient } from "@/lib/supabase/admin"

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
