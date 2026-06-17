"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { usePathname } from "next/navigation"
import { Mail, CheckCircle2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { FormInput } from "@/components/common/form-input"

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
  const [alreadySubscribed, setAlreadySubscribed] = useState(false)
  const armedRef = useRef(false)

  const open = useCallback(() => {
    if (armedRef.current) return
    armedRef.current = true
    setIsOpen(true)
  }, [])

  const handleOpenChange = useCallback((next: boolean) => {
    setIsOpen(next)
    if (!next && status !== "success") {
      writeStoredState({ ...readStoredState(), dismissedAt: Date.now() })
    }
  }, [status])

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
          alreadySubscribed?: boolean
        }
        if (!res.ok) {
          setStatus("error")
          setErrorMessage(data.error || "Could not subscribe. Please try again.")
          return
        }
        setAlreadySubscribed(Boolean(data.alreadySubscribed))
        setStatus("success")
        writeStoredState({ ...readStoredState(), subscribedAt: Date.now() })
      } catch {
        setStatus("error")
        setErrorMessage("Network error. Please try again.")
      }
    },
    [email, website]
  )

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md gap-0 overflow-hidden rounded-3xl border-0 bg-card p-0 shadow-[0_25px_50px_rgba(0,0,0,0.25)]">
        {status === "success" ? (
          <div className="flex flex-col items-center gap-4 px-8 py-12 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-success/10">
              <CheckCircle2 className="h-7 w-7 text-success" />
            </div>
            <DialogTitle className="text-xl font-semibold tracking-tight text-foreground md:text-2xl">
              {alreadySubscribed ? "You're already subscribed" : "Check your inbox"}
            </DialogTitle>
            <DialogDescription className="text-sm leading-relaxed text-muted-foreground">
              {alreadySubscribed ? (
                <>
                  <strong className="text-foreground">{email}</strong> is already on
                  our list, so there&rsquo;s nothing else to do. Check your inbox (and
                  spam folder) for the research guide we sent when you first signed up.
                </>
              ) : (
                <>
                  Your peptide research guide is on its way to{" "}
                  <strong className="text-foreground">{email}</strong>. If you
                  don&rsquo;t see it within a couple of minutes, check your spam folder.
                </>
              )}
            </DialogDescription>
            <Button
              type="button"
              onClick={() => setIsOpen(false)}
              className="mt-2"
            >
              Continue browsing
            </Button>
          </div>
        ) : (
          <>
            <div className="bg-gradient-to-br from-slate-900 to-slate-700 px-8 py-8 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-white/10 backdrop-blur-sm">
                <Mail className="h-5 w-5 text-white" />
              </div>
              <DialogTitle className="text-xl font-semibold tracking-tight text-white md:text-2xl">
                Get our peptide research guide
              </DialogTitle>
              <DialogDescription className="mt-2 text-sm leading-relaxed text-slate-300">
                Five field-tested articles on the most-studied compounds, lab
                handling, and quality assurance &mdash; free.
              </DialogDescription>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4 px-8 py-6">
              <FormInput
                type="email"
                required
                autoComplete="email"
                placeholder="you@example.com"
                aria-label="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={status === "submitting"}
                error={status === "error" ? errorMessage : undefined}
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

              <Button
                type="submit"
                disabled={status === "submitting"}
                className="w-full"
              >
                {status === "submitting" ? "Sending…" : "Send me the guide"}
              </Button>

              <p className="text-center text-[11px] leading-relaxed text-muted-foreground">
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
      </DialogContent>
    </Dialog>
  )
}
