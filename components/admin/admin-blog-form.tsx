"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { toast } from "sonner"
import { ArrowLeft, Trash2, ImagePlus, X, Save, Eye } from "lucide-react"
import type { BlogPost, BlogPostStatus } from "@/lib/blog/types"
import { RichTextEditor } from "@/components/common/rich-text-editor"
import { slugify } from "@/lib/blog/sanitize"

interface AdminBlogFormProps {
  initial?: BlogPost
}

interface FormState {
  title: string
  slug: string
  slugManuallyEdited: boolean
  description: string
  bodyHtml: string
  featuredImage: string | null
  authorName: string
  status: BlogPostStatus
  tagsInput: string
}

function postToForm(p?: BlogPost): FormState {
  return {
    title: p?.title || "",
    slug: p?.slug || "",
    slugManuallyEdited: !!p?.slug,
    description: p?.description || "",
    bodyHtml: p?.bodyHtml || "",
    featuredImage: p?.featuredImage ?? null,
    authorName: p?.authorName || "PrimeHelix Labz Research Team",
    status: p?.status || "draft",
    tagsInput: (p?.tags || []).join(", "),
  }
}

export function AdminBlogForm({ initial }: AdminBlogFormProps) {
  const router = useRouter()
  const [form, setForm] = useState<FormState>(postToForm(initial))
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const isEdit = !!initial

  // Auto-slug from title until the admin types in the slug field directly.
  useEffect(() => {
    if (form.slugManuallyEdited) return
    const derived = slugify(form.title)
    if (derived !== form.slug) {
      setForm((prev) => ({ ...prev, slug: derived }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.title, form.slugManuallyEdited])

  const handleFeaturedImageUpload = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Featured image must be an image file")
      return
    }
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append("file", file)
      fd.append("kind", "blog")
      const res = await fetch("/api/upload", { method: "POST", body: fd })
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string }
        toast.error("Upload failed", { description: err.error || "Try again." })
        return
      }
      const data = (await res.json()) as { url: string }
      setForm((prev) => ({ ...prev, featuredImage: data.url }))
    } catch (err) {
      console.error("featured image upload failed", err)
      toast.error("Upload failed")
    } finally {
      setUploading(false)
    }
  }, [])

  const buildPayload = useCallback(
    (status: BlogPostStatus) => {
      const tags = form.tagsInput
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean)
        .slice(0, 10)

      return {
        slug: form.slug,
        title: form.title.trim(),
        description: form.description.trim(),
        bodyHtml: form.bodyHtml,
        featuredImage: form.featuredImage,
        authorName: form.authorName.trim() || "PrimeHelix Labz Research Team",
        status,
        tags,
      }
    },
    [form]
  )

  const submit = useCallback(
    async (status: BlogPostStatus) => {
      if (!form.title.trim()) {
        toast.error("Title is required")
        return
      }
      if (!form.slug) {
        toast.error("Slug is required")
        return
      }
      if (!form.description.trim()) {
        toast.error("Description is required")
        return
      }
      if (!form.bodyHtml || form.bodyHtml.replace(/<[^>]+>/g, "").trim() === "") {
        toast.error("Body is required")
        return
      }

      setSaving(true)
      try {
        const payload = buildPayload(status)
        const res = isEdit
          ? await fetch(`/api/blog/posts/${initial!.id}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            })
          : await fetch("/api/blog/posts", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            })

        const data = (await res.json().catch(() => ({}))) as {
          error?: string
          post?: BlogPost
        }
        if (!res.ok) {
          toast.error(data.error || "Could not save post")
          return
        }
        toast.success(
          status === "published"
            ? "Post published"
            : isEdit
              ? "Draft saved"
              : "Draft created"
        )
        if (!isEdit && data.post) {
          router.push(`/admin/blog/${data.post.id}/edit`)
        } else {
          router.refresh()
        }
      } catch (err) {
        console.error(err)
        toast.error("Network error")
      } finally {
        setSaving(false)
      }
    },
    [buildPayload, form, initial, isEdit, router]
  )

  const handleDelete = useCallback(async () => {
    if (!initial) return
    if (!confirm("Delete this post? This cannot be undone.")) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/blog/posts/${initial.id}`, {
        method: "DELETE",
      })
      if (!res.ok) {
        toast.error("Could not delete post")
        return
      }
      toast.success("Post deleted")
      router.push("/admin/blog")
    } catch (err) {
      console.error(err)
      toast.error("Network error")
    } finally {
      setDeleting(false)
    }
  }, [initial, router])

  const previewHref =
    initial && initial.status === "published"
      ? `/blog/${initial.slug}`
      : null

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/admin/blog"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to posts
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          {previewHref && (
            <Link
              href={previewHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-2xl border border-border bg-white px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-gray-50"
            >
              <Eye className="h-4 w-4" />
              View live
            </Link>
          )}
          <button
            type="button"
            onClick={() => submit("draft")}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-2xl border border-border bg-white px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-gray-50 disabled:opacity-60"
          >
            <Save className="h-4 w-4" />
            Save draft
          </button>
          <button
            type="button"
            onClick={() => submit("published")}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-2xl bg-primary px-5 py-2 text-sm font-medium text-white transition-all duration-200 hover:brightness-110 active:scale-95 disabled:opacity-60"
          >
            {form.status === "published" || isEdit ? "Publish / update" : "Publish"}
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* Main column */}
        <div className="flex flex-col gap-5">
          {/* Title */}
          <div className="rounded-2xl bg-white p-5 shadow-[0_10px_30px_rgba(0,0,0,0.05)] dark:bg-gray-900">
            <label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Title
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, title: e.target.value }))
              }
              placeholder="A clear, search-friendly title"
              className="mt-2 block w-full rounded-xl border border-border bg-background px-4 py-3 text-lg font-semibold text-foreground placeholder:text-muted-foreground focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
            />
          </div>

          {/* Description */}
          <div className="rounded-2xl bg-white p-5 shadow-[0_10px_30px_rgba(0,0,0,0.05)] dark:bg-gray-900">
            <label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Description (used for SEO meta and card preview)
            </label>
            <textarea
              value={form.description}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, description: e.target.value }))
              }
              rows={3}
              maxLength={500}
              placeholder="One or two sentences that summarize the article. Shows in search results."
              className="mt-2 block w-full rounded-xl border border-border bg-background px-4 py-3 text-sm leading-relaxed text-foreground placeholder:text-muted-foreground focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
            />
            <p className="mt-1 text-[11px] text-muted-foreground">
              {form.description.length} / 500
            </p>
          </div>

          {/* Body */}
          <div className="rounded-2xl bg-white p-5 shadow-[0_10px_30px_rgba(0,0,0,0.05)] dark:bg-gray-900">
            <RichTextEditor
              label="Body"
              value={form.bodyHtml}
              onChange={(html) =>
                setForm((prev) => ({ ...prev, bodyHtml: html }))
              }
              helperText="Use headings, lists, links, and blockquotes to structure the article. Images can be added as the featured image at right."
            />
          </div>

          {isEdit && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="inline-flex items-center gap-2 rounded-2xl border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-60"
              >
                <Trash2 className="h-4 w-4" />
                Delete post
              </button>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <aside className="flex flex-col gap-5">
          {/* Status / publishing */}
          <div className="rounded-2xl bg-white p-5 shadow-[0_10px_30px_rgba(0,0,0,0.05)] dark:bg-gray-900">
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Status
            </p>
            <p className="mt-2 text-sm">
              <span
                className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
                  form.status === "published"
                    ? "bg-green-100 text-green-800"
                    : "bg-amber-100 text-amber-800"
                }`}
              >
                {form.status}
              </span>
            </p>
            <p className="mt-3 text-xs text-muted-foreground">
              Use <strong>Save draft</strong> to keep working privately.{" "}
              <strong>Publish</strong> makes it live at <code>/blog/{form.slug || "your-slug"}</code>.
            </p>
          </div>

          {/* Slug */}
          <div className="rounded-2xl bg-white p-5 shadow-[0_10px_30px_rgba(0,0,0,0.05)] dark:bg-gray-900">
            <label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              URL slug
            </label>
            <div className="mt-2 flex items-center rounded-xl border border-border bg-background">
              <span className="px-3 py-2.5 text-xs text-muted-foreground">
                /blog/
              </span>
              <input
                type="text"
                value={form.slug}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    slug: slugify(e.target.value),
                    slugManuallyEdited: true,
                  }))
                }
                placeholder="post-url-slug"
                className="flex-1 bg-transparent py-2.5 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
              />
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Auto-derived from title until edited. Lowercase letters,
              numbers, and hyphens only.
            </p>
          </div>

          {/* Featured image */}
          <div className="rounded-2xl bg-white p-5 shadow-[0_10px_30px_rgba(0,0,0,0.05)] dark:bg-gray-900">
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Featured image
            </p>
            {form.featuredImage ? (
              <div className="relative mt-3 overflow-hidden rounded-xl border border-border">
                <Image
                  src={form.featuredImage}
                  alt="Featured"
                  width={800}
                  height={500}
                  className="h-auto w-full object-cover"
                  unoptimized={form.featuredImage.includes("supabase")}
                />
                <button
                  type="button"
                  onClick={() =>
                    setForm((prev) => ({ ...prev, featuredImage: null }))
                  }
                  className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-foreground backdrop-blur-sm transition-colors hover:bg-white"
                  aria-label="Remove featured image"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-background py-8 text-sm text-muted-foreground transition-colors hover:bg-gray-50 disabled:opacity-60"
              >
                <ImagePlus className="h-4 w-4" />
                {uploading ? "Uploading…" : "Upload image"}
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) handleFeaturedImageUpload(f)
                e.target.value = ""
              }}
            />
          </div>

          {/* Tags */}
          <div className="rounded-2xl bg-white p-5 shadow-[0_10px_30px_rgba(0,0,0,0.05)] dark:bg-gray-900">
            <label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Tags (comma-separated)
            </label>
            <input
              type="text"
              value={form.tagsInput}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, tagsInput: e.target.value }))
              }
              placeholder="BPC-157, tissue repair, research overview"
              className="mt-2 block w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
            />
            <p className="mt-1 text-[11px] text-muted-foreground">
              Up to 10 tags. Shown on the post and used to group related reading.
            </p>
          </div>

          {/* Author */}
          <div className="rounded-2xl bg-white p-5 shadow-[0_10px_30px_rgba(0,0,0,0.05)] dark:bg-gray-900">
            <label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Author byline
            </label>
            <input
              type="text"
              value={form.authorName}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, authorName: e.target.value }))
              }
              className="mt-2 block w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
            />
          </div>
        </aside>
      </div>
    </div>
  )
}
