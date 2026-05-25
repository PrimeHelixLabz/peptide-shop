"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { toast } from "sonner"
import { ArrowLeft, Trash2, ImagePlus, X, Save, Eye } from "lucide-react"
import type { BlogPost, BlogPostStatus } from "@/lib/blog/types"
import { AdminCard } from "@/components/common/admin-card"
import { FormInput } from "@/components/common/form-input"
import { FormTextarea } from "@/components/common/form-textarea"
import { StatusBadge, type StatusVariant } from "@/components/common/status-badge"
import { Button } from "@/components/ui/button"
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

const STATUS_VARIANT: Record<BlogPostStatus, StatusVariant> = {
  draft: "warning",
  published: "success",
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
        <Button asChild variant="ghost" size="sm">
          <Link href="/admin/blog">
            <ArrowLeft />
            Back to posts
          </Link>
        </Button>
        <div className="flex flex-wrap items-center gap-2">
          {previewHref && (
            <Button asChild variant="outline" size="sm">
              <Link href={previewHref} target="_blank" rel="noopener noreferrer">
                <Eye />
                View live
              </Link>
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => submit("draft")}
            disabled={saving}
          >
            <Save />
            Save draft
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => submit("published")}
            disabled={saving}
          >
            {form.status === "published" || isEdit ? "Publish / update" : "Publish"}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* Main column */}
        <div className="flex flex-col gap-5">
          <AdminCard title="Title">
            <FormInput
              value={form.title}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, title: e.target.value }))
              }
              placeholder="A clear, search-friendly title"
            />
          </AdminCard>

          <AdminCard title="Description">
            <FormTextarea
              value={form.description}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, description: e.target.value }))
              }
              rows={3}
              maxLength={500}
              placeholder="One or two sentences that summarize the article. Shows in search results and on the blog index card."
              helperText={`${form.description.length} / 500 — used for SEO meta and card preview`}
            />
          </AdminCard>

          <AdminCard title="Body">
            <RichTextEditor
              value={form.bodyHtml}
              onChange={(html) =>
                setForm((prev) => ({ ...prev, bodyHtml: html }))
              }
              helperText="Use headings, lists, links, and blockquotes to structure the article. Featured image is set in the sidebar."
            />
          </AdminCard>

          {isEdit && (
            <div className="flex justify-end">
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={handleDelete}
                disabled={deleting}
              >
                <Trash2 />
                Delete post
              </Button>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <aside className="flex flex-col gap-5">
          <AdminCard title="Status">
            <div className="flex flex-col gap-3">
              <StatusBadge variant={STATUS_VARIANT[form.status]}>
                {form.status}
              </StatusBadge>
              <p className="text-xs text-muted-foreground">
                <strong className="text-foreground">Save draft</strong> keeps the
                post private.{" "}
                <strong className="text-foreground">Publish</strong> makes it live
                at <code className="font-mono">/blog/{form.slug || "your-slug"}</code>.
              </p>
            </div>
          </AdminCard>

          <AdminCard title="URL slug">
            <FormInput
              value={form.slug}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  slug: slugify(e.target.value),
                  slugManuallyEdited: true,
                }))
              }
              prefix={<span className="text-xs">/blog/</span>}
              placeholder="post-url-slug"
              helperText="Auto-derived from the title until edited. Lowercase letters, numbers, and hyphens only."
            />
          </AdminCard>

          <AdminCard title="Featured image">
            {form.featuredImage ? (
              <div className="relative overflow-hidden rounded-2xl border border-border">
                <Image
                  src={form.featuredImage}
                  alt="Featured"
                  width={800}
                  height={500}
                  className="h-auto w-full object-cover"
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
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="w-full h-auto py-8 border-dashed"
              >
                <ImagePlus />
                {uploading ? "Uploading…" : "Upload image"}
              </Button>
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
          </AdminCard>

          <AdminCard title="Tags">
            <FormInput
              value={form.tagsInput}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, tagsInput: e.target.value }))
              }
              placeholder="BPC-157, tissue repair, research overview"
              helperText="Comma-separated. Up to 10 tags. Shown on the post and used to group related reading."
            />
          </AdminCard>

          <AdminCard title="Author byline">
            <FormInput
              value={form.authorName}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, authorName: e.target.value }))
              }
            />
          </AdminCard>
        </aside>
      </div>
    </div>
  )
}
