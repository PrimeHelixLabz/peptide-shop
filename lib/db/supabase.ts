/**
 * Supabase Database Layer
 * 
 * Database operations using Supabase
 * 
 * For public read operations (products, etc.), uses public client
 * For authenticated operations (cart, orders, etc.), uses server client
 */

import { createClient } from "@/lib/supabase/server"
import { createPublicClient } from "@/lib/supabase/public"
import type {
  User,
  Product,
  CartItem,
  WishlistItem,
  Order,
  OrderItem,
  Address,
} from "./schema"

import { extractStoragePath, getStorageUrl, getStorageUrls } from "@/lib/storage/supabase-storage"

// Helper to convert database row to Product
function rowToProduct(row: any): Product {
  // Convert image paths to Supabase Storage URLs
  const image = row.image ? getStorageUrl(row.image) : ""
  const images = row.images && Array.isArray(row.images) 
    ? getStorageUrls(row.images) 
    : (row.images ? [getStorageUrl(row.images)] : [])

  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    price: parseFloat(row.price),
    description: row.description,
    longDescription: row.long_description,
    image,
    images: images.length > 0 ? images : (image ? [image] : []),
    // Support both old category (text) and new category_id (with join)
    category: row.category_name || row.category || undefined,
    categoryId: row.category_id || undefined,
    inStock: row.in_stock,
    stockQuantity: row.stock_quantity,
    specifications: row.specifications || {},
    usage: row.usage,
    shipping: row.shipping,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    createdBy: row.created_by,
    isArchived: row.is_archived || false,
  }
}

// Helper to convert Product to database row
function productToRow(product: Partial<Product>): any {
  // Convert full URLs back to storage paths for database storage
  // This allows storing just the path (e.g., "product-bpc157.jpg") instead of full URLs
  const image = product.image ? (extractStoragePath(product.image) || product.image) : ""
  const images = product.images 
    ? product.images.map(img => extractStoragePath(img) || img)
    : []
  
  const row: any = {
    name: product.name,
    price: product.price,
    description: product.description,
    long_description: product.longDescription,
    image,
    images: images.length > 0 ? images : (image ? [image] : []),
    category: product.category, // Keep for backward compatibility
    category_id: product.categoryId, // New category reference
    in_stock: product.inStock,
    stock_quantity: product.stockQuantity,
    specifications: product.specifications || {},
    usage: product.usage,
    shipping: product.shipping,
    created_by: product.createdBy,
  }
  
  // Only include slug if explicitly provided (otherwise trigger will generate it)
  if (product.slug !== undefined) {
    row.slug = product.slug
  }
  
  return row
}

// Users
export async function getUserById(id: string): Promise<User | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", id)
    .single()

  if (error || !data) return null

  return {
    id: data.id,
    email: data.email,
    name: data.name,
    passwordHash: "", // Not stored in profiles
    role: data.role,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    avatar: data.avatar,
    phone: data.phone,
    address: data.address,
  }
}

export async function getUserByEmail(email: string): Promise<User | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("email", email)
    .single()

  if (error || !data) return null

  return {
    id: data.id,
    email: data.email,
    name: data.name,
    passwordHash: "",
    role: data.role,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    avatar: data.avatar,
    phone: data.phone,
    address: data.address,
  }
}

export async function updateUser(
  id: string,
  updates: Partial<User>
): Promise<User | null> {
  const supabase = await createClient()
  const updateData: any = {}

  if (updates.name !== undefined) updateData.name = updates.name
  if (updates.avatar !== undefined) updateData.avatar = updates.avatar
  if (updates.phone !== undefined) updateData.phone = updates.phone
  if (updates.address !== undefined) updateData.address = updates.address

  const { data, error } = await supabase
    .from("profiles")
    .update(updateData)
    .eq("id", id)
    .select()
    .single()

  if (error || !data) return null

  return {
    id: data.id,
    email: data.email,
    name: data.name,
    passwordHash: "",
    role: data.role,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    avatar: data.avatar,
    phone: data.phone,
    address: data.address,
  }
}

