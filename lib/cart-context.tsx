"use client"

import { createContext, useContext, useState, useCallback, useMemo, useEffect } from "react"
import { usePathname } from "next/navigation"
import type { Product } from "@/components/product-card"

export interface CartItem {
  product: Product
  quantity: number
  variantId?: string
}

// Simplified cart item for localStorage (without full product data)
interface LocalCartItem {
  productId: string
  quantity: number
  variantId?: string
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

const CART_STORAGE_KEY = "cart_items"
const CART_VERSION = "1"

const CartContext = createContext<CartContextValue | undefined>(undefined)

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])
  const [loading, setLoading] = useState(true)
  const pathname = usePathname()

  // Check if we're on an admin page
  const isAdminPage = pathname?.startsWith("/admin") ?? false

  // Get cart from localStorage
  const getLocalCart = useCallback((): LocalCartItem[] => {
    if (typeof window === "undefined") return []
    
    try {
      const stored = localStorage.getItem(CART_STORAGE_KEY)
      if (!stored) return []
      
      const data = JSON.parse(stored)
      // Support versioning for future migrations
      if (data.version === CART_VERSION && Array.isArray(data.items)) {
        return data.items
      }
      // Legacy format (array directly)
      if (Array.isArray(data)) {
        return data
      }
      return []
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
        validResults.map(r => `${r.item.productId}-${r.item.variantId || 'none'}`)
      )
      
      const cleanedLocalItems = localItems.filter(item => {
        const key = `${item.productId}-${item.variantId || 'none'}`
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
    
    if (localItems.length === 0) {
      setItems([])
      setLoading(false)
      return
    }

    const enrichedItems = await enrichCartItems(localItems)
    setItems(enrichedItems)
    setLoading(false)
  }, [getLocalCart, enrichCartItems])

  // Initialize cart on mount
  useEffect(() => {
    if (isAdminPage) {
      setItems([])
      setLoading(false)
      return
    }

    loadLocalCart()
  }, [isAdminPage, loadLocalCart])

  const addItem = useCallback(
    (product: Product, quantity = 1, variantId?: string) => {
      // Update localStorage immediately (synchronous, instant!)
      const localItems = getLocalCart()
      const key = `${product.id}-${variantId || 'none'}`
      const existingIndex = localItems.findIndex(
        item => `${item.productId}-${item.variantId || 'none'}` === key
      )

      let updatedItems: LocalCartItem[]
      if (existingIndex >= 0) {
        // Update existing item - increment quantity
        updatedItems = localItems.map((item, index) =>
          index === existingIndex
            ? { ...item, quantity: Math.min(item.quantity + quantity, 10) }
            : item
        )
      } else {
        // Add new item
        updatedItems = [
          ...localItems,
          { productId: product.id, quantity, variantId },
        ]
      }

      saveLocalCart(updatedItems)

      // Update state immediately with optimistic update
      setItems((prev) => {
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
    },
    [getLocalCart, saveLocalCart]
  )

  const removeItem = useCallback(
    (productId: string, variantId?: string) => {
      // Update localStorage immediately
      const localItems = getLocalCart()
      const key = `${productId}-${variantId || 'none'}`
      const updatedItems = localItems.filter(
        item => `${item.productId}-${item.variantId || 'none'}` !== key
      )

      saveLocalCart(updatedItems)

      // Update state immediately
      setItems((prev) =>
        prev.filter(
          (item) =>
            !(item.product.id === productId && item.variantId === variantId)
        )
      )
    },
    [getLocalCart, saveLocalCart]
  )

  const updateQuantity = useCallback(
    (productId: string, quantity: number, variantId?: string) => {
      if (quantity < 1) {
        removeItem(productId, variantId)
        return
      }

      // Update localStorage immediately
      const localItems = getLocalCart()
      const key = `${productId}-${variantId || 'none'}`
      const updatedItems = localItems.map((item) =>
        `${item.productId}-${item.variantId || 'none'}` === key
          ? { ...item, quantity: Math.min(quantity, 10) }
          : item
      )

      saveLocalCart(updatedItems)

      // Update state immediately
      setItems((prev) =>
        prev.map((item) =>
          item.product.id === productId && item.variantId === variantId
            ? { ...item, quantity: Math.min(quantity, 10) }
            : item
        )
      )
    },
    [removeItem, getLocalCart, saveLocalCart]
  )

  const clearCart = useCallback(() => {
    // Clear localStorage immediately
    saveLocalCart([])

    // Update state immediately
    setItems([])
  }, [saveLocalCart])

  const totalItems = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity, 0),
    [items]
  )

  const subtotal = useMemo(
    () => items.reduce((sum, item) => {
      const variant = item.variantId && item.product.variants
        ? item.product.variants.find(v => v.id === item.variantId)
        : null
      const price = variant?.price || item.product.price
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
