import { createAdminClient } from "@/lib/supabase/admin"
import { createPublicClient } from "@/lib/supabase/public"
import type {
  BlogPost,
  BlogPostInput,
  BlogPostStatus,
  BlogPostSummary,
} from "@/lib/blog/types"

interface BlogPostRow {
  id: string
  slug: string
  title: string
  description: string
  body_html: string
  featured_image: string | null
  author_name: string
  author_user_id: string | null
  status: BlogPostStatus
  tags: string[]
  read_minutes: number
  published_at: string | null
  created_at: string
  updated_at: string
}

function rowToPost(row: BlogPostRow): BlogPost {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    bodyHtml: row.body_html,
    featuredImage: row.featured_image,
    authorName: row.author_name,
    authorUserId: row.author_user_id,
    status: row.status,
    tags: row.tags || [],
    readMinutes: row.read_minutes,
    publishedAt: row.published_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function rowToSummary(row: BlogPostRow): BlogPostSummary {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    featuredImage: row.featured_image,
    authorName: row.author_name,
    status: row.status,
    tags: row.tags || [],
    readMinutes: row.read_minutes,
    publishedAt: row.published_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

const POST_SELECT =
  "id, slug, title, description, body_html, featured_image, author_name, author_user_id, status, tags, read_minutes, published_at, created_at, updated_at"

/** Public reads: published posts only, newest first. Uses the anon client. */
export async function getPublishedPosts(): Promise<BlogPostSummary[]> {
  const supabase = createPublicClient()
  const { data, error } = await supabase
    .from("blog_posts")
    .select(POST_SELECT)
    .eq("status", "published")
    .order("published_at", { ascending: false })

  if (error) {
    console.error("getPublishedPosts failed:", error)
    return []
  }
  return ((data as unknown as BlogPostRow[]) || []).map(rowToSummary)
}

/**
 * Paginated public reads. Returns a page of published posts plus the
 * total count so the index page can render Prev/Next without a second
 * round trip. `page` is 1-indexed; out-of-range pages return an empty
 * array (the index page should redirect or clamp before calling).
 */
export async function getPublishedPostsPaged(
  page: number,
  pageSize: number
): Promise<{ posts: BlogPostSummary[]; total: number }> {
  const supabase = createPublicClient()
  const safePage = Math.max(1, Math.floor(page))
  const safePageSize = Math.max(1, Math.min(50, Math.floor(pageSize)))
  const from = (safePage - 1) * safePageSize
  const to = from + safePageSize - 1

  const { data, error, count } = await supabase
    .from("blog_posts")
    .select(POST_SELECT, { count: "exact" })
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .range(from, to)

  if (error) {
    console.error("getPublishedPostsPaged failed:", error)
    return { posts: [], total: 0 }
  }
  const posts = ((data as unknown as BlogPostRow[]) || []).map(rowToSummary)
  return { posts, total: count ?? 0 }
}

/** Public read: single published post by slug. */
export async function getPublishedPostBySlug(
  slug: string
): Promise<BlogPost | null> {
  const supabase = createPublicClient()
  const { data, error } = await supabase
    .from("blog_posts")
    .select(POST_SELECT)
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle()

  if (error) {
    console.error("getPublishedPostBySlug failed:", error)
    return null
  }
  if (!data) return null
  return rowToPost(data as unknown as BlogPostRow)
}

/** Admin reads: ALL posts (draft + published). Uses the service role. */
export async function getAllPostsAsAdmin(): Promise<BlogPostSummary[]> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from("blog_posts")
    .select(POST_SELECT)
    .order("updated_at", { ascending: false })

  if (error) {
    console.error("getAllPostsAsAdmin failed:", error)
    return []
  }
  return ((data as unknown as BlogPostRow[]) || []).map(rowToSummary)
}

export async function getPostByIdAsAdmin(id: string): Promise<BlogPost | null> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from("blog_posts")
    .select(POST_SELECT)
    .eq("id", id)
    .maybeSingle()

  if (error) {
    console.error("getPostByIdAsAdmin failed:", error)
    return null
  }
  if (!data) return null
  return rowToPost(data as unknown as BlogPostRow)
}

export async function createPostAsAdmin(
  input: BlogPostInput,
  authorUserId: string | null
): Promise<BlogPost> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from("blog_posts")
    .insert({
      slug: input.slug,
      title: input.title,
      description: input.description,
      body_html: input.bodyHtml,
      featured_image: input.featuredImage,
      author_name: input.authorName,
      author_user_id: authorUserId,
      status: input.status,
      tags: input.tags,
      read_minutes: input.readMinutes,
    })
    .select(POST_SELECT)
    .single()

  if (error) throw error
  return rowToPost(data as unknown as BlogPostRow)
}

export async function updatePostAsAdmin(
  id: string,
  input: Partial<BlogPostInput>
): Promise<BlogPost> {
  const supabase = createAdminClient()
  const updates: Record<string, unknown> = {}
  if (input.slug !== undefined) updates.slug = input.slug
  if (input.title !== undefined) updates.title = input.title
  if (input.description !== undefined) updates.description = input.description
  if (input.bodyHtml !== undefined) updates.body_html = input.bodyHtml
  if (input.featuredImage !== undefined) updates.featured_image = input.featuredImage
  if (input.authorName !== undefined) updates.author_name = input.authorName
  if (input.status !== undefined) updates.status = input.status
  if (input.tags !== undefined) updates.tags = input.tags
  if (input.readMinutes !== undefined) updates.read_minutes = input.readMinutes

  const { data, error } = await supabase
    .from("blog_posts")
    .update(updates)
    .eq("id", id)
    .select(POST_SELECT)
    .single()

  if (error) throw error
  return rowToPost(data as unknown as BlogPostRow)
}

export async function deletePostAsAdmin(id: string): Promise<void> {
  const supabase = createAdminClient()
  const { error } = await supabase.from("blog_posts").delete().eq("id", id)
  if (error) throw error
}

export async function getPublishedSlugs(): Promise<string[]> {
  const supabase = createPublicClient()
  const { data, error } = await supabase
    .from("blog_posts")
    .select("slug")
    .eq("status", "published")
  if (error) return []
  return ((data as unknown as { slug: string }[]) || []).map((r) => r.slug)
}

/** Existence check used by the admin form for slug-uniqueness UX. */
export async function getPostBySlugAsAdmin(
  slug: string
): Promise<{ id: string } | null> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from("blog_posts")
    .select("id")
    .eq("slug", slug)
    .maybeSingle()
  return (data as unknown as { id: string } | null) ?? null
}
