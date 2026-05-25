"use client"

import { useEffect, useState } from "react"
import QRCode from "qrcode"
import { Download, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"

interface ReferralQrCodeProps {
  /** Full URL to encode (e.g. https://www.primehelixlabz.com/?ref=ABCD1234). */
  url: string
  /** Affiliate code; used only to generate a sensible download filename. */
  code: string
  /** Rendered pixel size on screen. The encoded PNG is 1024px for print-quality. */
  displaySize?: number
}

/**
 * Renders a QR code for an affiliate referral link and lets the user
 * download it as a print-ready PNG. Generated client-side via the
 * `qrcode` package — no network call, no third-party service.
 *
 * The on-screen size is small (default 192px) so the QR fits inside
 * dashboard cards without dominating, but the downloaded file is
 * upscaled to 1024px (with `width: 1024` and high-quality margins) so
 * affiliates can drop it into flyers and posters without pixelation.
 */
export function ReferralQrCode({
  url,
  code,
  displaySize = 192,
}: ReferralQrCodeProps) {
  const [dataUrl, setDataUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setDataUrl(null)
    setError(null)
    QRCode.toDataURL(url, {
      width: 1024,
      margin: 2,
      errorCorrectionLevel: "M",
      color: { dark: "#000000", light: "#ffffff" },
    })
      .then((d) => {
        if (!cancelled) setDataUrl(d)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        console.error("QR generation failed:", err)
        setError("Could not generate QR code")
      })
    return () => {
      cancelled = true
    }
  }, [url])

  return (
    <div className="flex flex-col items-center gap-3">
      <div
        className="flex items-center justify-center rounded-xl bg-white p-2 shadow-[0_4px_12px_rgba(0,0,0,0.05)]"
        style={{ width: displaySize + 16, height: displaySize + 16 }}
      >
        {dataUrl ? (
          // Local data URL, sized for display. The encoded PNG behind it
          // is 1024px so the download is print-ready.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={dataUrl}
            alt={`QR code for affiliate referral link ${code}`}
            width={displaySize}
            height={displaySize}
            className="block"
          />
        ) : error ? (
          <span className="text-center text-xs text-red-600">{error}</span>
        ) : (
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        )}
      </div>
      <Button
        type="button"
        size="sm"
        variant="outline"
        asChild
        disabled={!dataUrl}
      >
        <a
          href={dataUrl ?? "#"}
          download={`primehelixlabz-referral-${code}.png`}
          aria-disabled={!dataUrl}
        >
          <Download className="h-4 w-4" />
          Download PNG
        </a>
      </Button>
    </div>
  )
}
