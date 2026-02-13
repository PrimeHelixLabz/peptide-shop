import { NextRequest, NextResponse } from "next/server"
import { requireAuthMiddleware } from "@/lib/auth/middleware"
import { createClient } from "@/lib/supabase/server"
import { z } from "zod"

const updateProfileSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  phone: z.string().max(20).optional().nullable(),
  address: z
    .object({
      street: z.string().min(1),
      city: z.string().min(1),
      state: z.string().min(1),
      zipCode: z.string().min(1),
      country: z.string().min(1),
    })
    .optional()
    .nullable(),
  avatar: z.string().url().optional().nullable(),
})

export const GET = requireAuthMiddleware(async (req) => {
  try {
    const supabase = await createClient()
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()

    if (!authUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Get user profile
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", authUser.id)
      .single()

    if (error) {
      console.error("Get profile error:", error)
      return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 })
    }

    return NextResponse.json({
      profile: {
        id: authUser.id,
        email: authUser.email,
        name: profile?.name || authUser.email,
        role: profile?.role || "user",
        avatar: profile?.avatar || null,
        phone: profile?.phone || null,
        address: profile?.address || null,
      },
    })
  } catch (error) {
    console.error("Get profile error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
})

export const PUT = requireAuthMiddleware(async (req) => {
  try {
    const supabase = await createClient()
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()

    if (!authUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const body = await req.json()
    const data = updateProfileSchema.parse(body)

    // Update profile
    const updateData: any = {
      updated_at: new Date().toISOString(),
    }

    if (data.name !== undefined) {
      updateData.name = data.name
    }
    if (data.phone !== undefined) {
      updateData.phone = data.phone
    }
    if (data.address !== undefined) {
      updateData.address = data.address
    }
    if (data.avatar !== undefined) {
      updateData.avatar = data.avatar
    }

    const { data: profile, error } = await supabase
      .from("profiles")
      .update(updateData)
      .eq("id", authUser.id)
      .select()
      .single()

    if (error) {
      console.error("Update profile error:", error)
      return NextResponse.json({ error: "Failed to update profile" }, { status: 500 })
    }

    return NextResponse.json({
      profile: {
        id: authUser.id,
        email: authUser.email,
        name: profile.name,
        role: profile.role,
        avatar: profile.avatar || null,
        phone: profile.phone || null,
        address: profile.address || null,
      },
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      )
    }

    console.error("Update profile error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
})
