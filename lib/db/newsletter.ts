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
