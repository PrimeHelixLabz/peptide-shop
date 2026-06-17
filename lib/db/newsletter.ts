import { createAdminClient } from "@/lib/supabase/admin"

export type SubscriberStatus = "active" | "unsubscribed"

export interface NewsletterSubscriber {
  id: string
  email: string
  source: string
  subscribedAt: string
  unsubscribedAt: string | null
}

interface SubscriberRow {
  id: string
  email: string
  source: string
  subscribed_at: string
  unsubscribed_at: string | null
}

function rowToSubscriber(row: SubscriberRow): NewsletterSubscriber {
  return {
    id: row.id,
    email: row.email,
    source: row.source,
    subscribedAt: row.subscribed_at,
    unsubscribedAt: row.unsubscribed_at,
  }
}

export async function getAllSubscribersAsAdmin(options?: {
  status?: SubscriberStatus
}): Promise<NewsletterSubscriber[]> {
  const supabase = createAdminClient()
  let query = supabase
    .from("newsletter_subscribers")
    .select("id, email, source, subscribed_at, unsubscribed_at")
    .order("subscribed_at", { ascending: false })

  if (options?.status === "active") {
    query = query.is("unsubscribed_at", null)
  } else if (options?.status === "unsubscribed") {
    query = query.not("unsubscribed_at", "is", null)
  }

  const { data, error } = await query
  if (error) {
    console.error("getAllSubscribersAsAdmin failed:", error)
    return []
  }
  return ((data as unknown as SubscriberRow[]) || []).map(rowToSubscriber)
}

/* ────────────────────────────────────────────────────────────────
 *  Recipient resolution (for marketing sends)
 * ────────────────────────────────────────────────────────────── */

/** Active (non-unsubscribed) subscriber emails — the "all active" audience. */
export async function getActiveSubscriberEmails(): Promise<string[]> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from("newsletter_subscribers")
    .select("email")
    .is("unsubscribed_at", null)

  if (error) {
    console.error("getActiveSubscriberEmails failed:", error)
    return []
  }
  return ((data as { email: string }[]) || []).map((r) => r.email)
}

/** Emails for a set of subscriber ids, limited to those still active. */
export async function getActiveEmailsByIds(ids: string[]): Promise<string[]> {
  if (ids.length === 0) return []
  const supabase = createAdminClient()
  const emails: string[] = []
  // Chunk the id list so a large "select all" selection can't overrun the
  // query-string length limit on the underlying GET request.
  const CHUNK = 500
  for (let i = 0; i < ids.length; i += CHUNK) {
    const slice = ids.slice(i, i + CHUNK)
    const { data, error } = await supabase
      .from("newsletter_subscribers")
      .select("email")
      .in("id", slice)
      .is("unsubscribed_at", null)
    if (error) {
      console.error("getActiveEmailsByIds failed:", error)
      continue
    }
    for (const row of (data as { email: string }[]) || []) {
      emails.push(row.email)
    }
  }
  return emails
}

/* ────────────────────────────────────────────────────────────────
 *  Bulk add (CSV import + customer backfill)
 * ────────────────────────────────────────────────────────────── */

