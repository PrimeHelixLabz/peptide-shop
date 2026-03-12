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
  /**
   * Whether the user has passed the age verification gate.
   * Backed by the `age_verified` boolean column on the `profiles` table.
   */
  ageVerified?: boolean
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
  price: number // Base/default price (for backward compatibility)
  /**
   * Optional Stripe product mapping (server-side only).
   */
  stripeProductId?: string
  description: string
  longDescription?: string
  /**
   * Single thumbnail for listing pages.
   * Stored as a CDN-ready URL in the app layer (DB stores the storage path).
   */
  thumbnailUrl?: string
  /**
   * Optional Certificate of Analysis image URL (CDN-ready).
   */
  coaUrl?: string
  image: string // Legacy: base/default image (kept for backward compatibility)
  images?: string[] // Legacy: base/default images (kept for backward compatibility)
  category?: string // Legacy: category name (for backward compatibility)
  categoryId?: string // New: reference to categories table
  inStock: boolean // Overall stock status (true if any variant is in stock)
  stockQuantity: number // Total stock across all variants (for backward compatibility)
  specifications?: Record<string, string | number>
  usage?: string
  shipping?: string
  createdAt: string
  updatedAt: string
  createdBy?: string // User ID
  isArchived?: boolean // Soft delete flag - archived products are hidden from store but kept for order history
  variants?: ProductVariant[] // Product variants (e.g., different strengths)
}

export interface ProductVariant {
  id: string
  productId: string
  /**
   * Variant SKU (primary identifier for variants).
   * All application logic and UI should use this instead of the legacy `name` column.
   */
  sku: string
  price: number
  /**
   * Optional Stripe price mapping for this variant.
   */
  stripePriceId?: string
  stock: number
  inStock: boolean
  displayOrder: number // Order for displaying variants
  isDefault: boolean
  createdAt: string
  updatedAt: string
}

export interface VariantImage {
  id: string
  variantId: string
  imageUrl: string
  isPrimary: boolean
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export interface CartItem {
  id: string
  userId: string
  productId: string
  variantId?: string // Optional: variant ID if product has variants
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
  serviceFee: number
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
  variantId?: string // Optional: variant ID if product has variants
  variantName?: string // Optional: variant name (e.g., "10mg") for display
  specifications?: Record<string, string | number>
}

export interface Session {
  id: string
  userId: string
  token: string
  expiresAt: string
  createdAt: string
}
