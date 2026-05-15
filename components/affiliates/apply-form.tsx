"use client"

import { useState, useCallback } from "react"
import Link from "next/link"
import { CheckCircle2 } from "lucide-react"

type PayoutMethod = "paypal" | "wise" | "crypto" | "ach" | "other"

export function AffiliateApplyForm({
  defaultName,
  defaultEmail,
}: {
  defaultName: string
  defaultEmail: string
}) {
  const [name, setName] = useState(defaultName)
  const [website, setWebsite] = useState("")
  const [audience, setAudience] = useState("")
  const [payoutMethod, setPayoutMethod] = useState<PayoutMethod>("paypal")
  const [payoutDetails, setPayoutDetails] = useState("")
  const [websiteUrl, setWebsiteUrl] = useState("") // honeypot
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      setSubmitting(true)
      setError("")
      try {
        const res = await fetch("/api/affiliates/apply", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            website: website || undefined,
            audience: audience || undefined,
            payoutMethod,
            payoutDetails: payoutDetails || undefined,
            website_url: websiteUrl,
          }),
        })
        const data = (await res.json().catch(() => ({}))) as {
          ok?: boolean
          error?: string
          alreadyApplied?: boolean
        }
        if (!res.ok) {
          setError(data.error || "Could not submit your application.")
          setSubmitting(false)
          return
        }
        setSuccess(true)
      } catch {
        setError("Network error. Please try again.")
      } finally {
        setSubmitting(false)
      }
    },
    [name, website, audience, payoutMethod, payoutDetails, websiteUrl]
  )

  if (success) {
    return (
      <div className="rounded-3xl bg-white p-8 shadow-[0_10px_30px_rgba(0,0,0,0.05)] md:p-12">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
            <CheckCircle2 className="h-7 w-7 text-green-600" />
          </div>
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">
            Application received
          </h2>
          <p className="max-w-md text-sm leading-relaxed text-muted-foreground md:text-base">
            We&rsquo;ll review your application within 2 business days. You&rsquo;ll
            get an email at <strong className="text-foreground">{defaultEmail}</strong>{" "}
            once you&rsquo;re approved, with your unique referral link.
          </p>
          <Link
            href="/affiliates/dashboard"
            className="mt-2 inline-flex items-center justify-center rounded-2xl bg-primary px-6 py-3 text-sm font-medium text-white transition-all duration-200 hover:brightness-110 active:scale-95"
          >
            View your status
          </Link>
        </div>
      </div>
    )
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-6 rounded-3xl bg-white p-8 shadow-[0_10px_30px_rgba(0,0,0,0.05)] md:p-10"
    >
      <div>
        <label
          htmlFor="apply-name"
          className="mb-2 block text-xs font-medium uppercase tracking-wider text-muted-foreground"
        >
          Your name or brand
        </label>
        <input
          id="apply-name"
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={submitting}
          className="block w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-foreground placeholder:text-gray-400 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200 disabled:opacity-60"
        />
      </div>

      <div>
        <label
          htmlFor="apply-website"
          className="mb-2 block text-xs font-medium uppercase tracking-wider text-muted-foreground"
        >
          Where will you promote? (URL)
        </label>
        <input
          id="apply-website"
          type="url"
          placeholder="https://your-channel.com"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
          disabled={submitting}
          className="block w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-foreground placeholder:text-gray-400 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200 disabled:opacity-60"
        />
        <p className="mt-2 text-xs text-muted-foreground">
          YouTube channel, podcast, blog, newsletter, forum profile &mdash;
          whatever&rsquo;s most representative.
        </p>
      </div>

      <div>
        <label
          htmlFor="apply-audience"
          className="mb-2 block text-xs font-medium uppercase tracking-wider text-muted-foreground"
        >
          Tell us about your audience
        </label>
        <textarea
          id="apply-audience"
          rows={4}
          placeholder="Approximate size, niche, why your audience would be interested in research peptides…"
          value={audience}
          onChange={(e) => setAudience(e.target.value)}
          disabled={submitting}
          className="block w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm leading-relaxed text-foreground placeholder:text-gray-400 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200 disabled:opacity-60"
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <label
            htmlFor="apply-payout-method"
            className="mb-2 block text-xs font-medium uppercase tracking-wider text-muted-foreground"
          >
            Preferred payout method
          </label>
          <select
            id="apply-payout-method"
            value={payoutMethod}
            onChange={(e) => setPayoutMethod(e.target.value as PayoutMethod)}
            disabled={submitting}
            className="block w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-foreground focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200 disabled:opacity-60"
          >
            <option value="paypal">PayPal</option>
            <option value="wise">Wise (transferwise)</option>
            <option value="crypto">Crypto (USDC/USDT)</option>
            <option value="ach">ACH (US bank)</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div>
          <label
            htmlFor="apply-payout-details"
            className="mb-2 block text-xs font-medium uppercase tracking-wider text-muted-foreground"
          >
            Payout handle / address
          </label>
          <input
            id="apply-payout-details"
            type="text"
            placeholder="e.g. paypal@example.com"
            value={payoutDetails}
            onChange={(e) => setPayoutDetails(e.target.value)}
            disabled={submitting}
            className="block w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-foreground placeholder:text-gray-400 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200 disabled:opacity-60"
          />
          <p className="mt-2 text-xs text-muted-foreground">
            You can update this later from your dashboard.
          </p>
        </div>
      </div>

      {/* Honeypot */}
      <input
        type="text"
        name="website_url"
        tabIndex={-1}
        autoComplete="off"
        value={websiteUrl}
        onChange={(e) => setWebsiteUrl(e.target.value)}
        className="absolute -left-[9999px] h-0 w-0 opacity-0"
        aria-hidden="true"
      />

      {error && <p className="text-xs text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={submitting || !name.trim()}
        className="inline-flex items-center justify-center rounded-2xl bg-primary px-6 py-3 text-sm font-medium text-white transition-all duration-200 hover:brightness-110 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting ? "Submitting…" : "Submit application"}
      </button>

      <p className="text-center text-[11px] leading-relaxed text-muted-foreground">
        By applying you agree to follow our promotion guidelines (no Google/Meta/TikTok ads,
        no medical claims, no impersonation).
      </p>
    </form>
  )
}
