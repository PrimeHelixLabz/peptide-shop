import { NextResponse } from "next/server"
import { z } from "zod"
import {
  requireAdminMiddleware,
  type AuthenticatedRequest,
} from "@/lib/auth/middleware"
import {
  getAffiliateByIdAsAdmin,
  linkAffiliateToUserByEmailAsAdmin,
  unlinkAffiliateFromUserAsAdmin,
  updateAffiliateAsAdmin,
} from "@/lib/affiliates"

const updateSchema = z
  .object({
    status: z.enum(["pending", "approved", "suspended"]).optional(),
    commissionRate: z.number().min(0).max(1).optional(),
    notes: z.string().max(2000).nullable().optional(),
    payoutMethod: z.string().max(50).nullable().optional(),
    payoutDetails: z.string().max(500).nullable().optional(),
    /**
     * Manual escape-hatch: when admin enters the partner's login email,
     * the server looks up that user and sets `user_id` on this row so the
     * partner can see the dashboard. Used to fix rows that were created
     * by hand in the Supabase dashboard without `user_id`.
     */
    linkToUserEmail: z.string().trim().email().max(320).optional(),
    /**
     * Clears `user_id` so the row can be re-linked to a different account.
     * Used when the wrong owner ended up on the row (e.g. admin's own
     * user_id instead of the partner's).
     */
    unlinkUser: z.literal(true).optional(),
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
      // Run unlink BEFORE link so an admin can repoint in one PATCH:
      // { unlinkUser: true, linkToUserEmail: "partner@..." } → clears the
      // wrong owner then attaches the right one. After unlink, the link
      // step sees user_id=NULL and proceeds without the "already-linked"
      // refusal.
      if (parsed.unlinkUser) {
        const unlinked = await unlinkAffiliateFromUserAsAdmin(id)
        if (!unlinked) {
          return NextResponse.json(
            { error: "Affiliate not found." },
            { status: 404 }
          )
        }
      }

      // Link-to-user can short-circuit with a structured error
      // (user-not-found, already-linked-to-other) that shouldn't be hidden
      // by other failures downstream.
      if (parsed.linkToUserEmail) {
        const linkResult = await linkAffiliateToUserByEmailAsAdmin(
          id,
          parsed.linkToUserEmail
        )
        if (!linkResult.ok) {
          const messages: Record<typeof linkResult.reason, string> = {
            "affiliate-not-found": "Affiliate not found.",
            "user-not-found":
              "No registered user with that email. Ask the partner to create an account at /signup first, then retry.",
            "already-linked-to-other":
              "This affiliate is already linked to a different user account. Unlink it first, then re-link.",
          }
          const status =
            linkResult.reason === "affiliate-not-found" ? 404 : 409
          return NextResponse.json(
            { error: messages[linkResult.reason] },
            { status }
          )
        }
      }

      // If the request was unlink-only or link-only with no other field
      // changes, skip the general update (zod refine guarantees at least
      // one field; if it was just the link/unlink, updateAffiliateAsAdmin
      // would no-op anyway).
      const hasOtherUpdates =
        parsed.status !== undefined ||
        parsed.commissionRate !== undefined ||
        parsed.notes !== undefined ||
        parsed.payoutMethod !== undefined ||
        parsed.payoutDetails !== undefined

      if (hasOtherUpdates) {
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
      }

      // Pure link/unlink — return the current row state so the UI can
      // re-render with the new userId.
      const affiliate = await getAffiliateByIdAsAdmin(id)
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