// Products (public data - use public client)
export async function getProducts(options?: { 
  includeArchived?: boolean
  limit?: number
  offset?: number
}): Promise<Product[]> {
  const supabase = createPublicClient()
  let query = supabase
    .from("products")
    .select(`
      *,
      categories:category_id (
        id,
        name,
        slug
      )
    `)
  
  // Filter out archived products by default
  if (!options?.includeArchived) {
    query = query.eq("is_archived", false)
  }
  
  // Apply pagination if provided, otherwise use high limit for backward compatibility
  if (options?.limit !== undefined) {
    query = query.limit(options.limit)
    if (options.offset !== undefined) {
      query = query.range(options.offset, options.offset + options.limit - 1)
    }
  } else {
    // Explicitly set a high limit to ensure we get all products
    // Supabase PostgREST default limit is 1000, but we'll set it explicitly
    query = query.limit(10000)
  }
  
  const { data, error } = await query.order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching products:", error)
    console.error("Error details:", JSON.stringify(error, null, 2))
    return []
  }

  if (!data) {
    console.warn("No data returned from products query")
    return []
  }

  // Log in development only
  if (process.env.NODE_ENV === 'development') {
    console.log(`Fetched ${data.length} products from database`)
  }

  // Map categories data to category_name for backward compatibility
  const products = (data || []).map((row: any) => {
    if (row.categories) {
      row.category_name = row.categories.name
    }
    return rowToProduct(row)
  })

  return products
}

// Get total count of products (for pagination)
export async function getProductsCount(options?: { includeArchived?: boolean }): Promise<number> {
  const supabase = createPublicClient()
  let query = supabase
    .from("products")
    .select("*", { count: "exact", head: true })
  
  // Filter out archived products by default
  if (!options?.includeArchived) {
    query = query.eq("is_archived", false)
  }
  
  const { count, error } = await query

  if (error) {
    console.error("Error fetching products count:", error)
    return 0
  }

  return count || 0
}

export async function getProductById(id: string): Promise<Product | null> {
  const supabase = createPublicClient()
  const { data, error } = await supabase
    .from("products")
    .select(`
      *,
      categories:category_id (
        id,
        name,
        slug
      )
    `)
    .eq("id", id)
    .single()

  if (error || !data) return null

  // Map category data
  const row = data as any
  if (row.categories) {
    row.category_name = row.categories.name
  }

  return rowToProduct(row)
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  const supabase = createPublicClient()
  const { data, error } = await supabase
    .from("products")
    .select(`
      *,
      categories:category_id (
        id,
        name,
        slug
      )
    `)
    .eq("slug", slug)
    .single()

  if (error || !data) return null

  // Map category data
  const row = data as any
  if (row.categories) {
    row.category_name = row.categories.name
  }

  return rowToProduct(row)
}

export async function createProduct(
  product: Omit<Product, "createdAt" | "updatedAt">
): Promise<Product> {
  const supabase = await createClient()
  const row = productToRow(product)

  const { data, error } = await supabase
    .from("products")
    .insert({ ...row, id: product.id })
    .select()
    .single()

  if (error) throw error
  return rowToProduct(data)
}

export async function updateProduct(
  id: string,
  updates: Partial<Product>
): Promise<Product | null> {
  const supabase = await createClient()
  const row = productToRow(updates)

  const { data, error } = await supabase
    .from("products")
    .update(row)
    .eq("id", id)
    .select()
    .single()

  if (error || !data) return null
  return rowToProduct(data)
}

export async function archiveProduct(id: string): Promise<boolean> {
  const supabase = await createClient()
  
  // Archive product (soft delete) instead of hard delete
  // This preserves order history while hiding the product from the store
  const { error } = await supabase
    .from("products")
    .update({ is_archived: true, in_stock: false })
    .eq("id", id)

  if (error) {
    console.error("Error archiving product:", error)
    return false
  }

  return true
}

// Keep deleteProduct for backward compatibility, but it now archives
export async function deleteProduct(id: string): Promise<boolean> {
  return archiveProduct(id)
}

// Cart
export async function getCartItems(userId: string): Promise<CartItem[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("cart_items")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })

  if (error || !data) return []

  return data.map((row) => ({
    id: row.id,
    userId: row.user_id,
    productId: row.product_id,
    quantity: row.quantity,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }))
}

