import { NextRequest, NextResponse } from "next/server"
import { isValidActiveCode } from "@/lib/affiliates"

// Public endpoint used by the checkout form to confirm a manually-entered
// affiliate code in real time. Returns only a boolean — no partner name or
// PII — so it can be called pre-auth without leaking partner data.
// The authoritative validation still happens at order-paid time via the
// conversion trigger, so a stale "valid" answer from this endpoint can't
// create a rogue commission.
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code")?.trim() ?? ""
  if (!code) {
    return NextResponse.json({ valid: false })
  }
  const valid = await isValidActiveCode(code)
  return NextResponse.json({ valid })
}
