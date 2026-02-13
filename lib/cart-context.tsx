"use client"

import { createContext, useContext, useState, useCallback, useMemo, useEffect, useRef } from "react"
import { usePathname } from "next/navigation"
import { useAuth } from "@/lib/auth/auth-context"
import type { Product } from "@/components/product-card"

export interface CartItem {
  product: Product
  quantity: number
}

interface CartContextValue {
  items: CartItem[]
  addItem: (product: Product, quantity?: number) => void
  removeItem: (productId: string) => void
  updateQuantity: (productId: string, quantity: number) => void
  clearCart: () => void
  totalItems: number
  subtotal: number
  loading: boolean
}

const CartContext = createContext<CartContextValue | undefined>(undefined)

const CART_STORAGE_KEY = "elysian_cart"

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()
  const pathname = usePathname()
  const hasSyncedRef = useRef(false)

  // Check if we're on an admin page
  const isAdminPage = pathname?.startsWith("/admin") ?? false

  // Load cart from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(CART_STORAGE_KEY)
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        setItems(parsed)
      } catch (error) {
        console.error("Error loading cart from localStorage:", error)
      }
    }
    setLoading(false)
  }, [])

  const [isSyncing, setIsSyncing] = useState(false)

  const syncCartFromDatabase = useCallback(async () => {
    if (!user || isAdminPage) return

    try {
      const response = await fetch("/api/cart")
      if (response.ok) {
        const data = await response.json()
        const dbItems = data.items || []
        
        // Get current localStorage items
        const stored = localStorage.getItem(CART_STORAGE_KEY)
        const localItems: CartItem[] = stored ? JSON.parse(stored) : []
        
        // Merge database cart with localStorage cart
        // Database takes precedence for quantities, but keep localStorage items not in DB
        const mergedItems: CartItem[] = []
        const processedIds = new Set<string>()

        // Add items from database first
        for (const dbItem of dbItems) {
          if (dbItem.product) {
            mergedItems.push({
              product: dbItem.product,
              quantity: dbItem.quantity,
            })
            processedIds.add(dbItem.product.id)
          }
        }

        // Add items from localStorage that aren't in database
        for (const localItem of localItems) {
          if (!processedIds.has(localItem.product.id)) {
            mergedItems.push(localItem)
            // Add to database
            try {
              await fetch("/api/cart", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  productId: localItem.product.id,
                  quantity: localItem.quantity,
                }),
              })
            } catch (err) {
              console.error("Error adding local item to database:", err)
            }
          }
        }

        setItems(mergedItems)
        localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(mergedItems))
      }
    } catch (error) {
      console.error("Error syncing cart from database:", error)
    }
  }, [user, isAdminPage])

  const syncCartToDatabase = useCallback(async (cartItems: CartItem[]) => {
    if (!user || isAdminPage) return

    try {
      // Clear database cart first
      await fetch("/api/cart", { method: "DELETE" })

      // Add all items to database
      for (const item of cartItems) {
        await fetch("/api/cart", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            productId: item.product.id,
            quantity: item.quantity,
          }),
        })
      }
    } catch (error) {
      console.error("Error syncing cart to database:", error)
    }
  }, [user, isAdminPage])

  // Reset sync ref when user changes
  useEffect(() => {
    hasSyncedRef.current = false
  }, [user?.id])

  // Sync with database when user signs in (only once, and not on admin pages)
  useEffect(() => {
    if (user && !loading && !isSyncing && !hasSyncedRef.current && !isAdminPage) {
      hasSyncedRef.current = true
      setIsSyncing(true)
      syncCartFromDatabase().finally(() => setIsSyncing(false))
    }
  }, [user?.id, loading, isSyncing, isAdminPage, syncCartFromDatabase])

  // Listen for auth state changes (skip on admin pages)
  useEffect(() => {
    if (isAdminPage) return

    const handleAuthChange = () => {
      if (user && !isSyncing && !hasSyncedRef.current) {
        hasSyncedRef.current = true
        setIsSyncing(true)
        syncCartFromDatabase().finally(() => setIsSyncing(false))
      }
    }

    window.addEventListener("auth-state-changed", handleAuthChange)
    return () => window.removeEventListener("auth-state-changed", handleAuthChange)
  }, [user?.id, isSyncing, isAdminPage, syncCartFromDatabase])

  // Save to localStorage whenever items change
  useEffect(() => {
    if (!loading && !isSyncing) {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items))
    }
  }, [items, loading, isSyncing])

  // Debounced sync to database (only when user is authenticated and not during initial sync, skip on admin pages)
  useEffect(() => {
    if (!user || loading || isSyncing || isAdminPage || !hasSyncedRef.current) return

    const timeoutId = setTimeout(() => {
      syncCartToDatabase(items)
    }, 1000) // Increased debounce to 1 second

    return () => clearTimeout(timeoutId)
  }, [items.length, user?.id, loading, isSyncing, isAdminPage, syncCartToDatabase])

  const addItem = useCallback(
    async (product: Product, quantity = 1) => {
      setItems((prev) => {
        const existing = prev.find((item) => item.product.id === product.id)
        if (existing) {
          const newQuantity = Math.min(existing.quantity + quantity, 10)
          return prev.map((item) =>
            item.product.id === product.id
              ? { ...item, quantity: newQuantity }
              : item
          )
        }
        return [...prev, { product, quantity }]
      })

      // Sync to database if authenticated
      if (user) {
        try {
          await fetch("/api/cart", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              productId: product.id,
              quantity,
            }),
          })
        } catch (error) {
          console.error("Error adding item to database cart:", error)
        }
      }
    },
    [user]
  )

  const removeItem = useCallback(
    async (productId: string) => {
      setItems((prev) => prev.filter((item) => item.product.id !== productId))

      // Sync to database if authenticated
      if (user) {
        try {
          await fetch(`/api/cart/${productId}`, { method: "DELETE" })
        } catch (error) {
          console.error("Error removing item from database cart:", error)
        }
      }
    },
    [user]
  )

  const updateQuantity = useCallback(
    async (productId: string, quantity: number) => {
      if (quantity < 1) {
        removeItem(productId)
        return
      }

      setItems((prev) =>
        prev.map((item) =>
          item.product.id === productId
            ? { ...item, quantity: Math.min(quantity, 10) }
            : item
        )
      )

      // Sync to database if authenticated
      if (user) {
        try {
          await fetch(`/api/cart/${productId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ quantity }),
          })
        } catch (error) {
          console.error("Error updating quantity in database cart:", error)
        }
      }
    },
    [user, removeItem]
  )

  const clearCart = useCallback(async () => {
    setItems([])

    // Sync to database if authenticated
    if (user) {
      try {
        await fetch("/api/cart", { method: "DELETE" })
      } catch (error) {
        console.error("Error clearing database cart:", error)
      }
    }
  }, [user])

  const totalItems = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity, 0),
    [items]
  )

  const subtotal = useMemo(
    () => items.reduce((sum, item) => sum + item.product.price * item.quantity, 0),
    [items]
  )

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      addItem,
      removeItem,
      updateQuantity,
      clearCart,
      totalItems,
      subtotal,
      loading,
    }),
    [items, addItem, removeItem, updateQuantity, clearCart, totalItems, subtotal, loading]
  )

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const context = useContext(CartContext)
  if (!context) {
    throw new Error("useCart must be used within a CartProvider")
  }
  return context
}
