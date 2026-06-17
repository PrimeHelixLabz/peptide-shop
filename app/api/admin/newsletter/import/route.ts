import { NextResponse } from "next/server"
import { z } from "zod"
import {
  requireAdminMiddleware,
  type AuthenticatedRequest,
} from "@/lib/auth/middleware"
import { addSubscribersBulk } from "@/lib/db/newsletter"

const importSchema = z.object({
  // Raw values from a CSV column — validation/normalization happens in the
  // DB layer, so we accept loose strings here and just bound the size.
  emails: z.array(z.string().max(320)).min(1).max(50000),
  source: z.string().trim().max(50).optional(),
})

export const POST = requireAdminMiddleware(
  async (req: AuthenticatedRequest) => {
    let parsed: z.infer<typeof importSchema>
    try {
      parsed = importSchema.parse(await req.json())
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: error.errors[0]?.message ?? "Invalid input" },
          { status: 400 }
        )
      }
      return NextResponse.json({ error: "Invalid request" }, { status: 400 })
    }

    const result = await addSubscribersBulk(
      parsed.emails,
      parsed.source?.trim() || "csv_import"
    )

    return NextResponse.json({ ok: true, result })
  }
)
