import { NextResponse } from "next/server"
import { requireAdminMiddleware } from "@/lib/auth/middleware"
import { importRegisteredCustomers } from "@/lib/db/newsletter"

/**
 * Backfill the subscriber list from registered customer accounts.
 * Idempotent: re-running only adds accounts that aren't already subscribed.
 */
export const POST = requireAdminMiddleware(async () => {
  const result = await importRegisteredCustomers()
  return NextResponse.json({ ok: true, result })
})
