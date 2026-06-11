import { NextResponse } from "next/server"
import { z } from "zod"
import {
  requireAdminMiddleware,
  type AuthenticatedRequest,
} from "@/lib/auth/middleware"
import {
  setReviewStatusAsAdmin,
  deleteReviewAsAdmin,
} from "@/lib/db/reviews"
import { revalidateShopPages } from "@/lib/revalidate-shop"

const patchSchema = z.object({
  status: z.enum(["pending", "published", "hidden"]),
})

type RouteContext = { params: Promise<{ id: string }> }

export const PATCH = requireAdminMiddleware(
  async (req: AuthenticatedRequest, context: RouteContext) => {
    const { id } = await context.params

    let parsed: z.infer<typeof patchSchema>
    try {
      const body = await req.json()
      parsed = patchSchema.parse(body)
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: error.errors[0]?.message ?? "Invalid input" },
          { status: 400 }
        )
      }
      return NextResponse.json({ error: "Invalid request" }, { status: 400 })
    }

    const review = await setReviewStatusAsAdmin(id, parsed.status)
    if (!review) {
      return NextResponse.json({ error: "Review not found" }, { status: 404 })
    }
    // Published reviews render on the cached product detail page; star
    // ratings also show on the shop/homepage cards.
    revalidateShopPages(review.productSlug)
    return NextResponse.json({ review })
  }
)

export const DELETE = requireAdminMiddleware(
  async (_req: AuthenticatedRequest, context: RouteContext) => {
    const { id } = await context.params
    const { ok, productSlug } = await deleteReviewAsAdmin(id)
    if (!ok) {
      return NextResponse.json({ error: "Could not delete review" }, { status: 500 })
    }
    revalidateShopPages(productSlug)
    return NextResponse.json({ ok: true })
  }
)
