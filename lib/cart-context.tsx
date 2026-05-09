"use client"

import { createContext, useContext, useState, useCallback, useMemo, useEffect, useRef } from "react"
import { usePathname } from "next/navigation"
import type { Product } from "@/components/product-card"
import { useAuth } from "@/lib/auth/auth-context"

export interface CartItem {
  product: Product
  quantity: number
  variantId: string
}

// Simplified cart item for localStorage (without full product data)
interface LocalCartItem {
  productId: string
  quantity: number
  variantId: string
}

interface CartContextValue {
  items: CartItem[]
  addItem: (product: Product, quantity: number, variantId: string) => void
  removeItem: (productId: string, variantId: string) => void
  updateQuantity: (productId: string, quantity: number, variantId: string) => void
  clearCart: () => void
  totalItems: number
  subtotal: number
  loading: boolean
}

const CART_STORAGE_KEY = "cart_items"
const CART_VERSION = "1"

const CartContext = createContext<CartContextValue | undefined>(undefined)

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])
  const [loading, setLoading] = useState(true)
  const pathname = usePathname()
  const { user, loading: authLoading } = useAuth()
  // Ref to hold the authoritative local cart state, preventing race conditions
  // when multiple cart operations fire in quick succession
  const localCartRef = useRef<LocalCartItem[]>([])

  // Check if we're on an admin page
  const isAdminPage = pathname?.startsWith("/admin") ?? false

  // Get cart from localStorage. Drops any legacy entries that pre-date the
  // variantId requirement — they would fail server-side validation anyway.
  const getLocalCart = useCallback((): LocalCartItem[] => {
    if (typeof window === "undefined") return []

    try {
      const stored = localStorage.getItem(CART_STORAGE_KEY)
      if (!stored) return []

      const data = JSON.parse(stored)
      const raw: unknown[] =
        data.version === CART_VERSION && Array.isArray(data.items)
          ? data.items
          : Array.isArray(data)
            ? data
            : []

      return raw.filter(
        (it): it is LocalCartItem =>
          !!it &&
          typeof it === "object" &&
          typeof (it as LocalCartItem).productId === "string" &&
          typeof (it as LocalCartItem).variantId === "string" &&
          typeof (it as LocalCartItem).quantity === "number"
      )
    } catch (error) {
      console.error("Error reading cart from localStorage:", error)
      return []
    }
  }, [])

  // Save cart to localStorage
  const saveLocalCart = useCallback((localItems: LocalCartItem[]) => {
    if (typeof window === "undefined") return
    
    try {
      const data = {
        version: CART_VERSION,
        items: localItems,
      }
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(data))
    } catch (error) {
      console.error("Error saving cart to localStorage:", error)
    }
  }, [])

  // Convert local cart items to full cart items by fetching product data
  const enrichCartItems = useCallback(async (localItems: LocalCartItem[]): Promise<CartItem[]> => {
    if (localItems.length === 0) return []

    try {
      // Fetch all products in parallel
      const productPromises = localItems.map(async (item) => {
        try {
          const response = await fetch(`/api/products/${item.productId}`)
          if (response.ok) {
            const data = await response.json()
            const product = data.product
            if (product) {
              return { item, product }
            }
          }
          // Product not found or archived - remove from cart
          console.warn(`Product ${item.productId} not found, removing from cart`)
          return null
        } catch (error) {
          console.error(`Error fetching product ${item.productId}:`, error)
          return null
        }
      })

      const results = await Promise.all(productPromises)
      
      // Filter out failed fetches and build cart items
      const validResults = results.filter((result): result is { item: LocalCartItem; product: Product } => result !== null)

      // Update localStorage to remove invalid products
      const validVariantKeys = new Set(
        validResults.map(r => `${r.item.productId}-${r.item.variantId}`)
      )

      const cleanedLocalItems = localItems.filter(item => {
        const key = `${item.productId}-${item.variantId}`
        return validVariantKeys.has(key)
      })
      
      if (cleanedLocalItems.length !== localItems.length) {
        saveLocalCart(cleanedLocalItems)
      }
      
      const cartItems: CartItem[] = validResults.map(({ item, product }) => ({
        product,
        quantity: item.quantity,
        variantId: item.variantId,
      }))

      return cartItems
    } catch (error) {
      console.error("Error enriching cart items:", error)
      return []
    }
  }, [saveLocalCart])

  // Load cart from localStorage and enrich with product data
  const loadLocalCart = useCallback(async () => {
    const localItems = getLocalCart()
    localCartRef.current = localItems

    if (localItems.length === 0) {
      setItems([])
      setLoading(false)
      return
    }

    const enrichedItems = await enrichCartItems(localItems)
    setItems(enrichedItems)
    setLoading(false)
  }, [getLocalCart, enrichCartItems])

  // Initialize cart on mount - only load when user is authenticated
  useEffect(() => {
    if (authLoading) return

    if (isAdminPage || !user) {
      setItems([])
      setLoading(false)
      return
    }

    loadLocalCart()
  }, [isAdminPage, loadLocalCart, user, authLoading])

  const addItem = useCallback(
    (product: Product, quantity: number, variantId: string) => {
      const variant = product.variants?.find(v => v.id === variantId)
      const maxQuantity = variant?.stock ?? 0
      if (maxQuantity <= 0) return

      // Use ref as source of truth to prevent race conditions
      const localItems = localCartRef.current
      const key = `${product.id}-${variantId}`
      const existingIndex = localItems.findIndex(
        item => `${item.productId}-${item.variantId}` === key
      )

      let updatedItems: LocalCartItem[]
      if (existingIndex >= 0) {
        updatedItems = localItems.map((item, index) =>
          index === existingIndex
            ? { ...item, quantity: Math.min(item.quantity + quantity, maxQuantity) }
            : item
        )
      } else {
        updatedItems = [
          ...localItems,
          { productId: product.id, quantity: Math.min(quantity, maxQuantity), variantId },
        ]
      }

      localCartRef.current = updatedItems
      saveLocalCart(updatedItems)

      // Update state immediately with optimistic update
      setItems((prev) => {
        const existing = prev.find(
          (item) => item.product.id === product.id && item.variantId === variantId
        )
        if (existing) {
          const newQuantity = Math.min(existing.quantity + quantity, maxQuantity)
          return prev.map((item) =>
            item.product.id === product.id && item.variantId === variantId
              ? { ...item, quantity: newQuantity }
              : item
          )
        }
        return [...prev, { product, quantity: Math.min(quantity, maxQuantity), variantId }]
      })
    },
    [saveLocalCart]
  )

  const removeItem = useCallback(
    (productId: string, variantId: string) => {
      const key = `${productId}-${variantId}`
      const updatedItems = localCartRef.current.filter(
        item => `${item.productId}-${item.variantId}` !== key
      )

      localCartRef.current = updatedItems
      saveLocalCart(updatedItems)

      setItems((prev) =>
        prev.filter(
          (item) =>
            !(item.product.id === productId && item.variantId === variantId)
        )
      )
    },
    [saveLocalCart]
  )

  const updateQuantity = useCallback(
    (productId: string, quantity: number, variantId: string) => {
      if (quantity < 1) {
        removeItem(productId, variantId)
        return
      }

      // Look up variant stock from current items state
      const cartItem = items.find(
        i => i.product.id === productId && i.variantId === variantId
      )
      const variant = cartItem?.product.variants?.find(v => v.id === variantId)
      const maxQuantity = variant?.stock ?? 0

      const clampedQuantity = Math.min(quantity, maxQuantity)

      const key = `${productId}-${variantId}`
      const updatedItems = localCartRef.current.map((item) =>
        `${item.productId}-${item.variantId}` === key
          ? { ...item, quantity: clampedQuantity }
          : item
      )

      localCartRef.current = updatedItems
      saveLocalCart(updatedItems)

      setItems((prev) =>
        prev.map((item) =>
          item.product.id === productId && item.variantId === variantId
            ? { ...item, quantity: clampedQuantity }
            : item
        )
      )
    },
    [items, removeItem, saveLocalCart]
  )

  const clearCart = useCallback(() => {
    localCartRef.current = []
    saveLocalCart([])
    setItems([])
  }, [saveLocalCart])

  const totalItems = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity, 0),
    [items]
  )

  const subtotal = useMemo(
    () => items.reduce((sum, item) => {
      const variant = item.product.variants?.find(v => v.id === item.variantId)
      const price = variant?.price ?? 0
      return sum + price * item.quantity
    }, 0),
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
