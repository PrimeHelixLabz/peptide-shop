import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { requireAdminMiddleware } from "@/lib/auth/middleware"

/**
 * GET /api/categories
 * Get all active categories (public) or all categories (admin)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    // Check if user is admin
    let isAdmin = false
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single()
      
      isAdmin = profile?.role === "admin"
    }

    // If admin, get all categories; otherwise only active ones
    const query = supabase
      .from("categories")
      .select("*")
      .order("display_order", { ascending: true })
      .order("name", { ascending: true })

    if (!isAdmin) {
      query.eq("is_active", true)
    }

    const { data: categories, error } = await query

    if (error) {
      console.error("Error fetching categories:", error)
      return NextResponse.json(
        { error: "Failed to fetch categories" },
        { status: 500 }
      )
    }

    return NextResponse.json({ categories: categories || [] })
  } catch (error) {
    console.error("Get categories error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

/**
 * POST /api/categories
 * Create a new category (admin only)
 */
export const POST = requireAdminMiddleware(async (req) => {
  try {
    const supabase = await createClient()
    const body = await req.json()
    const { name, description, image, display_order, is_active } = body

    if (!name || typeof name !== "string" || name.trim() === "") {
      return NextResponse.json(
        { error: "Category name is required" },
        { status: 400 }
      )
    }

    const { data: category, error } = await supabase
      .from("categories")
      .insert({
        name: name.trim(),
        description: description?.trim() || null,
        image: image?.trim() || null,
        display_order: display_order ?? 0,
        is_active: is_active !== undefined ? is_active : true,
      })
      .select()
      .single()

    if (error) {
      console.error("Error creating category:", error)
      return NextResponse.json(
        { error: "Failed to create category" },
        { status: 500 }
      )
    }

    return NextResponse.json({ category }, { status: 201 })
  } catch (error) {
    console.error("Create category error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
})
