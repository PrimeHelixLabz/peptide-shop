"use client"

import { createContext, useContext, useState, useCallback, useMemo, useEffect, useRef } from "react"
import { usePathname } from "next/navigation"
import { useAuth } from "@/lib/auth/auth-context"
import type { Product } from "@/components/product-card"

interface WishlistContextValue {
  items: Product[]
  addItem: (product: Product) => void
  removeItem: (productId: string) => void
  isInWishlist: (productId: string) => boolean
  toggleItem: (product: Product) => void
  totalItems: number
  loading: boolean
}

const WishlistContext = createContext<WishlistContextValue | undefined>(undefined)

const WISHLIST_STORAGE_KEY = "elysian_wishlist"

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)
  const { user } = useAuth()
  const pathname = usePathname()
  const hasSyncedRef = useRef(false)

  // Check if we're on an admin page
  const isAdminPage = pathname?.startsWith("/admin") ?? false

  // Load wishlist from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(WISHLIST_STORAGE_KEY)
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        setItems(parsed)
      } catch (error) {
        console.error("Error loading wishlist from localStorage:", error)
      }
    }
    setLoading(false)
  }, [])

  const syncWishlistFromDatabase = useCallback(async () => {
    if (!user || isAdminPage) return

    try {
      const response = await fetch("/api/wishlist")
      if (response.ok) {
        const data = await response.json()
        const dbItems = data.items || []

        // Get current localStorage items
        const stored = localStorage.getItem(WISHLIST_STORAGE_KEY)
        const localItems: Product[] = stored ? JSON.parse(stored) : []

        // Merge database wishlist with localStorage wishlist
        const mergedItems: Product[] = []
        const processedIds = new Set<string>()

        // Add items from database first
        for (const dbItem of dbItems) {
          if (dbItem.product) {
            mergedItems.push(dbItem.product)
            processedIds.add(dbItem.product.id)
          }
        }

        // Add items from localStorage that aren't in database
        for (const localItem of localItems) {
          if (!processedIds.has(localItem.id)) {
            mergedItems.push(localItem)
            // Add to database
            try {
              await fetch("/api/wishlist", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  productId: localItem.id,
                }),
              })
            } catch (err) {
              console.error("Error adding local item to database:", err)
            }
          }
        }

        setItems(mergedItems)
        localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(mergedItems))
      }
    } catch (error) {
      console.error("Error syncing wishlist from database:", error)
    }
  }, [user, isAdminPage])

  const syncWishlistToDatabase = useCallback(
    async (wishlistItems: Product[]) => {
      if (!user || isAdminPage) return

      try {
        // Get current database wishlist
        const response = await fetch("/api/wishlist")
        if (response.ok) {
          const data = await response.json()
          const dbItems = data.items || []
          const dbProductIds = new Set(
            dbItems.map((item: any) => item.product?.id).filter(Boolean)
          )
          const localProductIds = new Set(wishlistItems.map((item) => item.id))

          // Remove items from database that aren't in localStorage
          for (const dbItem of dbItems) {
            if (dbItem.product && !localProductIds.has(dbItem.product.id)) {
              await fetch(`/api/wishlist/${dbItem.product.id}`, { method: "DELETE" })
            }
          }

          // Add items to database that aren't there
          for (const item of wishlistItems) {
            if (!dbProductIds.has(item.id)) {
              await fetch("/api/wishlist", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  productId: item.id,
                }),
              })
            }
          }
        }
      } catch (error) {
        console.error("Error syncing wishlist to database:", error)
      }
    },
    [user, isAdminPage]
  )

  // Reset sync ref when user changes
  useEffect(() => {
    hasSyncedRef.current = false
  }, [user?.id])

  // Sync with database when user signs in (only once, and not on admin pages)
  useEffect(() => {
    if (user && !loading && !isSyncing && !hasSyncedRef.current && !isAdminPage) {
      hasSyncedRef.current = true
      setIsSyncing(true)
      syncWishlistFromDatabase().finally(() => setIsSyncing(false))
    }
  }, [user?.id, loading, isSyncing, isAdminPage, syncWishlistFromDatabase])

  // Listen for auth state changes (skip on admin pages)
  useEffect(() => {
    if (isAdminPage) return

    const handleAuthChange = () => {
      if (user && !isSyncing && !hasSyncedRef.current) {
        hasSyncedRef.current = true
        setIsSyncing(true)
        syncWishlistFromDatabase().finally(() => setIsSyncing(false))
      }
    }

    window.addEventListener("auth-state-changed", handleAuthChange)
    return () => window.removeEventListener("auth-state-changed", handleAuthChange)
  }, [user?.id, isSyncing, isAdminPage, syncWishlistFromDatabase])

  // Save to localStorage whenever items change
  useEffect(() => {
    if (!loading && !isSyncing) {
      localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(items))
    }
  }, [items, loading, isSyncing])

  // Debounced sync to database (only when user is authenticated and not during initial sync, skip on admin pages)
  useEffect(() => {
    if (!user || loading || isSyncing || isAdminPage || !hasSyncedRef.current) return

    const timeoutId = setTimeout(() => {
      syncWishlistToDatabase(items)
    }, 1000) // Increased debounce to 1 second

    return () => clearTimeout(timeoutId)
  }, [items.length, user?.id, loading, isSyncing, isAdminPage, syncWishlistToDatabase])

  const addItem = useCallback(
    async (product: Product) => {
      setItems((prev) => {
        if (prev.find((item) => item.id === product.id)) {
          return prev
        }
        return [...prev, product]
      })

      // Sync to database if authenticated
      if (user) {
        try {
          await fetch("/api/wishlist", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              productId: product.id,
            }),
          })
        } catch (error) {
          console.error("Error adding item to database wishlist:", error)
        }
      }
    },
    [user]
  )

  const removeItem = useCallback(
    async (productId: string) => {
      setItems((prev) => prev.filter((item) => item.id !== productId))

      // Sync to database if authenticated
      if (user) {
        try {
          await fetch(`/api/wishlist/${productId}`, { method: "DELETE" })
        } catch (error) {
          console.error("Error removing item from database wishlist:", error)
        }
      }
    },
    [user]
  )

  const isInWishlist = useCallback(
    (productId: string) => {
      return items.some((item) => item.id === productId)
    },
    [items]
  )

  const toggleItem = useCallback(
    async (product: Product) => {
      if (isInWishlist(product.id)) {
        removeItem(product.id)
      } else {
        addItem(product)
      }
    },
    [isInWishlist, addItem, removeItem]
  )

  const totalItems = useMemo(() => items.length, [items])

  const value = useMemo<WishlistContextValue>(
    () => ({ items, addItem, removeItem, isInWishlist, toggleItem, totalItems, loading }),
    [items, addItem, removeItem, isInWishlist, toggleItem, totalItems, loading]
  )

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>
}

export function useWishlist() {
  const context = useContext(WishlistContext)
  if (!context) {
    throw new Error("useWishlist must be used within a WishlistProvider")
  }
  return context
}
