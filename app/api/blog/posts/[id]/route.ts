import { NextResponse } from "next/server"
import { z } from "zod"
import {
  requireAdminMiddleware,
  type AuthenticatedRequest,
} from "@/lib/auth/middleware"
import {
  deletePostAsAdmin,
  getPostByIdAsAdmin,
  getPostBySlugAsAdmin,
  updatePostAsAdmin,
} from "@/lib/blog/db"
import {
  sanitizeBlogHtml,
  estimateReadMinutes,
  slugify,
} from "@/lib/blog/sanitize"

const updateSchema = z.object({
  slug: z.string().trim().min(1).max(120).regex(/^[a-z0-9-]+$/).optional(),
  title: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().min(1).max(500).optional(),
  bodyHtml: z.string().min(1).optional(),
  featuredImage: z.string().url().nullable().optional(),
  authorName: z.string().trim().min(1).max(120).optional(),
  status: z.enum(["draft", "published"]).optional(),
  tags: z.array(z.string().trim().min(1).max(40)).max(10).optional(),
  readMinutes: z.number().int().min(1).max(120).optional(),
})

type RouteContext = { params: Promise<{ id: string }> }

export const GET = requireAdminMiddleware(async (_req: AuthenticatedRequest, context: RouteContext) => {
  const { id } = await context.params
  const post = await getPostByIdAsAdmin(id)
  if (!post) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 })
  }
  return NextResponse.json({ post })
})

export const PUT = requireAdminMiddleware(async (req: AuthenticatedRequest, context: RouteContext) => {
  const { id } = await context.params

  let parsed: z.infer<typeof updateSchema>
  try {
    const body = await req.json()
    parsed = updateSchema.parse(body)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0]?.message ?? "Invalid input" },
        { status: 400 }
      )
    }
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }

  const existing = await getPostByIdAsAdmin(id)
  if (!existing) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 })
  }

  const updates: Parameters<typeof updatePostAsAdmin>[1] = {}

  if (parsed.slug !== undefined) {
    const slug = slugify(parsed.slug)
    if (!slug) {
      return NextResponse.json({ error: "Slug is required" }, { status: 400 })
    }
    if (slug !== existing.slug) {
      const conflict = await getPostBySlugAsAdmin(slug)
      if (conflict && conflict.id !== id) {
        return NextResponse.json(
          { error: "A post with that slug already exists" },
          { status: 409 }
        )
      }
    }
    updates.slug = slug
  }

  if (parsed.title !== undefined) updates.title = parsed.title
  if (parsed.description !== undefined) updates.description = parsed.description
  if (parsed.featuredImage !== undefined) updates.featuredImage = parsed.featuredImage
  if (parsed.authorName !== undefined) updates.authorName = parsed.authorName
  if (parsed.status !== undefined) updates.status = parsed.status
  if (parsed.tags !== undefined) updates.tags = parsed.tags

  if (parsed.bodyHtml !== undefined) {
    const sanitized = sanitizeBlogHtml(parsed.bodyHtml)
    updates.bodyHtml = sanitized
    // Recompute read time unless the caller explicitly set it.
    if (parsed.readMinutes === undefined) {
      updates.readMinutes = estimateReadMinutes(sanitized)
    }
  }
  if (parsed.readMinutes !== undefined) {
    updates.readMinutes = parsed.readMinutes
  }

  try {
    const post = await updatePostAsAdmin(id, updates)
    return NextResponse.json({ post })
  } catch (error) {
    console.error("updatePost failed:", error)
    return NextResponse.json({ error: "Could not update post" }, { status: 500 })
  }
})

export const DELETE = requireAdminMiddleware(async (_req: AuthenticatedRequest, context: RouteContext) => {
  const { id } = await context.params

  try {
    await deletePostAsAdmin(id)
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("deletePost failed:", error)
    return NextResponse.json({ error: "Could not delete post" }, { status: 500 })
  }
})
