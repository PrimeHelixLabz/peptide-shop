"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { Menu, X, ShoppingBag, Search, Heart } from "lucide-react"
import { useCart } from "@/lib/cart-context"
import { useWishlist } from "@/lib/wishlist-context"
import { SearchModal } from "@/components/search-modal"
// import { AccountMenu } from "@/components/account-menu"

const navLinks = [
  { label: "Shop", href: "/shop" },
  { label: "About", href: "/about" },
  { label: "FAQ", href: "/faq" },
  { label: "Contact", href: "/contact" },
]

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const { totalItems } = useCart()
  const { totalItems: wishlistItems } = useWishlist()

  // Keyboard shortcut for search (Cmd/Ctrl + K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        setSearchOpen(true)
      }
      if (e.key === "Escape" && searchOpen) {
        setSearchOpen(false)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [searchOpen])

  return (
    <>
      <header className="sticky top-0 z-50 w-full">
        <div className="mx-auto max-w-7xl px-6 md:px-10 py-3">
          <div className="rounded-3xl bg-white/80 backdrop-blur-xl shadow-[0_10px_30px_rgba(0,0,0,0.05)]">
            <div className="flex h-16 items-center justify-between gap-4 px-4 sm:px-6">
              {/* Logo */}
              <Link href="/" className="flex items-center gap-2 sm:gap-2.5 shrink-0">
                <div className="relative h-8 w-auto sm:h-10 shrink-0" style={{ aspectRatio: 'auto' }}>
                  {/* Desktop logo */}
                  <Image
                    src="/logo.webp"
                    alt="PrimeHelix Labz"
                    width={120}
                    height={32}
                    className="object-contain h-8 sm:h-10 w-auto hidden md:block"
                    sizes="(max-width: 640px) 100px, 120px"
                    priority
                  />
                  
                  {/* Mobile logo */}
                  <Image
                    src="/logo-1.webp"
                    alt="PrimeHelix Labz"
                    width={120}
                    height={32}
                    className="object-contain h-8 sm:h-10 w-auto block md:hidden"
                    sizes="(max-width: 640px) 100px, 120px"
                    priority
                  />
                  
                </div>
                <span className="text-xs sm:text-sm font-semibold uppercase tracking-[0.15em] text-foreground hidden xs:inline">
                  PrimeHelix Labz
                </span>
              </Link>

              {/* Desktop Navigation */}
              <nav className="hidden items-center gap-4 lg:gap-6 lg:flex" aria-label="Main navigation">
                {navLinks.map((link) => (
                  <Link
                    key={link.label}
                    href={link.href}
                    className="relative px-3 lg:px-4 py-2 text-sm font-medium text-muted-foreground transition-colors duration-200 hover:text-foreground whitespace-nowrap"
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>

              {/* Desktop Action Buttons */}
              <div className="hidden items-center gap-1.5 lg:gap-2 lg:flex shrink-0">
                <button
                  onClick={() => setSearchOpen(true)}
                  className="relative flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground transition-all duration-200 hover:bg-gray-100 hover:text-foreground min-h-[48px] min-w-[48px]"
                  aria-label="Search products (Ctrl+K)"
                  title="Search products (Ctrl+K or Cmd+K)"
                >
                  <Search className="h-[18px] w-[18px]" />
                </button>
                <Link
                  href="/wishlist"
                  className="relative flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground transition-all duration-200 hover:bg-gray-100 hover:text-foreground min-h-[48px] min-w-[48px]"
                  aria-label={`Wishlist with ${wishlistItems} items`}
                >
                  <Heart className="h-[18px] w-[18px]" />
                  {wishlistItems > 0 && (
                    <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-white shadow-sm">
                      {wishlistItems}
                    </span>
                  )}
                </Link>
                <Link
                  href="/cart"
                  className="relative flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground transition-all duration-200 hover:bg-gray-100 hover:text-foreground min-h-[48px] min-w-[48px]"
                  aria-label={`Shopping cart with ${totalItems} items`}
                >
                  <ShoppingBag className="h-[18px] w-[18px]" />
                  {totalItems > 0 && (
                    <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-white shadow-sm">
                      {totalItems}
                    </span>
                  )}
                </Link>
                {/* <AccountMenu /> */}
              </div>

              {/* Mobile right group */}
              <div className="flex items-center gap-1 sm:gap-1.5 lg:hidden shrink-0">
                <button
                  onClick={() => setSearchOpen(true)}
                  className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-gray-100 min-h-[44px] min-w-[44px]"
                  aria-label="Search products"
                >
                  <Search className="h-4 w-4 sm:h-[18px] sm:w-[18px]" />
                </button>
                <Link
                  href="/cart"
                  className="relative flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-gray-100 min-h-[44px] min-w-[44px]"
                  aria-label={`Shopping cart with ${totalItems} items`}
                >
                  <ShoppingBag className="h-4 w-4 sm:h-[18px] sm:w-[18px]" />
                  {totalItems > 0 && (
                    <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 sm:h-[18px] sm:min-w-[18px] items-center justify-center rounded-full bg-primary px-0.5 sm:px-1 text-[9px] sm:text-[10px] font-semibold text-white">
                      {totalItems > 9 ? "9+" : totalItems}
                    </span>
                  )}
                </Link>
                {/* <AccountMenu /> */}
                <button
                  className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-gray-100 min-h-[44px] min-w-[44px]"
                  onClick={() => setMobileOpen(!mobileOpen)}
                  aria-label={mobileOpen ? "Close menu" : "Open menu"}
                >
                  {mobileOpen ? (
                    <X className="h-4 w-4 sm:h-5 sm:w-5" />
                  ) : (
                    <Menu className="h-4 w-4 sm:h-5 sm:w-5" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Navigation - Fixed overlay */}
      {mobileOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          {/* Mobile Navigation */}
          <nav
            className="fixed top-20 left-6 right-6 md:left-10 md:right-10 z-50 rounded-3xl bg-white/95 backdrop-blur-xl shadow-[0_20px_60px_rgba(0,0,0,0.15)] p-4 sm:p-6 lg:hidden max-h-[calc(100vh-6rem)] overflow-y-auto"
            aria-label="Mobile navigation"
          >
            <div className="flex flex-col gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  className="rounded-2xl px-4 py-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-gray-100 hover:text-foreground min-h-[48px]"
                  onClick={() => setMobileOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
              <Link
                href="/wishlist"
                className="flex items-center gap-2 rounded-2xl bg-gray-100 px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-gray-200 min-h-[48px]"
                onClick={() => setMobileOpen(false)}
              >
                <Heart className="h-4 w-4" />
                Wishlist
                {wishlistItems > 0 && (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-white">
                    {wishlistItems}
                  </span>
                )}
              </Link>
            </div>
          </nav>
        </>
      )}

      {/* Search Modal */}
      <SearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  )
}
