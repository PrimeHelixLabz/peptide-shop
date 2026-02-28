import { NextRequest, NextResponse } from "next/server"
import { requireAuthMiddleware } from "@/lib/auth/middleware"
import { createClient } from "@/lib/supabase/server"
import { z } from "zod"

const updateProfileSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  email: z.string().email().optional(),
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
  // Avatar is stored as a Supabase Storage path (not a full URL).
  // Allow null or empty string to clear the avatar.
  avatar: z.string().optional().nullable(),
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

    // Update email in Supabase Auth if provided
    if (data.email !== undefined && data.email !== authUser.email) {
      const { error: emailError } = await supabase.auth.updateUser({
        email: data.email,
      })

      if (emailError) {
        console.error("Update email error:", emailError)
        return NextResponse.json(
          { error: emailError.message || "Failed to update email" },
          { status: 400 }
        )
      }
    }

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
      // Treat empty string as null (clear avatar)
      updateData.avatar = data.avatar || null
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

    // Get updated user to reflect email change
    const {
      data: { user: updatedUser },
    } = await supabase.auth.getUser()

    return NextResponse.json({
      profile: {
        id: updatedUser?.id || authUser.id,
        email: updatedUser?.email || authUser.email,
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
