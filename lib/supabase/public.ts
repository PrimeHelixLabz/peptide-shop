/**
 * Supabase Public Client
 * 
 * Public read-only client for server components that don't need authentication
 * Use this for public data like products, categories, etc.
 * This client doesn't use cookies, so it's safe for static generation
 */

import { createClient as createSupabaseClient } from "@supabase/supabase-js"

let publicClient: ReturnType<typeof createSupabaseClient> | null = null

export function createPublicClient() {
  if (publicClient) {
    return publicClient
  }

  publicClient = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  )

  return publicClient
}
