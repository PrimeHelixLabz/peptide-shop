import { NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { requireAdminMiddleware } from "@/lib/auth/middleware"
import { getSiteBanner, updateSiteBanner } from "@/lib/db/site-banner"

/**
 * GET /api/admin/site-banner
 * Read the current homepage banner (admin only).
 */
export const GET = requireAdminMiddleware(async () => {
  const banner = await getSiteBanner()
  if (!banner) {
    return NextResponse.json(
      { error: "Failed to load site banner" },
      { status: 500 }
    )
  }
  return NextResponse.json({ banner })
})

/**
 * PUT /api/admin/site-banner
 * Update the homepage banner (admin only). Revalidates the homepage so the
 * change shows immediately instead of waiting out the ISR window.
 */
export const PUT = requireAdminMiddleware(async (req) => {
  try {
    const body = await req.json()
    const { enabled, title, message } = body

    if (typeof enabled !== "boolean") {
      return NextResponse.json(
        { error: "`enabled` must be a boolean" },
        { status: 400 }
      )
    }
    if (typeof title !== "string" || typeof message !== "string") {
      return NextResponse.json(
        { error: "`title` and `message` must be strings" },
        { status: 400 }
      )
    }
    // A banner that's switched on needs something to say.
    if (enabled && title.trim() === "" && message.trim() === "") {
      return NextResponse.json(
        { error: "Add a title or message before enabling the banner" },
        { status: 400 }
      )
    }

    const banner = await updateSiteBanner({
      enabled,
      title,
      message,
      updatedBy: req.user?.email ?? null,
    })

    if (!banner) {
      return NextResponse.json(
        { error: "Failed to update site banner" },
        { status: 500 }
      )
    }

    // The banner renders on the statically cached homepage.
    revalidatePath("/")
    return NextResponse.json({ banner })
  } catch (error) {
    console.error("Update site banner error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
})
