import { NextResponse } from "next/server"
import { z } from "zod"
import {
  requireAdminMiddleware,
  type AuthenticatedRequest,
} from "@/lib/auth/middleware"
import {
  getPostByIdAsAdmin,
  markAnnouncementSentAsAdmin,
  clearAnnouncementSentAsAdmin,
} from "@/lib/blog/db"
import { getActiveSubscriberEmails } from "@/lib/db/newsletter"
import { createCampaign, finalizeCampaign } from "@/lib/db/campaigns"
import { buildBlogAnnouncement, sendCampaignEmails } from "@/lib/email"

type RouteContext = { params: Promise<{ id: string }> }

/**
 * Email all active newsletter subscribers about a newly-published post.
 * Manual, admin-triggered (a button in the blog editor) — fires at most once
 * per post, guarded by blog_posts.announcement_sent_at. Logged as a row in
 * email_campaigns (audience = 'all_active') for the audit trail.
 */
export const POST = requireAdminMiddleware(
  async (req: AuthenticatedRequest, context: RouteContext) => {
    const { id } = await context.params

    if (!z.string().uuid().safeParse(id).success) {
      return NextResponse.json({ error: "Invalid post id" }, { status: 400 })
    }

    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json(
        { error: "Email sending is not configured (missing RESEND_API_KEY)." },
        { status: 503 }
      )
    }

    const post = await getPostByIdAsAdmin(id)
    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 })
    }
    if (post.status !== "published") {
      return NextResponse.json(
        { error: "Publish the post before sending its announcement." },
        { status: 400 }
      )
    }
    if (post.announcementSentAt) {
      return NextResponse.json(
        { error: "An announcement for this post has already been sent." },
        { status: 409 }
      )
    }

    const recipients = await getActiveSubscriberEmails()
    if (recipients.length === 0) {
      return NextResponse.json(
        { error: "No active subscribers to send to." },
        { status: 400 }
      )
    }

    // Claim the announcement atomically so a double-click can't double-send.
    const claimed = await markAnnouncementSentAsAdmin(id)
    if (!claimed) {
      return NextResponse.json(
        { error: "An announcement for this post has already been sent." },
        { status: 409 }
      )
    }

    const { subject, bodyMarkdown } = buildBlogAnnouncement(post)

    const campaignId = await createCampaign({
      subject,
      bodyMarkdown,
      audience: "all_active",
      recipientCount: recipients.length,
      createdBy: req.user?.email ?? null,
    })
    if (!campaignId) {
      // Couldn't record the campaign — release the claim so it can be retried.
      await clearAnnouncementSentAsAdmin(id)
      return NextResponse.json(
        { error: "Could not create the campaign record. Send aborted." },
        { status: 500 }
      )
    }

    const result = await sendCampaignEmails({ subject, bodyMarkdown, recipients })

    await finalizeCampaign(campaignId, {
      sentCount: result.sent,
      failedCount: result.failed,
    })

    // Total failure → undo the claim so the admin can try again later.
    if (result.sent === 0) {
      await clearAnnouncementSentAsAdmin(id)
      return NextResponse.json(
        { error: "The announcement failed to send. Check the server logs." },
        { status: 502 }
      )
    }

    return NextResponse.json({
      ok: true,
      campaignId,
      recipientCount: recipients.length,
      sent: result.sent,
      failed: result.failed,
    })
  }
)
