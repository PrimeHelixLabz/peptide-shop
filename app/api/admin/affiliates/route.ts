import { NextResponse } from "next/server"
import { requireAdminMiddleware } from "@/lib/auth/middleware"
import { getAllAffiliatesWithStatsAsAdmin } from "@/lib/affiliates"

export const GET = requireAdminMiddleware(async () => {
  const affiliates = await getAllAffiliatesWithStatsAsAdmin()
  return NextResponse.json({ affiliates })
})
