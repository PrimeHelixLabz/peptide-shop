import { NextResponse } from "next/server"
import { z } from "zod"
import {
  requireAdminMiddleware,
  type AuthenticatedRequest,
} from "@/lib/auth/middleware"
import {
  getActiveSubscriberEmails,
  getActiveEmailsByIds,
} from "@/lib/db/newsletter"
import {
  getAllCampaignsAsAdmin,
  createCampaign,
  finalizeCampaign,
} from "@/lib/db/campaigns"
import { sendCampaignEmails } from "@/lib/email"

export const GET = requireAdminMiddleware(async () => {
  const campaigns = await getAllCampaignsAsAdmin()
  return NextResponse.json({ campaigns })
})

const sendSchema = z.object({
  subject: z.string().trim().min(1, "Subject is required").max(200),
  bodyMarkdown: z.string().trim().min(1, "Email body is required").max(20000),
  mode: z.enum(["test", "send"]),
  testEmail: z.string().trim().email().max(320).optional(),
  audience: z.enum(["all_active", "selected"]).optional(),
  subscriberIds: z.array(z.string().uuid()).max(50000).optional(),
})

export const POST = requireAdminMiddleware(
  async (req: AuthenticatedRequest) => {
    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json(
        { error: "Email sending is not configured (missing RESEND_API_KEY)." },
        { status: 503 }
      )
    }

    let parsed: z.infer<typeof sendSchema>
    try {
      parsed = sendSchema.parse(await req.json())
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: error.errors[0]?.message ?? "Invalid input" },
          { status: 400 }
        )
      }
      return NextResponse.json({ error: "Invalid request" }, { status: 400 })
    }

    // ── Test send: fire a single copy to the admin, record nothing. ──
    if (parsed.mode === "test") {
      if (!parsed.testEmail) {
        return NextResponse.json(
          { error: "A test email address is required." },
          { status: 400 }
        )
      }
      const result = await sendCampaignEmails({
        subject: parsed.subject,
        bodyMarkdown: parsed.bodyMarkdown,
        recipients: [parsed.testEmail],
      })
      if (result.sent === 0) {
        return NextResponse.json(
          { error: "Test email failed to send. Check the server logs." },
          { status: 502 }
        )
      }
      return NextResponse.json({ ok: true, sent: result.sent })
    }

    // ── Real send ──
    const audience = parsed.audience ?? "all_active"
    let recipients: string[]
    if (audience === "selected") {
      if (!parsed.subscriberIds || parsed.subscriberIds.length === 0) {
        return NextResponse.json(
          { error: "No subscribers selected." },
          { status: 400 }
        )
      }
      recipients = await getActiveEmailsByIds(parsed.subscriberIds)
    } else {
      recipients = await getActiveSubscriberEmails()
    }

    if (recipients.length === 0) {
      return NextResponse.json(
        { error: "No active recipients to send to." },
        { status: 400 }
      )
    }

    const campaignId = await createCampaign({
      subject: parsed.subject,
      bodyMarkdown: parsed.bodyMarkdown,
      audience,
      recipientCount: recipients.length,
      createdBy: req.user?.email ?? null,
    })

    if (!campaignId) {
      return NextResponse.json(
        { error: "Could not create the campaign record. Send aborted." },
        { status: 500 }
      )
    }

    const result = await sendCampaignEmails({
      subject: parsed.subject,
      bodyMarkdown: parsed.bodyMarkdown,
      recipients,
    })

    await finalizeCampaign(campaignId, {
      sentCount: result.sent,
      failedCount: result.failed,
    })

    return NextResponse.json({
      ok: true,
      campaignId,
      recipientCount: recipients.length,
      sent: result.sent,
      failed: result.failed,
    })
  }
)
