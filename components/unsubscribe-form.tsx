"use client"

import { useState, useCallback } from "react"
import Link from "next/link"
import { CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"

export function UnsubscribeForm({
  email,
  token,
}: {
  email: string
  token: string
}) {
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">(
    "idle"
  )
  const [error, setError] = useState("")

  const handleClick = useCallback(async () => {
    setStatus("submitting")
    setError("")
    try {
      const res = await fetch("/api/newsletter/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, token }),
      })
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean
        error?: string
      }
      if (!res.ok) {
        setStatus("error")
        setError(data.error || "Could not complete unsubscribe.")
        return
      }
      setStatus("success")
    } catch {
      setStatus("error")
      setError("Network error. Please try again.")
    }
  }, [email, token])

  if (status === "success") {
    return (
      <div className="mt-6 flex flex-col items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-success/10">
          <CheckCircle2 className="h-7 w-7 text-success" />
        </div>
        <p className="text-sm text-muted-foreground md:text-base">
          <strong className="text-foreground">{email}</strong> has been removed
          from our list. We&rsquo;re sorry to see you go.
        </p>
        <Button asChild variant="outline">
          <Link href="/">Back to homepage</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="mt-6 flex flex-col items-center gap-4">
      <p className="text-sm text-muted-foreground md:text-base">
        Click below to unsubscribe{" "}
        <strong className="text-foreground">{email}</strong> from our newsletter.
      </p>
      {status === "error" && (
        <p className="text-xs text-destructive">{error}</p>
      )}
      <Button
        type="button"
        variant="destructive"
        onClick={handleClick}
        disabled={status === "submitting"}
      >
        {status === "submitting" ? "Unsubscribing…" : "Unsubscribe"}
      </Button>
      <p className="text-xs text-muted-foreground">
        Changed your mind?{" "}
        <Link href="/" className="underline hover:text-foreground">
          Back to homepage
        </Link>
      </p>
    </div>
  )
}
