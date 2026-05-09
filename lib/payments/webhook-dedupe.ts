import { createAdminClient } from "@/lib/supabase/admin"

export type ReservationResult = "fresh" | "duplicate" | "error"

/**
 * Atomic dedupe for payment-provider webhooks. Inserts a row keyed by
 * `(provider, eventId)`. Exactly one caller wins on a redelivery race;
 * everyone else sees "duplicate".
 *
 * - "fresh": this caller reserved the id; proceed with processing.
 * - "duplicate": already processed; the handler should 200-OK and stop.
 * - "error": the dedupe store itself failed; the handler should 5xx so
 *   the provider retries rather than silently losing the event.
 */
export async function reserveWebhookEvent(
  provider: string,
  eventId: string
): Promise<ReservationResult> {
  const supabase = createAdminClient()
  const { error } = await supabase
    .from("webhook_dedupe")
    .insert({ provider, event_id: eventId })

  if (!error) return "fresh"
  // Postgres unique_violation
  if ((error as { code?: string }).code === "23505") return "duplicate"
  console.error("reserveWebhookEvent: insert failed", { provider, error })
  return "error"
}