export interface BulkAddResult {
  /** Brand-new rows inserted. */
  added: number
  /** Previously-unsubscribed rows flipped back to active. */
  reactivated: number
  /** Already-active rows left untouched. */
  skipped: number
  /** Rows in the input that weren't valid email addresses. */
  invalid: number
  /** Distinct valid addresses seen in the input. */
  total: number
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function normalizeEmails(raw: string[]): {
  valid: string[]
  invalid: number
} {
  const seen = new Set<string>()
  let invalid = 0
  for (const r of raw) {
    const email = (r ?? "").trim().toLowerCase()
    if (!email) continue
    if (!EMAIL_RE.test(email) || email.length > 320) {
      invalid += 1
      continue
    }
    seen.add(email)
  }
  return { valid: Array.from(seen), invalid }
}

/**
 * Add a list of emails as subscribers. Existing active subscribers are left
 * alone; previously-unsubscribed ones are re-activated. Source tags where the
 * batch came from (e.g. "csv_import", "customer_import").
 */
export async function addSubscribersBulk(
  rawEmails: string[],
  source: string
): Promise<BulkAddResult> {
  const { valid, invalid } = normalizeEmails(rawEmails)
  const result: BulkAddResult = {
    added: 0,
    reactivated: 0,
    skipped: 0,
    invalid,
    total: valid.length,
  }
  if (valid.length === 0) return result

  const supabase = createAdminClient()
  const CHUNK = 500

  // Pull existing rows for the incoming set so we know who to insert vs
  // re-activate vs skip. citext column → comparison is case-insensitive.
  // Chunked so a large import can't overrun the query-string limit.
  const existing = new Map<string, { unsubscribed: boolean }>()
  for (let i = 0; i < valid.length; i += CHUNK) {
    const slice = valid.slice(i, i + CHUNK)
    const { data: existingRows, error: fetchError } = await supabase
      .from("newsletter_subscribers")
      .select("email, unsubscribed_at")
      .in("email", slice)
    if (fetchError) {
      console.error("addSubscribersBulk fetch failed:", fetchError)
      return result
    }
    for (const row of (existingRows as {
      email: string
      unsubscribed_at: string | null
    }[]) || []) {
      existing.set(row.email.toLowerCase(), {
        unsubscribed: row.unsubscribed_at !== null,
      })
    }
  }

  const toInsert: string[] = []
  const toReactivate: string[] = []
  for (const email of valid) {
    const found = existing.get(email)
    if (!found) toInsert.push(email)
    else if (found.unsubscribed) toReactivate.push(email)
    else result.skipped += 1
  }

  for (let i = 0; i < toInsert.length; i += CHUNK) {
    const slice = toInsert.slice(i, i + CHUNK)
    const { error: insertError } = await supabase
      .from("newsletter_subscribers")
      .insert(slice.map((email) => ({ email, source })))
    if (insertError) {
      console.error("addSubscribersBulk insert failed:", insertError)
    } else {
      result.added += slice.length
    }
  }

  const reactivatedAt = new Date().toISOString()
  for (let i = 0; i < toReactivate.length; i += CHUNK) {
    const slice = toReactivate.slice(i, i + CHUNK)
    const { error: updateError } = await supabase
      .from("newsletter_subscribers")
      .update({
        unsubscribed_at: null,
        subscribed_at: reactivatedAt,
        source,
      })
      .in("email", slice)
    if (updateError) {
      console.error("addSubscribersBulk reactivate failed:", updateError)
    } else {
      result.reactivated += slice.length
    }
  }

  return result
}

/**
 * Backfill the subscriber list from registered customer accounts (profiles).
 * Guest-order-only emails are intentionally excluded.
 */
export async function importRegisteredCustomers(): Promise<BulkAddResult> {
  const supabase = createAdminClient()
  const { data, error } = await supabase.from("profiles").select("email")

  if (error) {
    console.error("importRegisteredCustomers fetch failed:", error)
    return { added: 0, reactivated: 0, skipped: 0, invalid: 0, total: 0 }
  }

  const emails = ((data as { email: string | null }[]) || [])
    .map((r) => r.email ?? "")
    .filter(Boolean)

  return addSubscribersBulk(emails, "customer_import")
}

/* ────────────────────────────────────────────────────────────────
 *  CSV export
 *  RFC 4180-compliant: fields with commas, quotes, or newlines are
 *  wrapped in double quotes; embedded quotes are doubled.
 * ────────────────────────────────────────────────────────────── */

function csvEscape(value: string | null | undefined): string {
  if (value == null) return ""
  const s = String(value)
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

const CSV_HEADERS = [
  "email",
  "status",
  "source",
  "subscribed_at",
  "unsubscribed_at",
]

export function buildNewsletterCsv(subscribers: NewsletterSubscriber[]): string {
  const lines: string[] = [CSV_HEADERS.join(",")]
  for (const sub of subscribers) {
    const row = [
      csvEscape(sub.email),
      csvEscape(sub.unsubscribedAt ? "unsubscribed" : "active"),
      csvEscape(sub.source),
      csvEscape(sub.subscribedAt),
      csvEscape(sub.unsubscribedAt),
    ]
    lines.push(row.join(","))
  }
  // CRLF per RFC 4180 — Excel + most spreadsheet apps prefer it.
  return lines.join("\r\n") + "\r\n"
}
