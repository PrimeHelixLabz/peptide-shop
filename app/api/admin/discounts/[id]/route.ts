import { NextResponse } from "next/server"
import { z } from "zod"
import {
  requireAdminMiddleware,
  type AuthenticatedRequest,
} from "@/lib/auth/middleware"
import {
  deleteDiscountCodeAsAdmin,
  getDiscountCodeByCodeAsAdmin,
  getDiscountCodeByIdAsAdmin,
  getRedemptionsForCodeAsAdmin,
  normalizeCode,
  updateDiscountCodeAsAdmin,
} from "@/lib/discounts/db"

const updateSchema = z
  .object({
    code: z.string().trim().min(3).max(40).optional(),
    discountType: z.enum(["percent", "amount"]).optional(),
    percentOff: z.number().positive().max(100).optional().nullable(),
    amountOff: z.number().positive().max(100000).optional().nullable(),
    maxRedemptions: z.number().int().positive().optional().nullable(),
    perUserMaxRedemptions: z.number().int().positive().optional().nullable(),
    minSubtotal: z.number().nonnegative().optional().nullable(),
    restrictedToUserId: z.string().uuid().optional().nullable(),
    restrictedToEmail: z.string().email().optional().nullable(),
    isActive: z.boolean().optional(),
    expiresAt: z.string().datetime().optional().nullable(),
  })

type RouteContext = { params: Promise<{ id: string }> }

export const GET = requireAdminMiddleware(
  async (_req: AuthenticatedRequest, context: RouteContext) => {
    const { id } = await context.params
    const code = await getDiscountCodeByIdAsAdmin(id)
    if (!code) {
      return NextResponse.json({ error: "Code not found" }, { status: 404 })
    }
    const redemptions = await getRedemptionsForCodeAsAdmin(id, 20)
    return NextResponse.json({ code, redemptions })
  }
)

export const PUT = requireAdminMiddleware(
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

    const existing = await getDiscountCodeByIdAsAdmin(id)
    if (!existing) {
      return NextResponse.json({ error: "Code not found" }, { status: 404 })
    }

    if (parsed.code !== undefined) {
      const normalized = normalizeCode(parsed.code)
      if (!normalized) {
        return NextResponse.json({ error: "Code is required" }, { status: 400 })
      }
      if (normalized !== existing.code) {
        const conflict = await getDiscountCodeByCodeAsAdmin(normalized)
        if (conflict && conflict.id !== id) {
          return NextResponse.json(
            { error: "A code with that name already exists" },
            { status: 409 }
          )
        }
      }
      parsed.code = normalized
    }

    try {
      const updated = await updateDiscountCodeAsAdmin(id, parsed)
      return NextResponse.json({ code: updated })
    } catch (error) {
      console.error("updateDiscountCode failed:", error)
      return NextResponse.json(
        { error: "Could not update discount code" },
        { status: 500 }
      )
    }
  }
)

export const DELETE = requireAdminMiddleware(
  async (_req: AuthenticatedRequest, context: RouteContext) => {
    const { id } = await context.params
    try {
      await deleteDiscountCodeAsAdmin(id)
      return NextResponse.json({ ok: true })
    } catch (error) {
      console.error("deleteDiscountCode failed:", error)
      return NextResponse.json(
        { error: "Could not delete discount code" },
        { status: 500 }
      )
    }
  }
)
