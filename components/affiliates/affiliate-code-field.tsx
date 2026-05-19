"use client"

import { useEffect, useRef, useState } from "react"
import { Check, Loader2, X, Tag } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const REF_COOKIE_NAME = "phl_ref"
const CODE_PATTERN = /^[A-Z0-9]{4,32}$/

function readRefCookie(): string {
  if (typeof document === "undefined") return ""
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${REF_COOKIE_NAME}=`))
  if (!match) return ""
  const raw = decodeURIComponent(match.split("=")[1] ?? "").toUpperCase()
  return CODE_PATTERN.test(raw) ? raw : ""
}

type Status = "idle" | "checking" | "valid" | "invalid"

interface AffiliateCodeFieldProps {
  /** Called whenever the validated code changes. Empty string when no
   *  valid code is currently entered. The parent passes this into the
   *  checkout payload. */
  onChange: (code: string) => void
}

/**
 * Collapsible "Have an affiliate code?" field for the checkout form.
 *
 * Auto-pre-fills from the `phl_ref` cookie when the customer arrived via
 * a referral link — this gives them visible confirmation that the link
 * was actually applied (the original complaint was "the link didn't do
 * anything," which really meant "no visible feedback").
 *
 * Debounced server validation gives a green/red indicator; the server
 * re-validates at submit time so a stale "valid" can't leak through.
 */
export function AffiliateCodeField({ onChange }: AffiliateCodeFieldProps) {
  const initialFromCookie = typeof window !== "undefined" ? readRefCookie() : ""
  const [open, setOpen] = useState(Boolean(initialFromCookie))
  const [value, setValue] = useState(initialFromCookie)
  const [status, setStatus] = useState<Status>("idle")
  const lastValidatedRef = useRef<string>("")

  useEffect(() => {
    const normalized = value.trim().toUpperCase()

    if (!normalized) {
      setStatus("idle")
      if (lastValidatedRef.current !== "") {
        lastValidatedRef.current = ""
        onChange("")
      }
      return
    }

    if (!CODE_PATTERN.test(normalized)) {
      setStatus("invalid")
      if (lastValidatedRef.current !== "") {
        lastValidatedRef.current = ""
        onChange("")
      }
      return
    }

    setStatus("checking")
    const controller = new AbortController()
    const timeout = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/affiliates/validate?code=${encodeURIComponent(normalized)}`,
          { signal: controller.signal }
        )
        if (!res.ok) {
          setStatus("invalid")
          if (lastValidatedRef.current !== "") {
            lastValidatedRef.current = ""
            onChange("")
          }
          return
        }
        const data = (await res.json()) as { valid: boolean }
        if (data.valid) {
          setStatus("valid")
          if (lastValidatedRef.current !== normalized) {
            lastValidatedRef.current = normalized
            onChange(normalized)
          }
        } else {
          setStatus("invalid")
          if (lastValidatedRef.current !== "") {
            lastValidatedRef.current = ""
            onChange("")
          }
        }
      } catch (err) {
        if ((err as { name?: string })?.name === "AbortError") return
        setStatus("invalid")
      }
    }, 400)

    return () => {
      controller.abort()
      clearTimeout(timeout)
    }
  }, [value, onChange])

  // Seed the parent on mount so an existing cookie-derived code is in the
  // payload even if the customer never touches the field.
  useEffect(() => {
    if (initialFromCookie && lastValidatedRef.current === "") {
      // Optimistically pass it through — the server will re-validate and
      // fall back to the cookie path on its own if this turns out stale.
      lastValidatedRef.current = initialFromCookie
      onChange(initialFromCookie)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
      >
        <Tag className="h-4 w-4" />
        Have an affiliate code?
      </button>
    )
  }

  return (
    <div className="space-y-2">
      <Label htmlFor="affiliateCode">Affiliate code (optional)</Label>
      <div className="relative">
        <Input
          id="affiliateCode"
          value={value}
          onChange={(e) => setValue(e.target.value.toUpperCase())}
          placeholder="e.g. SARA1234"
          maxLength={32}
          autoComplete="off"
          spellCheck={false}
          className="pr-10 font-mono tracking-wider"
        />
        <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
          {status === "checking" && (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          )}
          {status === "valid" && (
            <Check className="h-4 w-4 text-emerald-600" />
          )}
          {status === "invalid" && <X className="h-4 w-4 text-red-500" />}
        </div>
      </div>
      {status === "valid" && (
        <p className="text-xs text-emerald-700">Code applied — your referrer will be credited.</p>
      )}
      {status === "invalid" && value.trim() && (
        <p className="text-xs text-red-600">
          That code isn&rsquo;t valid. Double-check with whoever sent it to you.
        </p>
      )}
    </div>
  )
}
