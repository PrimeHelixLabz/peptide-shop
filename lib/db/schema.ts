/**
 * Database Schema Types
 * 
 * These types define the structure of all database entities.
 * In production, replace with Prisma, Drizzle, or your preferred ORM.
 */

export interface User {
  id: string
  email: string
  name: string
  passwordHash: string // Hashed password
  role: "user" | "admin"
  createdAt: string
  updatedAt: string
  avatar?: string
  phone?: string
  address?: Address
}

export interface Address {
  street: string
  city: string
  state: string
  zipCode: string
  country: string
}

export interface Product {
  id: string
  name: string
  slug: string
  price: number
  description: string
  longDescription?: string
  image: string
  images?: string[]
  category?: string // Legacy: category name (for backward compatibility)
  categoryId?: string // New: reference to categories table
  inStock: boolean
  stockQuantity: number
  specifications?: Record<string, string | number>
  usage?: string
  shipping?: string
  createdAt: string
  updatedAt: string
  createdBy?: string // User ID
}

export interface CartItem {
  id: string
  userId: string
  productId: string
  quantity: number
  createdAt: string
  updatedAt: string
}

export interface WishlistItem {
  id: string
  userId: string
  productId: string
  createdAt: string
}

export interface Order {
  id: string
  userId: string | null // Nullable for guest orders
  email?: string // Email for guest orders (from shippingAddress)
  orderNumber: string // Unique order number
  status: "pending" | "processing" | "shipped" | "delivered" | "cancelled"
  items: OrderItem[]
  subtotal: number
  shipping: number
  tax: number
  total: number
  shippingAddress: Address
  billingAddress?: Address
  paymentMethod: string
  paymentStatus: "pending" | "paid" | "failed" | "refunded"
  trackingNumber?: string
  notes?: string
  createdAt: string
  updatedAt: string
}

export interface OrderItem {
  productId: string
  productName: string
  productImage: string
  price: number
  quantity: number
  specifications?: Record<string, string | number>
}

export interface Session {
  id: string
  userId: string
  token: string
  expiresAt: string
  createdAt: string
}
