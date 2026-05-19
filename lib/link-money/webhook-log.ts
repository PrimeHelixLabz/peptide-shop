import { createAdminClient } from "@/lib/supabase/admin"

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