export async function addCartItem(
  userId: string,
  productId: string,
  quantity: number
): Promise<CartItem> {
  const supabase = await createClient()

  // Check if item already exists
  const { data: existing } = await supabase
    .from("cart_items")
    .select("*")
    .eq("user_id", userId)
    .eq("product_id", productId)
    .single()

  if (existing) {
    const newQuantity = Math.min(existing.quantity + quantity, 10)
    const { data, error } = await supabase
      .from("cart_items")
      .update({ quantity: newQuantity })
      .eq("id", existing.id)
      .select()
      .single()

    if (error) throw error
    return {
      id: data.id,
      userId: data.user_id,
      productId: data.product_id,
      quantity: data.quantity,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    }
  }

  const { data, error } = await supabase
    .from("cart_items")
    .insert({
      user_id: userId,
      product_id: productId,
      quantity: Math.min(quantity, 10),
    })
    .select()
    .single()

  if (error) throw error
  return {
    id: data.id,
    userId: data.user_id,
    productId: data.product_id,
    quantity: data.quantity,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  }
}

export async function updateCartItem(
  userId: string,
  productId: string,
  quantity: number
): Promise<CartItem | null> {
  const supabase = await createClient()

  if (quantity <= 0) {
    await removeCartItem(userId, productId)
    return null
  }

  const { data, error } = await supabase
    .from("cart_items")
    .update({ quantity: Math.min(quantity, 10) })
    .eq("user_id", userId)
    .eq("product_id", productId)
    .select()
    .single()

  if (error || !data) return null

  return {
    id: data.id,
    userId: data.user_id,
    productId: data.product_id,
    quantity: data.quantity,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  }
}

export async function removeCartItem(userId: string, productId: string): Promise<boolean> {
  const supabase = await createClient()
  const { error } = await supabase
    .from("cart_items")
    .delete()
    .eq("user_id", userId)
    .eq("product_id", productId)

  return !error
}

export async function clearCart(userId: string): Promise<void> {
  const supabase = await createClient()
  await supabase.from("cart_items").delete().eq("user_id", userId)
}

// Wishlist
export async function getWishlistItems(userId: string): Promise<WishlistItem[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("wishlist_items")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })

  if (error || !data) return []

  return data.map((row) => ({
    id: row.id,
    userId: row.user_id,
    productId: row.product_id,
    createdAt: row.created_at,
  }))
}

export async function addWishlistItem(
  userId: string,
  productId: string
): Promise<WishlistItem> {
  const supabase = await createClient()

  // Check if already exists
  const { data: existing } = await supabase
    .from("wishlist_items")
    .select("*")
    .eq("user_id", userId)
    .eq("product_id", productId)
    .single()

  if (existing) {
    return {
      id: existing.id,
      userId: existing.user_id,
      productId: existing.product_id,
      createdAt: existing.created_at,
    }
  }

  const { data, error } = await supabase
    .from("wishlist_items")
    .insert({
      user_id: userId,
      product_id: productId,
    })
    .select()
    .single()

  if (error) throw error
  return {
    id: data.id,
    userId: data.user_id,
    productId: data.product_id,
    createdAt: data.created_at,
  }
}

export async function removeWishlistItem(
  userId: string,
  productId: string
): Promise<boolean> {
  const supabase = await createClient()
  const { error } = await supabase
    .from("wishlist_items")
    .delete()
    .eq("user_id", userId)
    .eq("product_id", productId)

  return !error
}

// Orders
export async function getOrders(userId?: string): Promise<Order[]> {
  const supabase = await createClient()
  let query = supabase.from("orders").select("*").order("created_at", { ascending: false })

  if (userId) {
    query = query.eq("user_id", userId)
  }

  const { data, error } = await query

  if (error || !data) return []

  return data.map((row) => ({
    id: row.id,
    userId: row.user_id,
    email: row.email,
    orderNumber: row.order_number,
    status: row.status,
    items: row.items,
    subtotal: parseFloat(row.subtotal),
    shipping: parseFloat(row.shipping),
    tax: parseFloat(row.tax),
    total: parseFloat(row.total),
    shippingAddress: row.shipping_address,
    billingAddress: row.billing_address,
    paymentMethod: row.payment_method,
    paymentStatus: row.payment_status,
    trackingNumber: row.tracking_number,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }))
}

