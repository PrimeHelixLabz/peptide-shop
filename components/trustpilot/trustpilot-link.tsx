import Link from "next/link"
import { Star } from "lucide-react"
import { publicEnv } from "@/lib/env"

/**
 * Plain HTML link to Trustpilot — works on the free Trustpilot plan,
 * where embedded TrustBox widgets are paywalled. Replace this with
 * <TrustpilotWidget /> once the account is on a paid tier.
 *
 * mode="read"  → public profile page (visitors can also leave a review there)
 * mode="write" → direct review-submission form
 *
 * Returns null when NEXT_PUBLIC_TRUSTPILOT_DOMAIN is unset, so the link is
 * hidden in dev / pre-launch without breaking surrounding layout.
 */

type Mode = "read" | "write"
type Appearance = "link" | "button"

interface TrustpilotLinkProps {
  mode: Mode
  appearance?: Appearance
  /** Override the default label. */
  label?: string
  className?: string
}

const DEFAULT_LABELS: Record<Mode, string> = {
  read: "Read our reviews on Trustpilot",
  write: "Leave a review on Trustpilot",
}

export function TrustpilotLink({
  mode,
  appearance = "link",
  label,
  className,
}: TrustpilotLinkProps) {
  const domain = publicEnv.NEXT_PUBLIC_TRUSTPILOT_DOMAIN
  if (!domain) return null

  const href =
    mode === "write"
      ? `https://www.trustpilot.com/evaluate/${domain}`
      : `https://www.trustpilot.com/review/${domain}`

  const text = label ?? DEFAULT_LABELS[mode]

  const baseClasses =
    appearance === "button"
      ? "inline-flex items-center justify-center gap-2 rounded-full bg-foreground px-5 py-3 text-sm font-medium text-background transition-colors duration-200 hover:bg-foreground/90"
      : "inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors duration-200 hover:text-foreground"

  return (
    <Link
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`${baseClasses} ${className ?? ""}`.trim()}
    >
      <Star
        className={
          appearance === "button"
            ? "h-4 w-4 fill-current"
            : "h-3.5 w-3.5 fill-[#00b67a] text-[#00b67a]"
        }
        aria-hidden="true"
      />
      <span>{text}</span>
    </Link>
  )
}
