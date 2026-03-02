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
  addItem: (product: Product, quantity?: number, variantId?: string) => Promise<void>
  removeItem: (productId: string, variantId?: string) => Promise<void>
  updateQuantity: (productId: string, quantity: number, variantId?: string) => Promise<void>
  clearCart: () => Promise<void>
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
  const operationInProgressRef = useRef(false)
  const abortControllerRef = useRef<AbortController | null>(null)
  const reloadTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Check if we're on an admin page
  const isAdminPage = pathname?.startsWith("/admin") ?? false

  const [isSyncing, setIsSyncing] = useState(false)

  // Load cart from database - this is the source of truth
  const syncCartFromDatabase = useCallback(async (abortSignal?: AbortSignal, skipLoadingState = false) => {
    if (!user || isAdminPage) {
      setItems([])
      if (!skipLoadingState) {
        setLoading(false)
      }
      return
    }

    try {
      const response = await fetch("/api/cart", {
        signal: abortSignal,
      })
      
      if (abortSignal?.aborted) return
      
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
    } catch (error: any) {
      if (error.name === 'AbortError') return
      console.error("Error loading cart from database:", error)
      setItems([])
    } finally {
      if (!abortSignal?.aborted && !skipLoadingState) {
        setLoading(false)
      }
    }
  }, [user, isAdminPage])

  // Reset sync ref when user changes
  useEffect(() => {
    hasSyncedRef.current = false
    setLoading(true)
    operationInProgressRef.current = false
    // Cancel any pending operations
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
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
      const controller = new AbortController()
      abortControllerRef.current = controller
      syncCartFromDatabase(controller.signal).finally(() => {
        if (!controller.signal.aborted) {
          setIsSyncing(false)
          abortControllerRef.current = null
        }
      })
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
        const controller = new AbortController()
        abortControllerRef.current = controller
        syncCartFromDatabase(controller.signal).finally(() => {
          if (!controller.signal.aborted) {
            setIsSyncing(false)
            abortControllerRef.current = null
          }
        })
      } else if (!user) {
        setItems([])
        setLoading(false)
      }
    }

    window.addEventListener("auth-state-changed", handleAuthChange)
    return () => window.removeEventListener("auth-state-changed", handleAuthChange)
  }, [user?.id, isSyncing, isAdminPage, syncCartFromDatabase])

  // Refresh cart when navigating to cart or checkout pages to ensure accuracy
  useEffect(() => {
    if (isAdminPage || !user || !hasSyncedRef.current) return

    const isCartPage = pathname === "/cart" || pathname === "/checkout"
    if (isCartPage && !isSyncing && !operationInProgressRef.current) {
      // Small delay to ensure page has loaded
      const timeoutId = setTimeout(() => {
        const controller = new AbortController()
        abortControllerRef.current = controller
        syncCartFromDatabase(controller.signal, true).finally(() => {
          if (!controller.signal.aborted) {
            abortControllerRef.current = null
          }
        })
      }, 100)

      return () => clearTimeout(timeoutId)
    }
  }, [pathname, user, isAdminPage, isSyncing, syncCartFromDatabase])

  // Refresh cart when page becomes visible (user switches back to tab)
  useEffect(() => {
    if (isAdminPage || !user || !hasSyncedRef.current) return

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && !isSyncing && !operationInProgressRef.current) {
        const controller = new AbortController()
        abortControllerRef.current = controller
        syncCartFromDatabase(controller.signal, true).finally(() => {
          if (!controller.signal.aborted) {
            abortControllerRef.current = null
          }
        })
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange)
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange)
  }, [user, isAdminPage, isSyncing, syncCartFromDatabase])

  // Reload cart after successful operations to ensure consistency
  // Uses debouncing to prevent multiple rapid reloads
  const reloadCartAfterOperation = useCallback(async () => {
    // Clear any pending reload timeout
    if (reloadTimeoutRef.current) {
      clearTimeout(reloadTimeoutRef.current)
    }

    // Cancel any pending fetch
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    // Debounce the reload to batch rapid operations
    return new Promise<void>((resolve) => {
      reloadTimeoutRef.current = setTimeout(async () => {
        const controller = new AbortController()
        abortControllerRef.current = controller
        
        // Skip loading state during operation reloads to avoid UI flicker
        await syncCartFromDatabase(controller.signal, true)
        
        if (!controller.signal.aborted) {
          abortControllerRef.current = null
        }
        
        resolve()
      }, 150) // Small debounce to batch rapid operations
    })
  }, [syncCartFromDatabase])

  const addItem = useCallback(
    async (product: Product, quantity = 1, variantId?: string) => {
      if (!user) {
        console.warn("Cannot add to cart: user not authenticated")
        return
      }

      // Prevent concurrent operations
      if (operationInProgressRef.current) {
        console.warn("Cart operation already in progress, please wait")
        return
      }

      operationInProgressRef.current = true

      // Optimistically update UI
      const optimisticItems = (prev: CartItem[]) => {
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
      }

      setItems(optimisticItems)

      // Sync to database immediately
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
          await reloadCartAfterOperation()
        } else {
          // Reload from server to ensure consistency (server is source of truth)
          await reloadCartAfterOperation()
        }
      } catch (error) {
        console.error("Error adding item to database cart:", error)
        // Revert on error by reloading from database
        await reloadCartAfterOperation()
      } finally {
        operationInProgressRef.current = false
      }
    },
    [user, reloadCartAfterOperation]
  )

  const removeItem = useCallback(
    async (productId: string, variantId?: string) => {
      if (!user) {
        console.warn("Cannot remove from cart: user not authenticated")
        return
      }

      // Prevent concurrent operations
      if (operationInProgressRef.current) {
        console.warn("Cart operation already in progress, please wait")
        return
      }

      operationInProgressRef.current = true

      // Optimistically update UI
      setItems((prev) =>
        prev.filter(
          (item) =>
            !(item.product.id === productId && item.variantId === variantId)
        )
      )

      // Sync to database immediately
      try {
        const url = variantId
          ? `/api/cart/${productId}?variantId=${variantId}`
          : `/api/cart/${productId}`
        const response = await fetch(url, { method: "DELETE" })
        
        if (!response.ok) {
          // Revert on error by reloading from database
          await reloadCartAfterOperation()
        } else {
          // Reload from server to ensure consistency
          await reloadCartAfterOperation()
        }
      } catch (error) {
        console.error("Error removing item from database cart:", error)
        // Revert on error by reloading from database
        await reloadCartAfterOperation()
      } finally {
        operationInProgressRef.current = false
      }
    },
    [user, reloadCartAfterOperation]
  )

  const updateQuantity = useCallback(
    async (productId: string, quantity: number, variantId?: string) => {
      if (!user) {
        console.warn("Cannot update cart: user not authenticated")
        return
      }

      if (quantity < 1) {
        await removeItem(productId, variantId)
        return
      }

      // Prevent concurrent operations
      if (operationInProgressRef.current) {
        console.warn("Cart operation already in progress, please wait")
        return
      }

      operationInProgressRef.current = true

      // Optimistically update UI
      setItems((prev) =>
        prev.map((item) =>
          item.product.id === productId && item.variantId === variantId
            ? { ...item, quantity: Math.min(quantity, 10) }
            : item
        )
      )

      // Sync to database immediately
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
          await reloadCartAfterOperation()
        } else {
          // Reload from server to ensure consistency
          await reloadCartAfterOperation()
        }
      } catch (error) {
        console.error("Error updating quantity in database cart:", error)
        // Revert on error by reloading from database
        await reloadCartAfterOperation()
      } finally {
        operationInProgressRef.current = false
      }
    },
    [user, removeItem, reloadCartAfterOperation]
  )

  const clearCart = useCallback(async () => {
    if (!user) {
      console.warn("Cannot clear cart: user not authenticated")
      return
    }

    // Prevent concurrent operations
    if (operationInProgressRef.current) {
      console.warn("Cart operation already in progress, please wait")
      return
    }

    operationInProgressRef.current = true

    // Optimistically update UI
    setItems([])

    // Sync to database immediately
    try {
      const response = await fetch("/api/cart", { method: "DELETE" })
      
      if (!response.ok) {
        // Revert on error by reloading from database
        await reloadCartAfterOperation()
      } else {
        // Reload from server to ensure consistency
        await reloadCartAfterOperation()
      }
    } catch (error) {
      console.error("Error clearing database cart:", error)
      // Revert on error by reloading from database
      await reloadCartAfterOperation()
    } finally {
      operationInProgressRef.current = false
    }
  }, [user, reloadCartAfterOperation])

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
