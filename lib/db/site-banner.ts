/**
 * Site Banner Database Functions
 *
 * A single admin-editable announcement shown at the top of the homepage.
 * Backed by the singleton `site_banner` table (see migration 050). Read is
 * public (anon client, safe for the statically cached homepage); write is
 * admin-only and goes through the authenticated server client + RLS.
 */

import { createPublicClient } from "@/lib/supabase/public"
import { createClient } from "@/lib/supabase/server"

export interface SiteBanner {
  enabled: boolean
  title: string
  message: string
  updatedAt: string
}

function rowToBanner(row: any): SiteBanner {
  return {
    enabled: row.enabled ?? false,
    title: row.title ?? "",
    message: row.message ?? "",
    updatedAt: row.updated_at,
  }
}

/** The singleton row's fixed primary key (see migration 050). */
const BANNER_ID = true

/**
 * Read the site banner. Returns null only if the row is missing or the read
 * fails — callers should treat null as "no banner" and render nothing.
 */
export async function getSiteBanner(): Promise<SiteBanner | null> {
  const supabase = createPublicClient()

  const { data, error } = await supabase
    .from("site_banner")
    .select("*")
    .eq("id", BANNER_ID)
    .single()

  if (error || !data) {
    if (error) console.error("Error fetching site banner:", error)
    return null
  }

  return rowToBanner(data)
}

export interface UpdateSiteBannerInput {
  enabled: boolean
  title: string
  message: string
  updatedBy?: string | null
}

/**
 * Update the singleton banner row (admin only — RLS enforces the role).
 * Returns the updated banner, or null if the write failed.
 */
export async function updateSiteBanner(
  input: UpdateSiteBannerInput
): Promise<SiteBanner | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("site_banner")
    .update({
      enabled: input.enabled,
      title: input.title.trim(),
      message: input.message.trim(),
      updated_at: new Date().toISOString(),
      updated_by: input.updatedBy ?? null,
    })
    .eq("id", BANNER_ID)
    .select()
    .single()

  if (error || !data) {
    if (error) console.error("Error updating site banner:", error)
    return null
  }

  return rowToBanner(data)
}
