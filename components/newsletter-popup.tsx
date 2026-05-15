"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { usePathname } from "next/navigation"
import { X, Mail, CheckCircle2 } from "lucide-react"

const STORAGE_KEY = "phl-newsletter-popup-state-v1"
const DISMISS_DAYS = 30
const TIME_TRIGGER_MS = 25_000
const SCROLL_TRIGGER_PERCENT = 0.5

const SUPPRESSED_PATH_PREFIXES = [
  "/admin",
  "/checkout",
  "/cart",
  "/account",
  "/orders",
  "/wishlist",
  "/payments",
  "/signin",
  "/signup",
  "/forgot-password",
  "/reset-password",
]

interface StoredState {
  dismissedAt?: number
  subscribedAt?: number
}

function readStoredState(): StoredState {
  if (typeof window === "undefined") return {}
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as StoredState) : {}
  } catch {
    return {}
  }
}

function writeStoredState(next: StoredState) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    // ignore
  }
}

function shouldSuppressOnPath(pathname: string | null): boolean {
  if (!pathname) return false
  return SUPPRESSED_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix))
}

function isWithinSuppressionWindow(state: StoredState): boolean {
  const now = Date.now()
  const windowMs = DISMISS_DAYS * 24 * 60 * 60 * 1000
  if (state.subscribedAt) return true
  if (state.dismissedAt && now - state.dismissedAt < windowMs) return true
  return false
}

export function NewsletterPopup() {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)
  const [email, setEmail] = useState("")
  const [website, setWebsite] = useState("") // honeypot
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle")
  const [errorMessage, setErrorMessage] = useState("")
  const armedRef = useRef(false)

  const open = useCallback(() => {
    if (armedRef.current) return
    armedRef.current = true
    setIsOpen(true)
  }, [])

  const close = useCallback(() => {
    setIsOpen(false)
  }, [])

  const dismiss = useCallback(() => {
    writeStoredState({ ...readStoredState(), dismissedAt: Date.now() })
    close()
  }, [close])

  // Lock body scroll when open
  useEffect(() => {
    if (!isOpen) return
    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = originalOverflow
    }
  }, [isOpen])

  // ESC to close
  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") dismiss()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [isOpen, dismiss])

  // Trigger setup
  useEffect(() => {
    if (shouldSuppressOnPath(pathname)) return
    if (isWithinSuppressionWindow(readStoredState())) return

    let cancelled = false
    let timeoutId: number | undefined
    let scrollHandler: (() => void) | undefined
    let mouseHandler: ((e: MouseEvent) => void) | undefined

    const fire = () => {
      if (cancelled) return
      open()
      cleanup()
    }

    const cleanup = () => {
      if (timeoutId !== undefined) window.clearTimeout(timeoutId)
      if (scrollHandler) window.removeEventListener("scroll", scrollHandler)
      if (mouseHandler) document.removeEventListener("mouseout", mouseHandler)
    }

    // Time-based trigger
    timeoutId = window.setTimeout(fire, TIME_TRIGGER_MS)

    // Scroll-depth trigger
    scrollHandler = () => {
      const scrolled = window.scrollY + window.innerHeight
      const total = document.documentElement.scrollHeight
      if (total > 0 && scrolled / total >= SCROLL_TRIGGER_PERCENT) fire()
    }
    window.addEventListener("scroll", scrollHandler, { passive: true })

    // Exit-intent trigger (desktop only — mobile has no real exit-intent signal)
    mouseHandler = (e: MouseEvent) => {
      if (e.clientY <= 0 && !e.relatedTarget) fire()
    }
    document.addEventListener("mouseout", mouseHandler)

    return () => {
      cancelled = true
      cleanup()
    }
  }, [pathname, open])

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      setStatus("submitting")
      setErrorMessage("")
      try {
        const res = await fetch("/api/newsletter/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, website, source: "exit-intent-popup" }),
        })
        const data = (await res.json().catch(() => ({}))) as {
          error?: string
          ok?: boolean
        }
        if (!res.ok) {
          setStatus("error")
          setErrorMessage(data.error || "Could not subscribe. Please try again.")
          return
        }
        setStatus("success")
        writeStoredState({ ...readStoredState(), subscribedAt: Date.now() })
      } catch {
        setStatus("error")
        setErrorMessage("Network error. Please try again.")
      }
    },
    [email, website]
  )

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="newsletter-popup-title"
      onClick={dismiss}
    >
      <div
        className="relative w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-[0_25px_50px_rgba(0,0,0,0.25)]"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={dismiss}
          aria-label="Close"
          className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/80 text-muted-foreground backdrop-blur-sm transition-colors hover:bg-gray-100 hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>

        {status === "success" ? (
          <div className="flex flex-col items-center gap-4 px-8 py-12 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
              <CheckCircle2 className="h-7 w-7 text-green-600" />
            </div>
            <h2
              id="newsletter-popup-title"
              className="text-xl font-semibold tracking-tight text-foreground md:text-2xl"
            >
              Check your inbox
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Your peptide research guide is on its way to{" "}
              <strong className="text-foreground">{email}</strong>. If you don&rsquo;t
              see it within a couple of minutes, check your spam folder.
            </p>
            <button
              type="button"
              onClick={close}
              className="mt-2 inline-flex items-center justify-center rounded-2xl bg-primary px-6 py-3 text-sm font-medium text-white transition-all duration-200 hover:brightness-110 active:scale-95"
            >
              Continue browsing
            </button>
          </div>
        ) : (
          <>
            <div className="bg-gradient-to-br from-slate-900 to-slate-700 px-8 py-8 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-white/10 backdrop-blur-sm">
                <Mail className="h-5 w-5 text-white" />
              </div>
              <h2
                id="newsletter-popup-title"
                className="text-xl font-semibold tracking-tight text-white md:text-2xl"
              >
                Get our peptide research guide
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-300">
                Five field-tested articles on the most-studied compounds, lab
                handling, and quality assurance &mdash; free.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="px-8 py-6">
              <label htmlFor="newsletter-email" className="sr-only">
                Email address
              </label>
              <input
                id="newsletter-email"
                type="email"
                required
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={status === "submitting"}
                className="block w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-foreground placeholder:text-gray-400 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200 disabled:opacity-60"
              />

              {/* Honeypot — hidden from real users, visible to most bots */}
              <input
                type="text"
                name="website"
                tabIndex={-1}
                autoComplete="off"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                className="absolute -left-[9999px] h-0 w-0 opacity-0"
                aria-hidden="true"
              />

              {status === "error" && (
                <p className="mt-3 text-xs text-red-600">{errorMessage}</p>
              )}

              <button
                type="submit"
                disabled={status === "submitting"}
                className="mt-4 inline-flex w-full items-center justify-center rounded-2xl bg-primary px-6 py-3 text-sm font-medium text-white transition-all duration-200 hover:brightness-110 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {status === "submitting" ? "Sending…" : "Send me the guide"}
              </button>

              <p className="mt-4 text-center text-[11px] leading-relaxed text-muted-foreground">
                No spam. Unsubscribe anytime. By subscribing you agree to our{" "}
                <a
                  href="/privacy-policy"
                  className="underline hover:text-foreground"
                >
                  privacy policy
                </a>
                .
              </p>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
