import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { z } from "zod"

const resetPasswordSchema = z.object({
  password: z.string().min(8, "Password must be at least 8 characters"),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { password } = resetPasswordSchema.parse(body)

    const supabase = await createClient()

    // Get the session to verify the user is authenticated (from the reset link)
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json(
        { error: "Invalid or expired reset token. Please request a new password reset." },
        { status: 401 }
      )
    }

    // Update password
    const { error: updateError } = await supabase.auth.updateUser({
      password: password,
    })

    if (updateError) {
      console.error("Reset password error:", updateError)
      return NextResponse.json(
        { error: "Failed to reset password. Please try again." },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, message: "Password has been reset successfully." })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0]?.message || "Validation error" },
        { status: 400 }
      )
    }

    console.error("Reset password error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
