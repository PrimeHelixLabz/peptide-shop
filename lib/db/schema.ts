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
   * Certificates of Analysis attached to this product. Ordered by `sortOrder`.
   * Empty/undefined means no COA tab is shown on the storefront.
   */
  coas?: ProductCoa[]
  image: string // Legacy: base/default image (kept for backward compatibility)
  images?: string[] // Legacy: base/default images (kept for backward compatibility)
  category?: string // Legacy: category name (for backward compatibility)
  categoryId?: string // New: reference to categories table
  inStock: boolean // Overall stock status (true if any variant is in stock)
  stockQuantity: number // Computed: total stock across all variants (not stored in products table)
  isActive: boolean // Admin-controlled enable/disable flag. Inactive products are hidden from the store.
  specifications?: Record<string, string | number>
  usage?: string
  shipping?: string
  createdAt: string
  updatedAt: string
  createdBy?: string // User ID
  isArchived?: boolean // Soft delete flag - archived products are hidden from store but kept for order history
  isFeatured?: boolean // Admin-controlled flag: featured on the homepage "Featured Compounds" section (up to 3 shown, backfilled)
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

export interface ProductCoa {
  id: string
  productId: string
  imageUrl: string
  /** Optional caption shown above the image (e.g. "Batch 2024-11"). */
  label?: string
  sortOrder: number
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

export const ORDER_STATUSES = [
  "pending",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
] as const
export type OrderStatus = (typeof ORDER_STATUSES)[number]

export const PAYMENT_STATUSES = [
  "pending",
  "authorized",
  "processing",
  "paid",
  "failed",
  "refunded",
] as const
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number]

export interface Order {
  id: string
  userId: string | null // Nullable for guest orders
  email?: string // Email for guest orders (from shippingAddress)
  orderNumber: string // Unique order number
  status: OrderStatus
  items: OrderItem[]
  subtotal: number
  shipping: number
  serviceFee: number
  total: number
  shippingAddress: Address
  billingAddress?: Address
  paymentMethod: string
  paymentStatus: PaymentStatus
  trackingNumber?: string
  /**
   * Shipping carrier paired with `trackingNumber`. One of the keys in
   * `lib/shipping/carriers.ts`. Optional; when null the customer-facing
   * email shows a bare number with no carrier link.
   */
  trackingCarrier?: string | null
  notes?: string
  /**
   * Captured affiliate referral code. Set at order creation from the phl_ref
   * cookie. Used by the affiliate-conversion trigger to attribute commissions.
   */
  affiliateCode?: string | null
  /**
   * FK to discount_codes.id when a code was applied at checkout. ON DELETE
   * SET NULL so deleting a code doesn't nuke historical orders.
   */
  discountCodeId?: string | null
  /**
   * Captured code string at the moment of redemption (denormalized).
   * Survives even if the originating discount_codes row is later deleted.
   */
  discountCode?: string | null
  /**
   * Dollar discount applied to this order. Subtracted from subtotal
   * before shipping + service fee are computed against the discounted
   * base. Defaults to 0 when no code was applied.
   */
  discountAmount?: number
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
