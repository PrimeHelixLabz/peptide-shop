import { NextResponse } from "next/server"
import { z } from "zod"
import {
  requireAdminMiddleware,
  type AuthenticatedRequest,
} from "@/lib/auth/middleware"
import {
  getAffiliateByIdAsAdmin,
  updateAffiliateAsAdmin,
} from "@/lib/affiliates"

const updateSchema = z
  .object({
    status: z.enum(["pending", "approved", "suspended"]).optional(),
    commissionRate: z.number().min(0).max(1).optional(),
    notes: z.string().max(2000).nullable().optional(),
    payoutMethod: z.string().max(50).nullable().optional(),
    payoutDetails: z.string().max(500).nullable().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, {
    message: "No fields to update",
  })

type RouteContext = { params: Promise<{ id: string }> }

export const GET = requireAdminMiddleware(
  async (_req: AuthenticatedRequest, context: RouteContext) => {
    const { id } = await context.params
    const affiliate = await getAffiliateByIdAsAdmin(id)
    if (!affiliate) {
      return NextResponse.json({ error: "Affiliate not found" }, { status: 404 })
    }
    return NextResponse.json({ affiliate })
  }
)

export const PATCH = requireAdminMiddleware(
  async (req: AuthenticatedRequest, context: RouteContext) => {
    const { id } = await context.params

    let parsed: z.infer<typeof updateSchema>
    try {
      const body = await req.json()
      parsed = updateSchema.parse(body)
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
      const affiliate = await updateAffiliateAsAdmin(id, {
        status: parsed.status,
        commissionRate: parsed.commissionRate,
        notes: parsed.notes ?? undefined,
        payoutMethod: parsed.payoutMethod,
        payoutDetails: parsed.payoutDetails,
      })
      if (!affiliate) {
        return NextResponse.json({ error: "Affiliate not found" }, { status: 404 })
      }
      return NextResponse.json({ affiliate })
    } catch (error) {
      console.error("PATCH affiliate failed:", error)
      return NextResponse.json(
        { error: "Could not update affiliate" },
        { status: 500 }
      )
    }
  }
)
