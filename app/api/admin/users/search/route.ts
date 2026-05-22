import { NextResponse } from "next/server"
import {
  requireAdminMiddleware,
  type AuthenticatedRequest,
} from "@/lib/auth/middleware"
import { createAdminClient } from "@/lib/supabase/admin"

/**
 * GET /api/admin/users/search
 *
 * Two modes:
 *   ?q=foo          → search profiles by name OR email (ILIKE %foo%), 10 results
 *   ?ids=u1,u2,u3   → batch lookup by user id (for hydrating selected users)
 *
 * When both are passed, ids wins so the picker can resolve its current
 * value even while the user types in the search box.
 *
 * Returns: { users: [{ id, name, email }] }
 */

interface ProfileRow {
  id: string
  name: string | null
  email: string | null
}

const SEARCH_LIMIT = 10
const MAX_IDS = 50

export const GET = requireAdminMiddleware(async (req: AuthenticatedRequest) => {
  const supabase = createAdminClient()
  const url = new URL(req.url)
  const q = url.searchParams.get("q")?.trim() ?? ""
  const idsParam = url.searchParams.get("ids")?.trim() ?? ""

  // ── Batch id lookup ──
  if (idsParam) {
    const ids = idsParam
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, MAX_IDS)
    if (ids.length === 0) {
      return NextResponse.json({ users: [] })
    }
    const { data, error } = await supabase
      .from("profiles")
      .select("id, name, email")
      .in("id", ids)
    if (error) {
      console.error("user-search ids lookup failed:", error)
      return NextResponse.json({ error: "Lookup failed" }, { status: 500 })
    }
    return NextResponse.json({ users: normalize(data) })
  }

  // ── Empty query → empty list (don't dump the whole user table) ──
  if (q.length === 0) {
    return NextResponse.json({ users: [] })
  }

  // PostgREST `or` filter: escape commas in the input so they don't
  // break the filter expression. supabase-js escapes most chars but
  // commas inside ilike values can split the OR.
  const safeQ = q.replace(/[,()*]/g, "")
  const pattern = `%${safeQ}%`

  const { data, error } = await supabase
    .from("profiles")
    .select("id, name, email")
    .or(`name.ilike.${pattern},email.ilike.${pattern}`)
    .order("name", { ascending: true, nullsFirst: false })
    .limit(SEARCH_LIMIT)

  if (error) {
    console.error("user-search query failed:", error)
    return NextResponse.json({ error: "Search failed" }, { status: 500 })
  }

  return NextResponse.json({ users: normalize(data) })
})

function normalize(rows: ProfileRow[] | null) {
  return (rows ?? []).map((r) => ({
    id: r.id,
    name: r.name ?? "",
    email: r.email ?? "",
  }))
}
