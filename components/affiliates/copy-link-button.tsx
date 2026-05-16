"use client"

import { useState, useCallback } from "react"
import { Copy, Check } from "lucide-react"
import { Button } from "@/components/ui/button"

export function CopyLinkButton({ value, label = "Copy" }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // ignore
    }
  }, [value])

  return (
    <Button type="button" size="sm" onClick={handleCopy} className="shrink-0">
      {copied ? (
        <>
          <Check />
          Copied
        </>
      ) : (
        <>
          <Copy />
          {label}
        </>
      )}
    </Button>
  )
}
