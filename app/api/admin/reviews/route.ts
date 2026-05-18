import { NextResponse } from "next/server"
import { requireAdminMiddleware, type AuthenticatedRequest } from "@/lib/auth/middleware"
import { getAllReviewsAsAdmin, type ReviewStatus } from "@/lib/db/reviews"

const STATUSES: ReviewStatus[] = ["pending", "published", "hidden"]

export const GET = requireAdminMiddleware(async (req: AuthenticatedRequest) => {
  const statusParam = req.nextUrl.searchParams.get("status")
  const status =
    statusParam && (STATUSES as string[]).includes(statusParam)
      ? (statusParam as ReviewStatus)
      : undefined
  const reviews = await getAllReviewsAsAdmin(status ? { status } : undefined)
  return NextResponse.json({ reviews })
})
