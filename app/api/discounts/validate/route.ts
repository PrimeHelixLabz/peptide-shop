import { NextResponse } from "next/server"
import { z } from "zod"
import {
  requireAuthMiddleware,
  type AuthenticatedRequest,
} from "@/lib/auth/middleware"
import { validateCode } from "@/lib/discounts/db"
import { enforceRateLimit } from "@/lib/rate-limit"

const bodySchema = z.object({
  code: z.string().trim().min(1).max(40),
  subtotal: z.number().min(0),
})

/**
 * POST /api/discounts/validate
 *
 * Customer-facing endpoint called when a code is typed in the cart.
 * Returns the calculated discount + minimal code metadata on success,
 * or a structured error message on failure. Does NOT reserve the code —
 * that happens at order-creation time.
 *
 * Auth: requireAuth — the site already gates the cart and checkout on
 * sign-in, and this endpoint feeds the per-user-cap check. An unauthed
 * caller could rotate guest emails to bypass the cap.
 *
 * Rate limited: 30 requests / 5 min / IP. Generous enough for honest
 * typo-and-retry, tight enough that an attacker can't brute-force the
 * 3–40 char codespace.
 */
export const POST = requireAuthMiddleware(async (req: AuthenticatedRequest) => {
  const limited = await enforceRateLimit(req, {
    key: "discounts:validate",
    limit: 30,
    windowSec: 5 * 60,
  })
  if (limited) return limited

  let parsed: z.infer<typeof bodySchema>
  try {
    const body = await req.json()
    parsed = bodySchema.parse(body)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { ok: false, reason: error.errors[0]?.message ?? "Invalid input" },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { ok: false, reason: "Invalid request" },
      { status: 400 }
    )
  }

  const result = await validateCode({
    code: parsed.code,
    subtotal: parsed.subtotal,
    userId: req.user!.id,
    email: req.user!.email ?? null,
  })

  if (!result.ok) {
    return NextResponse.json({ ok: false, reason: result.reason }, { status: 200 })
  }

  // Return discount fields so the cart can recompute as items change;
  // the server is still the authoritative gate at order creation.
  return NextResponse.json({
    ok: true,
    code: result.code.code,
    codeId: result.code.id,
    discountAmount: result.discountAmount,
    discountType: result.code.discountType,
    percentOff: result.code.percentOff,
    amountOff: result.code.amountOff,
  })
})
