"use client"

import { useEffect } from "react"
import { usePathname } from "next/navigation"

/**
 * Simple scroll restoration using sessionStorage.
 * Restores scroll position when navigating back to a page within the same tab.
 */
export function useScrollRestoration(storageKeyPrefix = "scroll-pos") {
  const pathname = usePathname()

  useEffect(() => {
    if (!pathname) return

    const key = `${storageKeyPrefix}:${pathname}`

    // Restore scroll position on mount
    const stored = typeof window !== "undefined" ? sessionStorage.getItem(key) : null
    if (stored) {
      const y = Number(stored)
      if (!Number.isNaN(y)) {
        // Use requestAnimationFrame to ensure layout is ready
        requestAnimationFrame(() => {
          window.scrollTo(0, y)
        })
      }
    }

    const handleBeforeUnload = () => {
      sessionStorage.setItem(key, String(window.scrollY))
    }

    const handleScroll = () => {
      sessionStorage.setItem(key, String(window.scrollY))
    }

    window.addEventListener("scroll", handleScroll)
    window.addEventListener("beforeunload", handleBeforeUnload)

    return () => {
      // Save on unmount as well
      sessionStorage.setItem(key, String(window.scrollY))
      window.removeEventListener("scroll", handleScroll)
      window.removeEventListener("beforeunload", handleBeforeUnload)
    }
  }, [pathname, storageKeyPrefix])
}

