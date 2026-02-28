"use client"

import { createContext, useContext, useState, useCallback, useMemo, useEffect, useRef } from "react"
import { usePathname } from "next/navigation"
import { useAuth } from "@/lib/auth/auth-context"
import type { Product } from "@/components/product-card"

export interface CartItem {
  product: Product
  quantity: number
  variantId?: string // Optional variant ID
}

interface CartContextValue {
  items: CartItem[]
  addItem: (product: Product, quantity?: number, variantId?: string) => void
  removeItem: (productId: string, variantId?: string) => void
  updateQuantity: (productId: string, quantity: number, variantId?: string) => void
  clearCart: () => void
  totalItems: number
  subtotal: number
  loading: boolean
}

const CartContext = createContext<CartContextValue | undefined>(undefined)

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()
  const pathname = usePathname()
  const hasSyncedRef = useRef(false)

  // Check if we're on an admin page
  const isAdminPage = pathname?.startsWith("/admin") ?? false

  const [isSyncing, setIsSyncing] = useState(false)

  const syncCartFromDatabase = useCallback(async () => {
    if (!user || isAdminPage) {
      setItems([])
      setLoading(false)
      return
    }

    try {
      const response = await fetch("/api/cart")
      if (response.ok) {
        const data = await response.json()
        const dbItems = data.items || []
        
        // Convert database items to cart items
        const cartItems: CartItem[] = dbItems
          .filter((item: any) => item.product) // Only include items with valid products
          .map((item: any) => ({
            product: item.product,
            quantity: item.quantity,
            variantId: item.variantId || undefined,
          }))

        setItems(cartItems)
      } else {
        setItems([])
      }
    } catch (error) {
      console.error("Error loading cart from database:", error)
      setItems([])
    } finally {
      setLoading(false)
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
            variantId: item.variantId || undefined,
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
    setLoading(true)
  }, [user?.id])

  // Load cart from database when user signs in (only once, and not on admin pages)
  useEffect(() => {
    if (isAdminPage) {
      setItems([])
      setLoading(false)
      return
    }

    if (user && !isSyncing && !hasSyncedRef.current) {
      hasSyncedRef.current = true
      setIsSyncing(true)
      syncCartFromDatabase().finally(() => setIsSyncing(false))
    } else if (!user) {
      // User logged out - clear cart
      setItems([])
      setLoading(false)
    }
  }, [user?.id, isSyncing, isAdminPage, syncCartFromDatabase])

  // Listen for auth state changes (skip on admin pages)
  useEffect(() => {
    if (isAdminPage) return

    const handleAuthChange = () => {
      if (user && !isSyncing && !hasSyncedRef.current) {
        hasSyncedRef.current = true
        setIsSyncing(true)
        syncCartFromDatabase().finally(() => setIsSyncing(false))
      } else if (!user) {
        setItems([])
        setLoading(false)
      }
    }

    window.addEventListener("auth-state-changed", handleAuthChange)
    return () => window.removeEventListener("auth-state-changed", handleAuthChange)
  }, [user?.id, isSyncing, isAdminPage, syncCartFromDatabase])

  // Debounced sync to database (only when user is authenticated and not during initial sync, skip on admin pages)
  useEffect(() => {
    if (!user || loading || isSyncing || isAdminPage || !hasSyncedRef.current) return

    const timeoutId = setTimeout(() => {
      syncCartToDatabase(items)
    }, 1000) // Debounce to 1 second

    return () => clearTimeout(timeoutId)
  }, [items, user?.id, loading, isSyncing, isAdminPage, syncCartToDatabase])

  const addItem = useCallback(
    async (product: Product, quantity = 1, variantId?: string) => {
      if (!user) {
        console.warn("Cannot add to cart: user not authenticated")
        return
      }

      // Optimistically update UI
      setItems((prev) => {
        // Find existing item with same product AND variant
        const existing = prev.find(
          (item) => item.product.id === product.id && item.variantId === variantId
        )
        if (existing) {
          const newQuantity = Math.min(existing.quantity + quantity, 10)
          return prev.map((item) =>
            item.product.id === product.id && item.variantId === variantId
              ? { ...item, quantity: newQuantity }
              : item
          )
        }
        return [...prev, { product, quantity, variantId }]
      })

      // Sync to database
      try {
        const response = await fetch("/api/cart", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            productId: product.id,
            quantity,
            variantId: variantId || undefined,
          }),
        })
        
        if (!response.ok) {
          // Revert on error by reloading from database
          syncCartFromDatabase()
        }
      } catch (error) {
        console.error("Error adding item to database cart:", error)
        // Revert on error by reloading from database
        syncCartFromDatabase()
      }
    },
    [user, syncCartFromDatabase]
  )

  const removeItem = useCallback(
    async (productId: string, variantId?: string) => {
      if (!user) {
        console.warn("Cannot remove from cart: user not authenticated")
        return
      }

      // Optimistically update UI
      setItems((prev) =>
        prev.filter(
          (item) =>
            !(item.product.id === productId && item.variantId === variantId)
        )
      )

      // Sync to database
      try {
        const url = variantId
          ? `/api/cart/${productId}?variantId=${variantId}`
          : `/api/cart/${productId}`
        const response = await fetch(url, { method: "DELETE" })
        
        if (!response.ok) {
          // Revert on error by reloading from database
          syncCartFromDatabase()
        }
      } catch (error) {
        console.error("Error removing item from database cart:", error)
        // Revert on error by reloading from database
        syncCartFromDatabase()
      }
    },
    [user, syncCartFromDatabase]
  )

  const updateQuantity = useCallback(
    async (productId: string, quantity: number, variantId?: string) => {
      if (!user) {
        console.warn("Cannot update cart: user not authenticated")
        return
      }

      if (quantity < 1) {
        removeItem(productId, variantId)
        return
      }

      // Optimistically update UI
      setItems((prev) =>
        prev.map((item) =>
          item.product.id === productId && item.variantId === variantId
            ? { ...item, quantity: Math.min(quantity, 10) }
            : item
        )
      )

      // Sync to database
      try {
        const url = variantId
          ? `/api/cart/${productId}?variantId=${variantId}`
          : `/api/cart/${productId}`
        const response = await fetch(url, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ quantity, variantId: variantId || undefined }),
        })
        
        if (!response.ok) {
          // Revert on error by reloading from database
          syncCartFromDatabase()
        }
      } catch (error) {
        console.error("Error updating quantity in database cart:", error)
        // Revert on error by reloading from database
        syncCartFromDatabase()
      }
    },
    [user, removeItem, syncCartFromDatabase]
  )

  const clearCart = useCallback(async () => {
    if (!user) {
      console.warn("Cannot clear cart: user not authenticated")
      return
    }

    // Optimistically update UI
    setItems([])

    // Sync to database
    try {
      await fetch("/api/cart", { method: "DELETE" })
    } catch (error) {
      console.error("Error clearing database cart:", error)
      // Revert on error by reloading from database
      syncCartFromDatabase()
    }
  }, [user, syncCartFromDatabase])

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
