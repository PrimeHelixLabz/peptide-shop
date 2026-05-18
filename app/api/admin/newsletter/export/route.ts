import { NextResponse } from "next/server"
import { requireAdminMiddleware, type AuthenticatedRequest } from "@/lib/auth/middleware"
import {
  buildNewsletterCsv,
  getAllSubscribersAsAdmin,
  type SubscriberStatus,
} from "@/lib/db/newsletter"

const VALID_STATUSES: SubscriberStatus[] = ["active", "unsubscribed"]

export const GET = requireAdminMiddleware(async (req: AuthenticatedRequest) => {
  const statusParam = req.nextUrl.searchParams.get("status")
  const status =
    statusParam && (VALID_STATUSES as string[]).includes(statusParam)
      ? (statusParam as SubscriberStatus)
      : undefined

  const subscribers = await getAllSubscribersAsAdmin(
    status ? { status } : undefined
  )
  const csv = buildNewsletterCsv(subscribers)

  const yyyy = new Date().toISOString().slice(0, 10)
  const filename = status
    ? `newsletter-${status}-${yyyy}.csv`
    : `newsletter-${yyyy}.csv`

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  })
})
