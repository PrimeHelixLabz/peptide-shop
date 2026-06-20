export type BlogPostStatus = "draft" | "published"

/**
 * Public blog post shape returned by reads. body_html is sanitized HTML
 * suitable for dangerouslySetInnerHTML; never re-sanitize at render.
 */
export interface BlogPost {
  id: string
  slug: string
  title: string
  description: string
  bodyHtml: string
  featuredImage: string | null
  authorName: string
  authorUserId: string | null
  status: BlogPostStatus
  tags: string[]
  readMinutes: number
  publishedAt: string | null
  /** When the new-post announcement email was sent. Null = never sent. */
  announcementSentAt: string | null
  createdAt: string
  updatedAt: string
}

/** Lightweight summary used by the index page and admin list. */
export interface BlogPostSummary {
  id: string
  slug: string
  title: string
  description: string
  featuredImage: string | null
  authorName: string
  status: BlogPostStatus
  tags: string[]
  readMinutes: number
  publishedAt: string | null
  createdAt: string
  updatedAt: string
}

/** Shape accepted by the create/update API. body_html is pre-sanitize. */
export interface BlogPostInput {
  slug: string
  title: string
  description: string
  bodyHtml: string
  featuredImage: string | null
  authorName: string
  status: BlogPostStatus
  tags: string[]
  readMinutes: number
}
