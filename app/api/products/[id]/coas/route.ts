import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { getProductCoas, replaceProductCoas } from "@/lib/db/product-coas"
import { requireAdminMiddleware } from "@/lib/auth/middleware"

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const coas = await getProductCoas(id)
    return NextResponse.json({ coas })
  } catch (error) {
    console.error("Get product COAs error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

const replaceSchema = z.object({
  coas: z.array(
    z.object({
      imageUrl: z.string().url(),
      label: z.string().max(120).nullable().optional(),
      sortOrder: z.number().int().min(0).optional(),
    })
  ),
})

export const PUT = requireAdminMiddleware(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const { id } = await params
    const body = await req.json()
    const { coas } = replaceSchema.parse(body)
    const saved = await replaceProductCoas(id, coas)
    return NextResponse.json({ coas: saved })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      )
    }
    console.error("Replace product COAs error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
})
