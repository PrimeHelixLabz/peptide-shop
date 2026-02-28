import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { z } from "zod"

const forgotPasswordSchema = z.object({
  email: z.string().email(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email } = forgotPasswordSchema.parse(body)

    const supabase = await createClient()

    // Request password reset
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${siteUrl}/reset-password`,
    })

    if (error) {
      console.error("Forgot password error:", error)
      // Don't reveal if email exists or not for security
      return NextResponse.json(
        { message: "If an account exists with this email, a password reset link has been sent." },
        { status: 200 }
      )
    }

    // Always return success message (security best practice)
    return NextResponse.json({
      message: "If an account exists with this email, a password reset link has been sent.",
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid email address" },
        { status: 400 }
      )
    }

    console.error("Forgot password error:", error)
    return NextResponse.json(
      { message: "If an account exists with this email, a password reset link has been sent." },
      { status: 200 }
    )
  }
}
