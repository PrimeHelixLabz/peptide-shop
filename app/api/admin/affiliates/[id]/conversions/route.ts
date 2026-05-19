import { NextResponse } from "next/server"
import {
  requireAdminMiddleware,
  type AuthenticatedRequest,
} from "@/lib/auth/middleware"
import {
  getAffiliateByIdAsAdmin,
  getUnpaidConversionsForAffiliateAsAdmin,
} from "@/lib/affiliates"

type RouteContext = { params: Promise<{ id: string }> }

/**
 * Returns the affiliate's unpaid conversions (status `pending` or
 * `payable`) for use in the Mark-as-paid panel. Already-paid and
 * reversed rows are excluded because they're not actionable here.
 */
export const GET = requireAdminMiddleware(
  async (_req: AuthenticatedRequest, context: RouteContext) => {
    const { id } = await context.params
    const affiliate = await getAffiliateByIdAsAdmin(id)
    if (!affiliate) {
      return NextResponse.json(
        { error: "Affiliate not found" },
        { status: 404 }
      )
    }
    const conversions = await getUnpaidConversionsForAffiliateAsAdmin(id)
    return NextResponse.json({ conversions })
  }
)
