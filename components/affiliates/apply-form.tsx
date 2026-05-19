"use client"

import { useState, useCallback } from "react"
import Link from "next/link"
import { CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { FormInput } from "@/components/common/form-input"
import { FormTextarea } from "@/components/common/form-textarea"
import { Select } from "@/components/common/select"

type PayoutMethod = "paypal" | "wise" | "crypto" | "ach" | "other"

const PAYOUT_OPTIONS: { value: PayoutMethod; label: string }[] = [
  { value: "paypal", label: "PayPal" },
  { value: "wise", label: "Wise (transferwise)" },
  { value: "crypto", label: "Crypto (USDC/USDT)" },
  { value: "ach", label: "ACH (US bank)" },
  { value: "other", label: "Other" },
]

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
      <div className="rounded-3xl bg-card text-card-foreground p-8 shadow-[0_10px_30px_rgba(0,0,0,0.05)] dark:shadow-[0_10px_30px_rgba(0,0,0,0.3)] md:p-12">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-success/10">
            <CheckCircle2 className="h-7 w-7 text-success" />
          </div>
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">
            Application received
          </h2>
          <p className="max-w-md text-sm leading-relaxed text-muted-foreground md:text-base">
            We&rsquo;ll review your application within 2 business days. You&rsquo;ll
            get an email at <strong className="text-foreground">{defaultEmail}</strong>{" "}
            once you&rsquo;re approved, with your unique referral link.
          </p>
          <Button asChild className="mt-2">
            <Link href="/affiliates/dashboard">View your status</Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-6 rounded-3xl bg-card text-card-foreground p-8 shadow-[0_10px_30px_rgba(0,0,0,0.05)] dark:shadow-[0_10px_30px_rgba(0,0,0,0.3)] md:p-10"
    >
      <FormInput
        label="Your name or brand"
        required
        value={name}
        onChange={(e) => setName(e.target.value)}
        disabled={submitting}
      />

      <FormInput
        label="Where will you promote? (URL)"
        type="url"
        placeholder="https://your-channel.com"
        value={website}
        onChange={(e) => setWebsite(e.target.value)}
        disabled={submitting}
        helperText="YouTube channel, podcast, blog, newsletter, forum profile — whatever's most representative."
      />

      <FormTextarea
        label="Tell us about your audience"
        rows={4}
        placeholder="Approximate size, niche, why your audience would be interested in research peptides…"
        value={audience}
        onChange={(e) => setAudience(e.target.value)}
        disabled={submitting}
      />

      <div className="grid gap-6 md:grid-cols-2">
        <Select
          label="Preferred payout method"
          options={PAYOUT_OPTIONS}
          value={payoutMethod}
          onChange={(value) => setPayoutMethod(value as PayoutMethod)}
          disabled={submitting}
        />

        <FormInput
          label="Payout handle / address"
          placeholder="e.g. paypal@example.com"
          value={payoutDetails}
          onChange={(e) => setPayoutDetails(e.target.value)}
          disabled={submitting}
          helperText="You can update this later from your dashboard."
        />
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

      {error && <p className="text-xs text-destructive">{error}</p>}

      <Button type="submit" disabled={submitting || !name.trim()}>
        {submitting ? "Submitting…" : "Submit application"}
      </Button>

      <p className="text-center text-[11px] leading-relaxed text-muted-foreground">
        By applying you agree to follow our promotion guidelines (no Google/Meta/TikTok ads,
        no medical claims, no impersonation).
      </p>
    </form>
  )
}
