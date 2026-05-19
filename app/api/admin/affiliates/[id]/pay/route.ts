import { NextResponse } from "next/server"
import { z } from "zod"
import {
  requireAdminMiddleware,
  type AuthenticatedRequest,
} from "@/lib/auth/middleware"
import { markConversionsAsPaidAsAdmin } from "@/lib/affiliates"

const paySchema = z.object({
  conversionIds: z
    .array(z.string().uuid())
    .min(1, "Pick at least one conversion to mark as paid")
    .max(500),
  reference: z.string().trim().max(200).optional(),
})

type RouteContext = { params: Promise<{ id: string }> }

/**
 * Marks a batch of an affiliate's conversions as paid. The reference
 * field is a free-form proof-of-payment string (tx hash, PayPal ID,
 * Wise ID, etc.) that the partner can match against their own wallet.
 *
 * Idempotent: rows already in `paid` or `reversed` are silently skipped
 * by the underlying helper, so a double-submit can't double-pay.
 */
export const POST = requireAdminMiddleware(
  async (req: AuthenticatedRequest, context: RouteContext) => {
    const { id } = await context.params

    let parsed: z.infer<typeof paySchema>
    try {
      const body = await req.json()
      parsed = paySchema.parse(body)
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: error.errors[0]?.message ?? "Invalid input" },
          { status: 400 }
        )
      }
      return NextResponse.json({ error: "Invalid request" }, { status: 400 })
    }

    try {
      const result = await markConversionsAsPaidAsAdmin(
        id,
        parsed.conversionIds,
        parsed.reference?.trim() || null
      )
      return NextResponse.json(result)
    } catch (error) {
      console.error("POST /api/admin/affiliates/:id/pay failed:", error)
      return NextResponse.json(
        { error: "Could not record payout" },
        { status: 500 }
      )
    }
  }
)
