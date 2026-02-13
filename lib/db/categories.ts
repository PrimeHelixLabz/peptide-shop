/**
 * Categories Database Functions
 * 
 * Server-side functions for category management
 */

import { createPublicClient } from "@/lib/supabase/public"
import { createClient } from "@/lib/supabase/server"

export interface Category {
  id: string
  name: string
  slug: string
  description?: string
  image?: string
  displayOrder: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

// Helper to convert database row to Category
function rowToCategory(row: any): Category {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description || undefined,
    image: row.image || undefined,
    displayOrder: row.display_order || 0,
    isActive: row.is_active ?? true,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

/**
 * Get all active categories (public)
 */
export async function getCategories(): Promise<Category[]> {
  const supabase = createPublicClient()
  
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .eq("is_active", true)
    .order("display_order", { ascending: true })
    .order("name", { ascending: true })

  if (error) {
    console.error("Error fetching categories:", error)
    return []
  }

  return (data || []).map(rowToCategory)
}

/**
 * Get all categories including inactive ones (admin only)
 */
export async function getAllCategories(): Promise<Category[]> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .order("display_order", { ascending: true })
    .order("name", { ascending: true })

  if (error) {
    console.error("Error fetching all categories:", error)
    return []
  }

  return (data || []).map(rowToCategory)
}

/**
 * Get a single category by ID
 */
export async function getCategoryById(id: string): Promise<Category | null> {
  const supabase = createPublicClient()
  
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .eq("id", id)
    .single()

  if (error || !data) {
    return null
  }

  return rowToCategory(data)
}

/**
 * Get a category by slug
 */
export async function getCategoryBySlug(slug: string): Promise<Category | null> {
  const supabase = createPublicClient()
  
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .eq("slug", slug)
    .eq("is_active", true)
    .single()

  if (error || !data) {
    return null
  }

  return rowToCategory(data)
}