export async function getOrderById(id: string): Promise<Order | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .eq("id", id)
    .single()

  if (error || !data) return null

  return {
    id: data.id,
    userId: data.user_id,
    email: data.email,
    orderNumber: data.order_number,
    status: data.status,
    items: data.items,
    subtotal: parseFloat(data.subtotal),
    shipping: parseFloat(data.shipping),
    tax: parseFloat(data.tax),
    total: parseFloat(data.total),
    shippingAddress: data.shipping_address,
    billingAddress: data.billing_address,
    paymentMethod: data.payment_method,
    paymentStatus: data.payment_status,
    trackingNumber: data.tracking_number,
    notes: data.notes,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  }
}

export async function getOrderByNumber(orderNumber: string): Promise<Order | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .eq("order_number", orderNumber)
    .single()

  if (error || !data) return null

  return {
    id: data.id,
    userId: data.user_id,
    email: data.email,
    orderNumber: data.order_number,
    status: data.status,
    items: data.items,
    subtotal: parseFloat(data.subtotal),
    shipping: parseFloat(data.shipping),
    tax: parseFloat(data.tax),
    total: parseFloat(data.total),
    shippingAddress: data.shipping_address,
    billingAddress: data.billing_address,
    paymentMethod: data.payment_method,
    paymentStatus: data.payment_status,
    trackingNumber: data.tracking_number,
    notes: data.notes,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  }
}

export async function createOrder(
  order: Omit<Order, "createdAt" | "updatedAt">
): Promise<Order> {
  const supabase = await createClient()

  // Extract email from shippingAddress for guest orders
  const email = order.email || (order.shippingAddress as any)?.email || null

  const { data, error } = await supabase
    .from("orders")
    .insert({
      id: order.id,
      user_id: order.userId,
      email: email, // Store email for guest orders
      order_number: order.orderNumber,
      status: order.status,
      items: order.items,
      subtotal: order.subtotal,
      shipping: order.shipping,
      tax: order.tax,
      total: order.total,
      shipping_address: order.shippingAddress,
      billing_address: order.billingAddress,
      payment_method: order.paymentMethod,
      payment_status: order.paymentStatus,
      tracking_number: order.trackingNumber,
      notes: order.notes,
    })
    .select()
    .single()

  if (error) throw error

  return {
    id: data.id,
    userId: data.user_id,
    email: data.email,
    orderNumber: data.order_number,
    status: data.status,
    items: data.items,
    subtotal: parseFloat(data.subtotal),
    shipping: parseFloat(data.shipping),
    tax: parseFloat(data.tax),
    total: parseFloat(data.total),
    shippingAddress: data.shipping_address,
    billingAddress: data.billing_address,
    paymentMethod: data.payment_method,
    paymentStatus: data.payment_status,
    trackingNumber: data.tracking_number,
    notes: data.notes,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  }
}

export async function updateOrder(
  id: string,
  updates: Partial<Order>
): Promise<Order | null> {
  const supabase = await createClient()
  const updateData: any = {}

  if (updates.status !== undefined) updateData.status = updates.status
  if (updates.paymentStatus !== undefined) updateData.payment_status = updates.paymentStatus
  if (updates.trackingNumber !== undefined) updateData.tracking_number = updates.trackingNumber

  const { data, error } = await supabase
    .from("orders")
    .update(updateData)
    .eq("id", id)
    .select()
    .single()

  if (error || !data) return null

  return {
    id: data.id,
    userId: data.user_id,
    email: data.email,
    orderNumber: data.order_number,
    status: data.status,
    items: data.items,
    subtotal: parseFloat(data.subtotal),
    shipping: parseFloat(data.shipping),
    tax: parseFloat(data.tax),
    total: parseFloat(data.total),
    shippingAddress: data.shipping_address,
    billingAddress: data.billing_address,
    paymentMethod: data.payment_method,
    paymentStatus: data.payment_status,
    trackingNumber: data.tracking_number,
    notes: data.notes,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  }
}
