"use client"

import { useState } from "react"
import { Bell, Check } from "lucide-react"

interface RestockNotifyFormProps {
  variantId: string
  variantSku: string
  defaultEmail?: string
}

export function RestockNotifyForm({
  variantId,
  variantSku,
  defaultEmail,
}: RestockNotifyFormProps) {
  const [email, setEmail] = useState(defaultEmail ?? "")
  const [website, setWebsite] = useState("") // honeypot
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle")
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus("submitting")
    setErrorMessage(null)
    try {
      const res = await fetch("/api/restock-notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, variantId, website }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(json?.error ?? "Could not save your request.")
      }
      setStatus("success")
    } catch (err) {
      setStatus("error")
      setErrorMessage(err instanceof Error ? err.message : "Something went wrong.")
    }
  }

  if (status === "success") {
    return (
      <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
        <Check className="mt-0.5 h-4 w-4 shrink-0" />
        <div>
          <p className="font-medium">You&rsquo;re on the list</p>
          <p className="mt-0.5 text-emerald-800/80">
            We&rsquo;ll email you the moment <strong>{variantSku}</strong> is back in stock.
          </p>
        </div>
      </div>
    )
  }

  return (
    <form
      onSubmit={onSubmit}
      className="flex flex-col gap-3 rounded-2xl border border-gray-200 bg-gray-50 p-4"
    >
      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
        <Bell className="h-4 w-4 text-amber-600" />
        <span>Notify me when this is back in stock</span>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 min-h-[48px]"
          aria-label="Email address for restock notification"
        />
        {/* Honeypot — hidden from real users, bots fill it. */}
        <input
          type="text"
          name="website"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          className="hidden"
        />
        <button
          type="submit"
          disabled={status === "submitting"}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-medium text-white transition-all hover:brightness-110 active:scale-95 disabled:opacity-60 min-h-[48px]"
        >
          {status === "submitting" ? "Saving…" : "Notify me"}
        </button>
      </div>
      {status === "error" && errorMessage && (
        <p className="text-xs text-red-600">{errorMessage}</p>
      )}
      <p className="text-[11px] leading-relaxed text-muted-foreground">
        We&rsquo;ll send one email when this strength is back in stock, then
        forget you. No newsletter, no marketing.
      </p>
    </form>
  )
}
