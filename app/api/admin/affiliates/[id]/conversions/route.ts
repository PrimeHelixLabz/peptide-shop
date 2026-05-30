import { NextResponse } from "next/server"
import {
  requireAdminMiddleware,
  type AuthenticatedRequest,
} from "@/lib/auth/middleware"
import {
  getAffiliateByIdAsAdmin,
  getUnpaidConversionsForAffiliateAsAdmin,
  lookupOrderForManualConversionAsAdmin,
  createManualConversionAsAdmin,
} from "@/lib/affiliates"
import { z } from "zod"

type RouteContext = { params: Promise<{ id: string }> }

/**
 * GET /api/admin/affiliates/[id]/conversions
 *   → Returns unpaid conversions (status pending or payable) for the mark-as-paid panel.
 *
 * GET /api/admin/affiliates/[id]/conversions?lookup=<order_number_or_uuid>
 *   → Returns an order preview for the manual-commission entry form.
 */
export const GET = requireAdminMiddleware(
  async (req: AuthenticatedRequest, context: RouteContext) => {
    const { id } = await context.params
    const affiliate = await getAffiliateByIdAsAdmin(id)
    if (!affiliate) {
      return NextResponse.json(
        { error: "Affiliate not found" },
        { status: 404 }
      )
    }

    const lookup = new URL(req.url).searchParams.get("lookup")

    if (lookup) {
      const result = await lookupOrderForManualConversionAsAdmin(id, lookup)
      if (!result.found) {
        const msg =
          result.reason === "not-paid"
            ? "Order exists but has not been paid — only paid orders can earn commission"
            : "No paid order found with that order number or ID"
        return NextResponse.json({ error: msg }, { status: 404 })
      }
      return NextResponse.json({ order: result.order })
    }

    const conversions = await getUnpaidConversionsForAffiliateAsAdmin(id)
    return NextResponse.json({ conversions })
  }
)

const createManualConversionSchema = z.object({
  orderId: z.string().uuid("orderId must be a UUID"),
  commissionRateOverride: z
    .number()
    .min(0)
    .max(1)
    .optional(),
  adminNotes: z.string().max(500).optional(),
})

/**
 * POST /api/admin/affiliates/[id]/conversions
 *   Creates a manual affiliate conversion for an order that was not attributed
 *   automatically (e.g. customer forgot their referral code at checkout).
 */
export const POST = requireAdminMiddleware(
  async (req: AuthenticatedRequest, context: RouteContext) => {
    const { id } = await context.params
    const affiliate = await getAffiliateByIdAsAdmin(id)
    if (!affiliate) {
      return NextResponse.json(
        { error: "Affiliate not found" },
        { status: 404 }
      )
    }

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
    }

    const parsed = createManualConversionSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation error", details: parsed.error.errors },
        { status: 400 }
      )
    }

    const { orderId, commissionRateOverride, adminNotes } = parsed.data

    try {
      const conversion = await createManualConversionAsAdmin(id, orderId, {
        commissionRateOverride,
        adminNotes,
      })
      return NextResponse.json({ conversion }, { status: 201 })
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create conversion"
      return NextResponse.json({ error: message }, { status: 422 })
    }
  }
)
