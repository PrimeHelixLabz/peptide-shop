import { NextResponse } from "next/server"
import { z } from "zod"
import {
  requireAdminMiddleware,
  type AuthenticatedRequest,
} from "@/lib/auth/middleware"
import { setSubscriberStatusAsAdmin } from "@/lib/db/newsletter"

const patchSchema = z.object({
  action: z.enum(["disable", "enable"]),
})

type RouteContext = { params: Promise<{ id: string }> }

/**
 * Admin-only toggle for a single subscriber's status.
 *  - { action: "disable" } → unsubscribe them (stop marketing email)
 *  - { action: "enable" }  → re-subscribe them
 * The public-facing equivalents are the subscribe/unsubscribe endpoints; this
 * one lets an admin manage the list directly from the newsletter page.
 */
export const PATCH = requireAdminMiddleware(
  async (req: AuthenticatedRequest, context: RouteContext) => {
    const { id } = await context.params

    if (!z.string().uuid().safeParse(id).success) {
      return NextResponse.json({ error: "Invalid subscriber id" }, { status: 400 })
    }

    let parsed: z.infer<typeof patchSchema>
    try {
      parsed = patchSchema.parse(await req.json())
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: error.errors[0]?.message ?? "Invalid input" },
          { status: 400 }
        )
      }
      return NextResponse.json({ error: "Invalid request" }, { status: 400 })
    }

    const subscriber = await setSubscriberStatusAsAdmin(id, parsed.action)
    if (!subscriber) {
      return NextResponse.json(
        { error: "Subscriber not found" },
        { status: 404 }
      )
    }

    return NextResponse.json({ subscriber })
  }
)
