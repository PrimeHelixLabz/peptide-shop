/**
 * Supabase Authentication
 * 
 * Authentication utilities using Supabase Auth
 */

import { createClient } from "@/lib/supabase/server"
import type { User } from "@/lib/db/schema"

export interface AuthUser {
  id: string
  email: string
  role: string
}

/**
 * Get current authenticated user from Supabase session
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) return null

  // Get user profile with role
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  return {
    id: user.id,
    email: user.email!,
    role: profile?.role || "user",
  }
}

/**
 * Check if user is authenticated
 */
export async function requireAuth(): Promise<AuthUser> {
  const user = await getCurrentUser()
  if (!user) {
    throw new Error("Unauthorized")
  }
  return user
}

/**
 * Check if user is admin
 */
export async function requireAdmin(): Promise<AuthUser> {
  const user = await requireAuth()
  if (user.role !== "admin") {
    throw new Error("Forbidden")
  }
  return user
}
