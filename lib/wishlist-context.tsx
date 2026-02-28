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

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)
  const { user } = useAuth()
  const pathname = usePathname()
  const hasSyncedRef = useRef(false)

  // Check if we're on an admin page
  const isAdminPage = pathname?.startsWith("/admin") ?? false

  const syncWishlistFromDatabase = useCallback(async () => {
    if (!user || isAdminPage) {
      setItems([])
      setLoading(false)
      return
    }

    try {
      const response = await fetch("/api/wishlist")
      if (response.ok) {
        const data = await response.json()
        const dbItems = data.items || []

        // Convert database items to products
        const products: Product[] = dbItems
          .filter((item: any) => item.product) // Only include items with valid products
          .map((item: any) => item.product)

        setItems(products)
      } else {
        setItems([])
      }
    } catch (error) {
      console.error("Error loading wishlist from database:", error)
      setItems([])
    } finally {
      setLoading(false)
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
          const currentProductIds = new Set(wishlistItems.map((item) => item.id))

          // Remove items from database that aren't in current wishlist
          for (const dbItem of dbItems) {
            if (dbItem.product && !currentProductIds.has(dbItem.product.id)) {
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
    setLoading(true)
  }, [user?.id])

  // Load wishlist from database when user signs in (only once, and not on admin pages)
  useEffect(() => {
    if (isAdminPage) {
      setItems([])
      setLoading(false)
      return
    }

    if (user && !isSyncing && !hasSyncedRef.current) {
      hasSyncedRef.current = true
      setIsSyncing(true)
      syncWishlistFromDatabase().finally(() => setIsSyncing(false))
    } else if (!user) {
      // User logged out - clear wishlist
      setItems([])
      setLoading(false)
    }
  }, [user?.id, isSyncing, isAdminPage, syncWishlistFromDatabase])

  // Listen for auth state changes (skip on admin pages)
  useEffect(() => {
    if (isAdminPage) return

    const handleAuthChange = () => {
      if (user && !isSyncing && !hasSyncedRef.current) {
        hasSyncedRef.current = true
        setIsSyncing(true)
        syncWishlistFromDatabase().finally(() => setIsSyncing(false))
      } else if (!user) {
        setItems([])
        setLoading(false)
      }
    }

    window.addEventListener("auth-state-changed", handleAuthChange)
    return () => window.removeEventListener("auth-state-changed", handleAuthChange)
  }, [user?.id, isSyncing, isAdminPage, syncWishlistFromDatabase])

  // Debounced sync to database (only when user is authenticated and not during initial sync, skip on admin pages)
  useEffect(() => {
    if (!user || loading || isSyncing || isAdminPage || !hasSyncedRef.current) return

    const timeoutId = setTimeout(() => {
      syncWishlistToDatabase(items)
    }, 1000) // Debounce to 1 second

    return () => clearTimeout(timeoutId)
  }, [items, user?.id, loading, isSyncing, isAdminPage, syncWishlistToDatabase])

  const addItem = useCallback(
    async (product: Product) => {
      if (!user) {
        console.warn("Cannot add to wishlist: user not authenticated")
        return
      }

      // Optimistically update UI
      setItems((prev) => {
        if (prev.find((item) => item.id === product.id)) {
          return prev
        }
        return [...prev, product]
      })

      // Sync to database
      try {
        const response = await fetch("/api/wishlist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            productId: product.id,
          }),
        })
        
        if (!response.ok) {
          // Revert on error by reloading from database
          syncWishlistFromDatabase()
        }
      } catch (error) {
        console.error("Error adding item to database wishlist:", error)
        // Revert on error by reloading from database
        syncWishlistFromDatabase()
      }
    },
    [user, syncWishlistFromDatabase]
  )

  const removeItem = useCallback(
    async (productId: string) => {
      if (!user) {
        console.warn("Cannot remove from wishlist: user not authenticated")
        return
      }

      // Optimistically update UI
      setItems((prev) => prev.filter((item) => item.id !== productId))

      // Sync to database
      try {
        const response = await fetch(`/api/wishlist/${productId}`, { method: "DELETE" })
        
        if (!response.ok) {
          // Revert on error by reloading from database
          syncWishlistFromDatabase()
        }
      } catch (error) {
        console.error("Error removing item from database wishlist:", error)
        // Revert on error by reloading from database
        syncWishlistFromDatabase()
      }
    },
    [user, syncWishlistFromDatabase]
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
