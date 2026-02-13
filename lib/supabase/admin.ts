/**
 * Supabase Admin Client
 * 
 * Server-side Supabase client with admin privileges using Secret Key
 * Use this only for operations that require bypassing RLS policies
 */

import { createClient as createSupabaseClient } from "@supabase/supabase-js"

export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY!

  if (!supabaseSecretKey) {
    throw new Error("SUPABASE_SECRET_KEY is required for admin operations")
  }

  return createSupabaseClient(supabaseUrl, supabaseSecretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
