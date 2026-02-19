"use client"

import { useState } from "react"
import Link from "next/link"
import { Menu, X } from "lucide-react"

const navLinks = [
  { href: "#shop", label: "Shop" },
  { href: "#about", label: "About" },
  { href: "#faq", label: "FAQ" },
  { href: "#contact", label: "Contact" },
]

export function SiteHeader() {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 w-full">
      <div className="mx-auto max-w-7xl px-6 md:px-10 py-4">
        <div className="rounded-3xl bg-white/80 backdrop-blur-xl shadow-[0_10px_30px_rgba(0,0,0,0.05)]">
          <div className="flex h-16 items-center justify-between px-6">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary">
                <span className="text-xs font-bold tracking-widest text-white">PH</span>
              </div>
              <span className="text-sm font-semibold uppercase tracking-[0.2em] text-foreground">
                PrimeHelix Labz
              </span>
            </Link>

            {/* Desktop nav */}
            <nav className="hidden items-center gap-8 md:flex" aria-label="Main navigation">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-xs font-medium uppercase tracking-[0.15em] text-muted-foreground transition-colors hover:text-foreground"
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            {/* Mobile toggle */}
            <button
              className="flex h-10 w-10 items-center justify-center rounded-full text-foreground transition-colors hover:bg-gray-100 md:hidden min-h-[48px] min-w-[48px]"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile nav - Fixed overlay */}
      {mobileOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          {/* Mobile Navigation */}
          <nav
            className="fixed top-20 left-6 right-6 md:left-10 md:right-10 z-50 rounded-3xl bg-white/95 backdrop-blur-xl shadow-[0_20px_60px_rgba(0,0,0,0.15)] p-6 md:hidden max-h-[calc(100vh-6rem)] overflow-y-auto"
            aria-label="Mobile navigation"
          >
            <div className="flex flex-col gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="rounded-2xl px-4 py-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-gray-100 hover:text-foreground min-h-[48px]"
                  onClick={() => setMobileOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </nav>
        </>
      )}
    </header>
  )
}
