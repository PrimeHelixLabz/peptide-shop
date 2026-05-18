import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { z } from "zod"
import { enforceRateLimit } from "@/lib/rate-limit"

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(2),
})

export async function POST(request: NextRequest) {
  // 3 sign-ups / hour / IP — stops automated account-farming.
  const limited = await enforceRateLimit(request, {
    key: "auth:register",
    limit: 3,
    windowSec: 60 * 60,
  })
  if (limited) return limited

  try {
    const body = await request.json()
    const { email, password, name } = registerSchema.parse(body)

    const supabase = await createClient()

    // Sign up user with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
        },
      },
    })

    if (authError) {
      if (authError.message.includes("already registered")) {
        return NextResponse.json({ error: "User already exists" }, { status: 409 })
      }
      return NextResponse.json({ error: authError.message }, { status: 400 })
    }

    if (!authData.user) {
      return NextResponse.json({ error: "Failed to create user" }, { status: 500 })
    }

    // Get session
    const {
      data: { session },
    } = await supabase.auth.getSession()

    // Get user profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", authData.user.id)
      .single()

    return NextResponse.json(
      {
        user: {
          id: authData.user.id,
          email: authData.user.email,
          name: profile?.name || name,
          role: profile?.role || "user",
        },
        session,
      },
      { status: 201 }
    )
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      )
    }

    console.error("Registration error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
