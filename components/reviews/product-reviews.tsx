"use client"

import { useState, useCallback } from "react"
import { useAuth } from "@/lib/auth/auth-context"
import { useRouter } from "next/navigation"
import { ShieldCheck, MessageSquarePlus } from "lucide-react"
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
      className="overflow-hidden rounded-3xl bg-white shadow-[0_10px_30px_rgba(0,0,0,0.05)]"
    >
      <div className="border-b border-gray-100 p-8">
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
            <button
              type="button"
              onClick={handleStartReview}
              className="inline-flex items-center gap-2 rounded-2xl bg-primary px-5 py-3 text-sm font-medium text-white transition-all duration-200 hover:brightness-110 active:scale-95"
            >
              <MessageSquarePlus className="h-4 w-4" />
              Write a review
            </button>
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
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100">
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
          className="border-b border-gray-100 bg-gray-50 p-8"
          aria-labelledby="review-form-heading"
        >
          <h3
            id="review-form-heading"
            className="mb-4 text-lg font-semibold text-foreground"
          >
            Share your experience
          </h3>
          <p className="mb-6 text-xs text-muted-foreground">
            Reviews are limited to verified buyers. Your name from your
            account will be shown publicly.
          </p>

          <div className="flex flex-col gap-5">
            <div>
              <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Your rating
              </label>
              <StarInput value={rating} onChange={setRating} disabled={submitting} />
            </div>

            <div>
              <label
                htmlFor="review-title"
                className="mb-2 block text-xs font-medium uppercase tracking-wider text-muted-foreground"
              >
                Title
              </label>
              <input
                id="review-title"
                type="text"
                required
                maxLength={120}
                placeholder="A short summary"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={submitting}
                className="block w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-foreground placeholder:text-gray-400 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200 disabled:opacity-60"
              />
            </div>

            <div>
              <label
                htmlFor="review-body"
                className="mb-2 block text-xs font-medium uppercase tracking-wider text-muted-foreground"
              >
                Your review
              </label>
              <textarea
                id="review-body"
                required
                rows={5}
                maxLength={4000}
                placeholder="What did you find useful? Anything other researchers should know?"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                disabled={submitting}
                className="block w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm leading-relaxed text-foreground placeholder:text-gray-400 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200 disabled:opacity-60"
              />
            </div>

            {submitError && (
              <p className="text-xs text-red-600">{submitError}</p>
            )}

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="submit"
                disabled={submitting || rating === 0}
                className="inline-flex items-center justify-center rounded-2xl bg-primary px-6 py-3 text-sm font-medium text-white transition-all duration-200 hover:brightness-110 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? "Submitting…" : "Submit review"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false)
                  setSubmitError("")
                }}
                disabled={submitting}
                className="inline-flex items-center justify-center rounded-2xl bg-white px-6 py-3 text-sm font-medium text-foreground transition-all duration-200 hover:bg-gray-100 active:scale-95 disabled:opacity-60 border border-gray-200"
              >
                Cancel
              </button>
            </div>
          </div>
        </form>
      )}

      {submitSuccess && !showForm && (
        <div className="border-b border-gray-100 bg-green-50 px-8 py-4 text-sm text-green-800">
          Thanks &mdash; your review is now live.
        </div>
      )}

      {/* List */}
      {reviews.length > 0 && (
        <ul className="divide-y divide-gray-100">
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
                      <>
                        <span aria-hidden="true">&middot;</span>
                        <span className="inline-flex items-center gap-1 text-emerald-700">
                          <ShieldCheck className="h-3.5 w-3.5" />
                          Verified buyer
                        </span>
                      </>
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
