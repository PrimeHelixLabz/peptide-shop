"use client"

import { useState, useCallback } from "react"
import { useAuth } from "@/lib/auth/auth-context"
import { useRouter } from "next/navigation"
import { ShieldCheck, MessageSquarePlus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/common/badge"
import { FormInput } from "@/components/common/form-input"
import { FormTextarea } from "@/components/common/form-textarea"
import { StarRating } from "./star-rating"
import { StarInput } from "./star-input"
import type { ProductReview, ProductRatingSummary } from "@/lib/db/reviews"

interface ProductReviewsProps {
  productId: string
  productName: string
  productSlug: string
  initialReviews: ProductReview[]
  summary: ProductRatingSummary
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

export function ProductReviews({
  productId,
  productName,
  productSlug,
  initialReviews,
  summary: initialSummary,
}: ProductReviewsProps) {
  const router = useRouter()
  const { user } = useAuth()
  const [reviews, setReviews] = useState<ProductReview[]>(initialReviews)
  const [summary, setSummary] = useState<ProductRatingSummary>(initialSummary)
  const [showForm, setShowForm] = useState(false)
  const [rating, setRating] = useState(0)
  const [title, setTitle] = useState("")
  const [body, setBody] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState("")
  const [submitSuccess, setSubmitSuccess] = useState(false)

  const handleStartReview = useCallback(() => {
    if (!user) {
      router.push(`/signin?redirect=/shop/${productSlug}`)
      return
    }
    setShowForm(true)
  }, [user, router, productSlug])

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      if (rating < 1) {
        setSubmitError("Please select a rating.")
        return
      }
      setSubmitting(true)
      setSubmitError("")
      try {
        const res = await fetch("/api/reviews", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productId, rating, title, body }),
        })
        const data = (await res.json().catch(() => ({}))) as {
          error?: string
          review?: ProductReview
        }
        if (!res.ok) {
          setSubmitError(data.error || "Could not submit review.")
          setSubmitting(false)
          return
        }
        if (data.review) {
          setReviews((prev) => [data.review!, ...prev])
          // Optimistically update summary
          setSummary((prev) => {
            const newCount = prev.count + 1
            const newDistribution = [...prev.distribution] as [
              number, number, number, number, number
            ]
            newDistribution[data.review!.rating - 1] += 1
            const newAvg =
              (prev.average * prev.count + data.review!.rating) / newCount
            return {
              ...prev,
              count: newCount,
              average: Math.round(newAvg * 10) / 10,
              distribution: newDistribution,
            }
          })
        }
        setSubmitSuccess(true)
        setShowForm(false)
        setRating(0)
        setTitle("")
        setBody("")
      } catch {
        setSubmitError("Network error. Please try again.")
      } finally {
        setSubmitting(false)
      }
    },
    [productId, rating, title, body]
  )

  const total = summary.count
  const max = Math.max(...summary.distribution, 1)

  return (
    <section
      id="reviews"
      aria-labelledby="reviews-heading"
      className="overflow-hidden rounded-3xl bg-card text-card-foreground shadow-[0_10px_30px_rgba(0,0,0,0.05)] dark:shadow-[0_10px_30px_rgba(0,0,0,0.3)]"
    >
      <div className="border-b border-border/50 p-8">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div>
            <h2
              id="reviews-heading"
              className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl"
            >
              Customer reviews
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              From verified buyers of {productName}
            </p>
          </div>
          {!showForm && (
            <Button type="button" onClick={handleStartReview}>
              <MessageSquarePlus />
              Write a review
            </Button>
          )}
        </div>

        {/* Summary */}
        {total > 0 ? (
          <div className="mt-8 grid gap-8 md:grid-cols-[auto_1fr] md:gap-12">
            <div className="flex flex-col items-start gap-2">
              <div className="text-5xl font-semibold tracking-tight text-foreground">
                {summary.average.toFixed(1)}
              </div>
              <StarRating value={summary.average} size="lg" />
              <div className="text-sm text-muted-foreground">
                {total} {total === 1 ? "review" : "reviews"}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              {[5, 4, 3, 2, 1].map((star) => {
                const count = summary.distribution[star - 1]
                const percent = total > 0 ? (count / max) * 100 : 0
                return (
                  <div key={star} className="flex items-center gap-3 text-xs">
                    <span className="w-6 text-muted-foreground">
                      {star}★
                    </span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-amber-400 transition-all duration-500"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                    <span className="w-8 text-right text-muted-foreground">
                      {count}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        ) : (
          <p className="mt-6 text-sm text-muted-foreground">
            No reviews yet. Verified buyers can be the first to share their
            experience.
          </p>
        )}
      </div>

      {/* Form */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="border-b border-border/50 bg-muted p-8"
          aria-labelledby="review-form-heading"
        >
          <h3
            id="review-form-heading"
            className="mb-2 text-lg font-semibold text-foreground"
          >
            Share your experience
          </h3>
          <p className="mb-6 text-xs text-muted-foreground">
            Reviews are limited to verified buyers. Your name from your
            account will be shown publicly.
          </p>

          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Your rating
              </label>
              <StarInput
                value={rating}
                onChange={setRating}
                disabled={submitting}
              />
            </div>

            <FormInput
              label="Title"
              required
              maxLength={120}
              placeholder="A short summary"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={submitting}
            />

            <FormTextarea
              label="Your review"
              required
              rows={5}
              maxLength={4000}
              placeholder="What did you find useful? Anything other researchers should know?"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              disabled={submitting}
            />

            {submitError && (
              <p className="text-xs text-destructive">{submitError}</p>
            )}

            <div className="flex flex-wrap items-center gap-3">
              <Button
                type="submit"
                disabled={submitting || rating === 0}
              >
                {submitting ? "Submitting…" : "Submit review"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowForm(false)
                  setSubmitError("")
                }}
                disabled={submitting}
              >
                Cancel
              </Button>
            </div>
          </div>
        </form>
      )}

      {submitSuccess && !showForm && (
        <div className="border-b border-border/50 bg-success/10 px-8 py-4 text-sm text-success">
          Thanks &mdash; your review is now live.
        </div>
      )}

      {/* List */}
      {reviews.length > 0 && (
        <ul className="divide-y divide-border/50">
          {reviews.map((review) => (
            <li key={review.id} className="p-8">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-3">
                    <StarRating value={review.rating} size="sm" />
                    <h3 className="text-base font-semibold text-foreground">
                      {review.title}
                    </h3>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">
                      {review.customerName}
                    </span>
                    <span aria-hidden="true">&middot;</span>
                    <time dateTime={review.createdAt}>
                      {formatDate(review.createdAt)}
                    </time>
                    {review.isVerifiedPurchase && (
                      <Badge variant="success" size="sm" className="ml-1 normal-case tracking-normal">
                        <ShieldCheck className="mr-1 h-3 w-3" />
                        Verified buyer
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-muted-foreground md:text-[15px]">
                {review.body}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
