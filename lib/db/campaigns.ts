import { createAdminClient } from "@/lib/supabase/admin"

export type CampaignStatus = "sending" | "sent" | "partial" | "failed"
export type CampaignAudience = "all_active" | "selected"

export interface EmailCampaign {
  id: string
  subject: string
  bodyMarkdown: string
  audience: CampaignAudience
  recipientCount: number
  sentCount: number
  failedCount: number
  status: CampaignStatus
  createdBy: string | null
  createdAt: string
  sentAt: string | null
}

interface CampaignRow {
  id: string
  subject: string
  body_markdown: string
  audience: CampaignAudience
  recipient_count: number
  sent_count: number
  failed_count: number
  status: CampaignStatus
  created_by: string | null
  created_at: string
  sent_at: string | null
}

function rowToCampaign(row: CampaignRow): EmailCampaign {
  return {
    id: row.id,
    subject: row.subject,
    bodyMarkdown: row.body_markdown,
    audience: row.audience,
    recipientCount: row.recipient_count,
    sentCount: row.sent_count,
    failedCount: row.failed_count,
    status: row.status,
    createdBy: row.created_by,
    createdAt: row.created_at,
    sentAt: row.sent_at,
  }
}

export async function getAllCampaignsAsAdmin(): Promise<EmailCampaign[]> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from("email_campaigns")
    .select(
      "id, subject, body_markdown, audience, recipient_count, sent_count, failed_count, status, created_by, created_at, sent_at"
    )
    .order("created_at", { ascending: false })
    .limit(100)

  if (error) {
    console.error("getAllCampaignsAsAdmin failed:", error)
    return []
  }
  return ((data as unknown as CampaignRow[]) || []).map(rowToCampaign)
}

/**
 * Insert a campaign in the "sending" state. Returns the new row id, or null
 * if the insert failed (caller should abort the send in that case).
 */
export async function createCampaign(params: {
  subject: string
  bodyMarkdown: string
  audience: CampaignAudience
  recipientCount: number
  createdBy: string | null
}): Promise<string | null> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from("email_campaigns")
    .insert({
      subject: params.subject,
      body_markdown: params.bodyMarkdown,
      audience: params.audience,
      recipient_count: params.recipientCount,
      status: "sending",
      created_by: params.createdBy,
    })
    .select("id")
    .single()

  if (error || !data) {
    console.error("createCampaign failed:", error)
    return null
  }
  return (data as { id: string }).id
}

/** Record the outcome of a send and stamp sent_at. */
export async function finalizeCampaign(
  id: string,
  params: { sentCount: number; failedCount: number }
): Promise<void> {
  const status: CampaignStatus =
    params.failedCount === 0
      ? "sent"
      : params.sentCount === 0
        ? "failed"
        : "partial"

  const supabase = createAdminClient()
  const { error } = await supabase
    .from("email_campaigns")
    .update({
      sent_count: params.sentCount,
      failed_count: params.failedCount,
      status,
      sent_at: new Date().toISOString(),
    })
    .eq("id", id)

  if (error) {
    console.error("finalizeCampaign failed:", error)
  }
}
