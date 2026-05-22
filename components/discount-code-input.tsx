"use client"

import { useCallback, useState } from "react"
import { Tag, Check, X, Loader2 } from "lucide-react"
import { useCart, type AppliedDiscount } from "@/lib/cart-context"
import { normalizeCode } from "@/lib/discounts/normalize"
import { Button } from "@/components/ui/button"

interface ValidateResponse {
  ok: boolean
  reason?: string
  code?: string
  codeId?: string
  discountAmount?: number
  discountType?: "percent" | "amount"
  percentOff?: number | null
  amountOff?: number | null
}

/**
 * Cart-side input for applying a discount code. Talks to
 * /api/discounts/validate; the validation result and the rendered
 * discount line in OrderSummary stay in sync via cart-context.
 *
 * Layout: a small toggle row ("Have a discount code?") that expands into
 * the actual input. Keeps the cart visually clean for the common case of
 * no code, while still being one click away.
 */
export function DiscountCodeInput() {
  const { subtotal, appliedDiscount, applyDiscount, removeDiscount } = useCart()
  const [open, setOpen] = useState<boolean>(!!appliedDiscount)
  const [input, setInput] = useState<string>("")
  const [error, setError] = useState<string>("")
  const [loading, setLoading] = useState<boolean>(false)

  const apply = useCallback(async () => {
    const trimmed = input.trim()
    if (!trimmed) {
      setError("Enter a discount code")
      return
    }
    setLoading(true)
    setError("")
    try {
      const res = await fetch("/api/discounts/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: trimmed, subtotal }),
      })
      const data = (await res.json().catch(() => ({}))) as ValidateResponse
      if (!data.ok || !data.codeId || !data.code) {
        setError(data.reason || "Could not apply code")
        return
      }
      const applied: AppliedDiscount = {
        codeId: data.codeId,
        code: data.code,
        discountType: data.discountType ?? "percent",
        percentOff: data.percentOff ?? null,
        amountOff: data.amountOff ?? null,
      }
      applyDiscount(applied)
      setInput("")
      setError("")
    } catch (err) {
      console.error("apply discount failed", err)
      setError("Network error, try again")
    } finally {
      setLoading(false)
    }
  }, [input, subtotal, applyDiscount])

  if (appliedDiscount) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm">
            <Check className="h-4 w-4 text-emerald-600" aria-hidden="true" />
            <span className="font-medium text-emerald-900">Code applied:</span>
            <span className="font-mono font-semibold text-emerald-900">
              {appliedDiscount.code}
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              removeDiscount()
              setOpen(false)
            }}
            className="flex h-7 w-7 items-center justify-center rounded-full text-emerald-700 transition-colors hover:bg-emerald-100"
            aria-label="Remove discount code"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    )
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <Tag className="h-3.5 w-3.5" />
        Have a discount code?
      </button>
    )
  }

  return (
    <div className="rounded-2xl border border-border bg-white px-4 py-3 shadow-[0_10px_30px_rgba(0,0,0,0.03)]">
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(normalizeCode(e.target.value))}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault()
              apply()
            }
          }}
          placeholder="DISCOUNT CODE"
          maxLength={40}
          className="h-10 flex-1 rounded-xl bg-transparent px-3 font-mono text-sm uppercase tracking-wider text-foreground outline-none placeholder:text-muted-foreground/60"
          aria-label="Discount code"
        />
        <Button
          type="button"
          size="sm"
          onClick={apply}
          disabled={loading || !input.trim()}
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Apply"}
        </Button>
      </div>
      {error && (
        <p className="mt-2 text-xs text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
