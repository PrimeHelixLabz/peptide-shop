import { NextResponse } from "next/server"
import { z } from "zod"
import {
  requireAdminMiddleware,
  type AuthenticatedRequest,
} from "@/lib/auth/middleware"
import {
  createDiscountCodeAsAdmin,
  getAllDiscountCodesAsAdmin,
  getDiscountCodeByCodeAsAdmin,
  normalizeCode,
} from "@/lib/discounts/db"

const inputSchema = z
  .object({
    code: z
      .string()
      .trim()
      .min(3, "Code must be at least 3 characters")
      .max(40, "Code must be 40 characters or less"),
    discountType: z.enum(["percent", "amount"]),
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
  .superRefine((val, ctx) => {
    if (val.discountType === "percent" && val.percentOff == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "percentOff is required for percent discounts",
        path: ["percentOff"],
      })
    }
    if (val.discountType === "amount" && val.amountOff == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "amountOff is required for amount discounts",
        path: ["amountOff"],
      })
    }
  })

export const GET = requireAdminMiddleware(async () => {
  const codes = await getAllDiscountCodesAsAdmin()
  return NextResponse.json({ codes })
})

export const POST = requireAdminMiddleware(async (req: AuthenticatedRequest) => {
  let parsed: z.infer<typeof inputSchema>
  try {
    const body = await req.json()
    parsed = inputSchema.parse(body)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0]?.message ?? "Invalid input" },
        { status: 400 }
      )
    }
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }

  const normalized = normalizeCode(parsed.code)
  if (!normalized) {
    return NextResponse.json({ error: "Code is required" }, { status: 400 })
  }

  const conflict = await getDiscountCodeByCodeAsAdmin(normalized)
  if (conflict) {
    return NextResponse.json(
      { error: "A code with that name already exists" },
      { status: 409 }
    )
  }

  try {
    const created = await createDiscountCodeAsAdmin(
      { ...parsed, code: normalized },
      req.user!.id
    )
    return NextResponse.json({ code: created }, { status: 201 })
  } catch (error) {
    console.error("createDiscountCode failed:", error)
    return NextResponse.json(
      { error: "Could not create discount code" },
      { status: 500 }
    )
  }
})
