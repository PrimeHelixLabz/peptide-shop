import { NextRequest, NextResponse } from "next/server"
import { requireAuthMiddleware } from "@/lib/auth/middleware"
import { createClient } from "@/lib/supabase/server"
import { z } from "zod"

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
})

export const POST = requireAuthMiddleware(async (req) => {
  try {
    const supabase = await createClient()
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()

    if (!authUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const body = await req.json()
    const { currentPassword, newPassword } = changePasswordSchema.parse(body)

    // Verify current password by attempting to sign in
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: authUser.email!,
      password: currentPassword,
    })

    if (signInError) {
      return NextResponse.json({ error: "Current password is incorrect" }, { status: 401 })
    }

    // Update password
    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    })

    if (updateError) {
      console.error("Update password error:", updateError)
      return NextResponse.json({ error: "Failed to update password" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      )
    }

    console.error("Change password error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
})
