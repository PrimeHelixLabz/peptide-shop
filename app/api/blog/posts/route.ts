import { NextResponse } from "next/server"
import { z } from "zod"
import {
  requireAdminMiddleware,
  optionalAuthMiddleware,
  type AuthenticatedRequest,
} from "@/lib/auth/middleware"
import {
  createPostAsAdmin,
  getAllPostsAsAdmin,
  getPublishedPosts,
  getPostBySlugAsAdmin,
} from "@/lib/blog/db"
import {
  sanitizeBlogHtml,
  estimateReadMinutes,
  slugify,
} from "@/lib/blog/sanitize"

const postInputSchema = z.object({
  slug: z.string().trim().min(1, "Slug is required").max(120).regex(
    /^[a-z0-9-]+$/,
    "Slug may only contain lowercase letters, numbers, and hyphens"
  ),
  title: z.string().trim().min(1, "Title is required").max(200),
  description: z
    .string()
    .trim()
    .min(1, "Description is required")
    .max(500, "Description must be 500 characters or less"),
  bodyHtml: z.string().min(1, "Body is required"),
  featuredImage: z.string().url().nullable().optional(),
  authorName: z.string().trim().min(1).max(120).default("PrimeHelix Labz Research Team"),
  status: z.enum(["draft", "published"]).default("draft"),
  tags: z.array(z.string().trim().min(1).max(40)).max(10).default([]),
  readMinutes: z.number().int().min(1).max(120).optional(),
})

export const GET = optionalAuthMiddleware(async (req: AuthenticatedRequest) => {
  const includeDrafts = req.nextUrl.searchParams.get("includeDrafts") === "1"

  // Admins can request the full list; everyone else gets published only.
  if (includeDrafts && req.user?.role === "admin") {
    const posts = await getAllPostsAsAdmin()
    return NextResponse.json({ posts })
  }

  const posts = await getPublishedPosts()
  return NextResponse.json({ posts })
})

export const POST = requireAdminMiddleware(async (req: AuthenticatedRequest) => {
  let parsed: z.infer<typeof postInputSchema>
  try {
    const body = await req.json()
    parsed = postInputSchema.parse(body)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0]?.message ?? "Invalid input" },
        { status: 400 }
      )
    }
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }

  // Normalize the slug defensively even though zod constrained the shape.
  const slug = slugify(parsed.slug)
  if (!slug) {
    return NextResponse.json({ error: "Slug is required" }, { status: 400 })
  }

  // Slug uniqueness — surface a clean 409 rather than a Postgres error blob.
  const existing = await getPostBySlugAsAdmin(slug)
  if (existing) {
    return NextResponse.json(
      { error: "A post with that slug already exists" },
      { status: 409 }
    )
  }

  const sanitizedHtml = sanitizeBlogHtml(parsed.bodyHtml)
  const readMinutes = parsed.readMinutes ?? estimateReadMinutes(sanitizedHtml)

  try {
    const post = await createPostAsAdmin(
      {
        slug,
        title: parsed.title,
        description: parsed.description,
        bodyHtml: sanitizedHtml,
        featuredImage: parsed.featuredImage ?? null,
        authorName: parsed.authorName,
        status: parsed.status,
        tags: parsed.tags,
        readMinutes,
      },
      req.user!.id
    )
    return NextResponse.json({ post }, { status: 201 })
  } catch (error) {
    console.error("createPost failed:", error)
    return NextResponse.json({ error: "Could not create post" }, { status: 500 })
  }
})
