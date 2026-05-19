"use client"

import { useState, useMemo, useCallback } from "react"
import Link from "next/link"
import { toast } from "sonner"
import {
  Star,
  ShieldCheck,
  Eye,
  EyeOff,
  Trash2,
  MessageSquare,
  ExternalLink,
} from "lucide-react"
import { AdminCard } from "@/components/common/admin-card"
import { Button } from "@/components/ui/button"
import { Select } from "@/components/common/select"
import { StatusBadge, type StatusVariant } from "@/components/common/status-badge"
import { EmptyState } from "@/components/common/empty-state"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import type { AdminReview, ReviewStatus } from "@/lib/db/reviews"

interface Props {
  reviews: AdminReview[]
}

const STATUS_VARIANT: Record<ReviewStatus, StatusVariant> = {
  pending: "warning",
  published: "success",
  hidden: "neutral",
}

type StatusFilter = "all" | ReviewStatus

const FILTER_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "pending", label: "Pending" },
  { value: "published", label: "Published" },
  { value: "hidden", label: "Hidden" },
]

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

function StarRow({ value }: { value: number }) {
  return (
    <div
      className="inline-flex items-center gap-0.5"
      role="img"
      aria-label={`${value} of 5 stars`}
    >
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={`h-3.5 w-3.5 ${
            n <= value
              ? "fill-amber-400 text-amber-400"
              : "text-gray-300"
          }`}
        />
      ))}
    </div>
  )
}

export function AdminReviewsTable({ reviews: initial }: Props) {
  const [reviews, setReviews] = useState(initial)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")
  const [updating, setUpdating] = useState<Set<string>>(new Set())
  const [deleteTarget, setDeleteTarget] = useState<AdminReview | null>(null)
  const [deleting, setDeleting] = useState(false)

  const counts = useMemo(() => {
    const c = { pending: 0, published: 0, hidden: 0 }
    for (const r of reviews) c[r.status] += 1
    return c
  }, [reviews])

  const filtered = useMemo(() => {
    if (statusFilter === "all") return reviews
    return reviews.filter((r) => r.status === statusFilter)
  }, [reviews, statusFilter])

  const setStatus = useCallback(
    async (id: string, status: ReviewStatus) => {
      setUpdating((prev) => new Set(prev).add(id))
      try {
        const res = await fetch(`/api/admin/reviews/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        })
        const data = (await res.json().catch(() => ({}))) as {
          error?: string
          review?: AdminReview
        }
        if (!res.ok) {
          toast.error(data.error || "Could not update review")
          return
        }
        if (data.review) {
          setReviews((prev) =>
            prev.map((r) => (r.id === id ? data.review! : r))
          )
        }
        toast.success(`Review ${status}`)
      } catch (err) {
        console.error(err)
        toast.error("Network error")
      } finally {
        setUpdating((prev) => {
          const next = new Set(prev)
          next.delete(id)
          return next
        })
      }
    },
    []
  )

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/admin/reviews/${deleteTarget.id}`, {
        method: "DELETE",
      })
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string }
        toast.error(data.error || "Could not delete review")
        return
      }
      setReviews((prev) => prev.filter((r) => r.id !== deleteTarget.id))
      toast.success("Review deleted")
      setDeleteTarget(null)
    } catch (err) {
      console.error(err)
      toast.error("Network error")
    } finally {
      setDeleting(false)
    }
  }, [deleteTarget])

  if (reviews.length === 0) {
    return (
      <AdminCard flush>
        <EmptyState
          icon={MessageSquare}
          title="No reviews yet"
          description="Verified buyers can leave reviews from product pages. They show up here for moderation."
          action={{ label: "View shop", href: "/shop" }}
        />
      </AdminCard>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Toolbar */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span>
            <strong className="text-foreground">{counts.pending}</strong> pending
          </span>
          <span aria-hidden="true">·</span>
          <span>
            <strong className="text-foreground">{counts.published}</strong> published
          </span>
          <span aria-hidden="true">·</span>
          <span>
            <strong className="text-foreground">{counts.hidden}</strong> hidden
          </span>
        </div>
        <Select
          options={FILTER_OPTIONS}
          value={statusFilter}
          onChange={(value) => setStatusFilter(value as StatusFilter)}
          aria-label="Filter reviews by status"
        />
      </div>

      {filtered.length === 0 ? (
        <AdminCard flush>
          <div className="p-12 text-center text-sm text-muted-foreground">
            No reviews match this filter.
          </div>
        </AdminCard>
      ) : (
        <div className="flex flex-col gap-4">
          {filtered.map((review) => {
            const isUpdating = updating.has(review.id)
            return (
              <AdminCard key={review.id}>
                <div className="flex flex-col gap-4">
                  {/* Top row: rating, title, status */}
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex flex-col gap-1.5">
                      <div className="flex flex-wrap items-center gap-3">
                        <StarRow value={review.rating} />
                        <h3 className="text-base font-semibold text-foreground">
                          {review.title}
                        </h3>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">
                          {review.customerName}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>{review.customerEmail}</span>
                        <span aria-hidden="true">·</span>
                        <time dateTime={review.createdAt}>
                          {formatDate(review.createdAt)}
                        </time>
                        {review.isVerifiedPurchase && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="inline-flex items-center gap-1 text-emerald-700">
                              <ShieldCheck className="h-3 w-3" />
                              Verified buyer
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <StatusBadge variant={STATUS_VARIANT[review.status]}>
                      {review.status}
                    </StatusBadge>
                  </div>

                  {/* Product link */}
                  {review.productSlug && review.productName && (
                    <Link
                      href={`/shop/${review.productSlug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex w-fit items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
                    >
                      Product: <span className="text-foreground">{review.productName}</span>
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                  )}

                  {/* Body */}
                  <p className="whitespace-pre-line rounded-2xl bg-muted/30 px-4 py-3 text-sm leading-relaxed text-foreground">
                    {review.body}
                  </p>

                  {/* Actions */}
                  <div className="flex flex-wrap gap-2">
                    {review.status !== "published" && (
                      <Button
                        size="sm"
                        onClick={() => setStatus(review.id, "published")}
                        disabled={isUpdating}
                      >
                        <Eye />
                        Publish
                      </Button>
                    )}
                    {review.status !== "hidden" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setStatus(review.id, "hidden")}
                        disabled={isUpdating}
                      >
                        <EyeOff />
                        Hide
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => setDeleteTarget(review)}
                      disabled={isUpdating}
                    >
                      <Trash2 />
                      Delete
                    </Button>
                  </div>
                </div>
              </AdminCard>
            )
          })}
        </div>
      )}

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this review?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the review and the verified-purchase
              record. The customer can submit a new review for this product
              afterwards if they choose. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                handleDelete()
              }}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
