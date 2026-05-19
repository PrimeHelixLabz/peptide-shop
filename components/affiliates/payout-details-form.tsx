"use client"

import { useState, useCallback } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { FormInput } from "@/components/common/form-input"
import { Select } from "@/components/common/select"

type PayoutMethod = "paypal" | "wise" | "crypto" | "ach" | "other"

const PAYOUT_OPTIONS: { value: PayoutMethod; label: string }[] = [
  { value: "paypal", label: "PayPal" },
  { value: "wise", label: "Wise (transferwise)" },
  { value: "crypto", label: "Crypto (USDC/USDT)" },
  { value: "ach", label: "ACH (US bank)" },
  { value: "other", label: "Other" },
]

const VALID_METHODS = new Set<PayoutMethod>([
  "paypal",
  "wise",
  "crypto",
  "ach",
  "other",
])

function normalizeMethod(raw: string | null): PayoutMethod {
  if (raw && VALID_METHODS.has(raw as PayoutMethod)) {
    return raw as PayoutMethod
  }
  return "paypal"
}

export function PayoutDetailsForm({
  initialMethod,
  initialDetails,
}: {
  initialMethod: string | null
  initialDetails: string | null
}) {
  const initial = {
    method: normalizeMethod(initialMethod),
    details: initialDetails ?? "",
  }
  const [method, setMethod] = useState<PayoutMethod>(initial.method)
  const [details, setDetails] = useState(initial.details)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState({ ...initial })

  const isDirty = method !== saved.method || details.trim() !== saved.details.trim()

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      if (!isDirty || saving) return
      setSaving(true)
      try {
        const res = await fetch("/api/affiliates/me", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            payoutMethod: method,
            payoutDetails: details.trim() || null,
          }),
        })
        const data = (await res.json().catch(() => ({}))) as {
          error?: string
        }
        if (!res.ok) {
          toast.error(data.error || "Could not save payout details")
          return
        }
        setSaved({ method, details: details.trim() })
        toast.success("Payout details updated")
      } catch {
        toast.error("Network error. Please try again.")
      } finally {
        setSaving(false)
      }
    },
    [method, details, isDirty, saving]
  )

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="grid gap-4 md:grid-cols-2">
        <Select
          label="Payout method"
          options={PAYOUT_OPTIONS}
          value={method}
          onChange={(value) => setMethod(value as PayoutMethod)}
          disabled={saving}
        />
        <FormInput
          label="Handle / address"
          placeholder="e.g. paypal@example.com"
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          disabled={saving}
          maxLength={500}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        For crypto, paste the destination wallet address and the network
        (e.g. <code className="font-mono">USDC on Polygon</code>). Make
        sure this matches the wallet you control — payouts are
        irreversible.
      </p>
      <div>
        <Button type="submit" disabled={!isDirty || saving}>
          {saving ? "Saving…" : "Save payout details"}
        </Button>
      </div>
    </form>
  )
}
