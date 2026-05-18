import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { z } from "zod"
import { enforceRateLimit } from "@/lib/rate-limit"

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
})

export async function POST(request: NextRequest) {
  // 5 attempts / minute / IP — protects against credential-stuffing.
  const limited = await enforceRateLimit(request, {
    key: "auth:login",
    limit: 5,
    windowSec: 60,
  })
  if (limited) return limited

  try {
    const body = await request.json()
    const { email, password } = loginSchema.parse(body)

    const supabase = await createClient()

    // Sign in user with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (authError) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
    }

    if (!authData.user) {
      return NextResponse.json({ error: "Failed to sign in" }, { status: 500 })
    }

    // Get user profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", authData.user.id)
      .single()

    return NextResponse.json({
      user: {
        id: authData.user.id,
        email: authData.user.email,
        name: profile?.name || authData.user.email,
        role: profile?.role || "user",
      },
      session: authData.session,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      )
    }

    console.error("Login error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
