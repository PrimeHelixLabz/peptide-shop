import { NextResponse } from "next/server"
import { requireAdminMiddleware, type AuthenticatedRequest } from "@/lib/auth/middleware"
import {
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
  return NextResponse.json({ subscribers })
})
