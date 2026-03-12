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
import { createAdminClient } from "@/lib/supabase/admin"
import type {
  User,
  Product,
  ProductVariant,
  VariantImage,
  CartItem,
  WishlistItem,
  Order,
  OrderItem,
  Address,
} from "./schema"

import { extractStoragePath, getStorageUrl, getStorageUrls } from "@/lib/storage/supabase-storage"

// Helper to convert database row to ProductVariant
function rowToVariant(row: any): ProductVariant {
  return {
    id: row.id,
    productId: row.product_id,
    // Prefer sku; fall back to legacy name or id for truly old rows
    sku: row.sku || row.name || row.id,
    price: parseFloat(row.price),
    stripePriceId: row.stripe_price_id || undefined,
    stock: row.stock ?? row.stock_quantity ?? 0,
    inStock: (row.stock ?? row.stock_quantity ?? 0) > 0 ? true : (row.in_stock ?? false),
    displayOrder: row.display_order || 0,
    isDefault: row.is_default ?? false,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

// Helper to convert database row to Product
function rowToProduct(row: any): Product {
  // Convert image paths to Supabase Storage URLs
  const image = row.image ? getStorageUrl(row.image) : ""
  const images = row.images && Array.isArray(row.images) 
    ? getStorageUrls(row.images) 
    : (row.images ? [getStorageUrl(row.images)] : [])
  const thumbnailUrl = row.thumbnail_url ? getStorageUrl(row.thumbnail_url) : undefined
  const coaUrl = row.coa_url ? getStorageUrl(row.coa_url) : undefined

  // Process variants if they exist
  let variants: ProductVariant[] | undefined
  if (row.variants && Array.isArray(row.variants)) {
    const mapped = row.variants.map((v: any) => rowToVariant(v))
    // Sort variants by display_order
    variants = mapped.sort((a: ProductVariant, b: ProductVariant) => a.displayOrder - b.displayOrder)
  }

  // Calculate overall stock status: true if product is in stock OR any variant is in stock
  const hasVariants = !!variants && variants.length > 0
  const overallInStock = hasVariants
    ? variants!.some(v => v.inStock)
    : row.in_stock

  // Calculate total stock quantity: sum of variant stocks or product stock
  const overallStockQuantity = hasVariants
    ? variants!.reduce((sum, v) => sum + v.stock, 0)
    : row.stock_quantity

  // Use variant price/image if variants exist and first variant is selected
  const displayPrice =
    hasVariants && variants && variants.length > 0
      ? variants[0]!.price
      : parseFloat(row.price)
  
  // Listing image should come from products.thumbnail_url.
  // For backward compatibility, fall back to legacy product image fields.
  const displayImage = thumbnailUrl || image
  const displayImages = thumbnailUrl ? [thumbnailUrl] : (images.length > 0 ? images : (image ? [image] : []))

  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    price: displayPrice, // Use first variant price if variants exist, otherwise base price
    stripeProductId: row.stripe_product_id || undefined,
    description: row.description,
    longDescription: row.long_description,
    thumbnailUrl,
    coaUrl,
    image: displayImage, // Use product image, or first variant image as placeholder
    images: displayImages,
    // Support both old category (text) and new category_id (with join)
    category: row.category_name || row.category || undefined,
    categoryId: row.category_id || undefined,
    inStock: overallInStock,
    stockQuantity: overallStockQuantity,
    specifications: row.specifications || {},
    usage: row.usage,
    shipping: row.shipping,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    createdBy: row.created_by,
    isArchived: row.is_archived || false,
    variants, // Include variants in product
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
  const thumbnail_url =
    product.thumbnailUrl !== undefined
      ? (product.thumbnailUrl ? (extractStoragePath(product.thumbnailUrl) || product.thumbnailUrl) : null)
      : undefined
  const coa_url =
    product.coaUrl !== undefined
      ? (product.coaUrl ? (extractStoragePath(product.coaUrl) || product.coaUrl) : null)
      : undefined
  
  const row: any = {
    name: product.name,
    price: product.price,
    description: product.description,
    long_description: product.longDescription,
    image,
    images: images.length > 0 ? images : (image ? [image] : []),
    ...(thumbnail_url !== undefined ? { thumbnail_url } : {}),
    ...(coa_url !== undefined ? { coa_url } : {}),
    category: product.category, // Keep for backward compatibility
    category_id: product.categoryId, // New category reference
    in_stock: product.inStock,
    stock_quantity: product.stockQuantity,
    usage: product.usage,
    shipping: product.shipping,
    created_by: product.createdBy,
  }

  // Stripe product mapping (server-side only)
  if (product.stripeProductId !== undefined) {
    row.stripe_product_id = product.stripeProductId
  }

  // Only include specifications when explicitly provided.
  // This prevents partial updates from wiping existing specs (e.g. purity)
  // when the client omits the field.
  if (product.specifications !== undefined) {
    row.specifications = product.specifications
  }
  
  // Only include slug if explicitly provided (otherwise trigger will generate it)
  if (product.slug !== undefined) {
    row.slug = product.slug
  }
  
  return row
}

/**
 * Admin-only helper to decrement inventory for all items in an order.
 *
 * This is intended to be called from background jobs and webhooks (e.g. Stripe)
 * after a successful payment.
 */
export async function adjustInventoryForOrderAsAdmin(orderId: string): Promise<void> {
  const supabase = createAdminClient()

  // Fetch order items using admin client to bypass RLS
  const { data: orderRow, error: orderError } = await supabase
    .from("orders")
    .select("id, items")
    .eq("id", orderId)
    .single()

  if (orderError || !orderRow) {
    console.error("adjustInventoryForOrderAsAdmin: failed to load order", orderError, {
      orderId,
    })
    return
  }

  const items: OrderItem[] = orderRow.items || []

  for (const item of items) {
    try {
      // If the order item references a specific variant, decrement that variant's stock.
      if (item.variantId) {
        const { data: variantRow, error: variantError } = await supabase
          .from("product_variants")
          .select("id, stock, stock_quantity, in_stock")
          .eq("id", item.variantId)
          .single()

        if (variantError || !variantRow) {
          console.error(
            "adjustInventoryForOrderAsAdmin: failed to load variant",
            variantError,
            { variantId: item.variantId, orderId }
          )
          continue
        }

        const currentStock =
          (variantRow as any).stock ??
          (variantRow as any).stock_quantity ??
          0
        const newStock = Math.max(0, currentStock - item.quantity)

        const { error: updateVariantError } = await supabase
          .from("product_variants")
          .update({
            stock: newStock,
            stock_quantity: newStock,
            in_stock: newStock > 0,
          })
          .eq("id", item.variantId)

        if (updateVariantError) {
          console.error(
            "adjustInventoryForOrderAsAdmin: failed to update variant stock",
            updateVariantError,
            { variantId: item.variantId, orderId }
          )
        }

        continue
      }

      // Otherwise, decrement the base product stock.
      const { data: productRow, error: productError } = await supabase
        .from("products")
        .select("id, stock_quantity, in_stock")
        .eq("id", item.productId)
        .single()

      if (productError || !productRow) {
        console.error(
          "adjustInventoryForOrderAsAdmin: failed to load product",
          productError,
          { productId: item.productId, orderId }
        )
        continue
      }

      const currentStock = (productRow as any).stock_quantity ?? 0
      const newStock = Math.max(0, currentStock - item.quantity)

      const { error: updateProductError } = await supabase
        .from("products")
        .update({
          stock_quantity: newStock,
          in_stock: newStock > 0,
        })
        .eq("id", item.productId)

      if (updateProductError) {
        console.error(
          "adjustInventoryForOrderAsAdmin: failed to update product stock",
          updateProductError,
          { productId: item.productId, orderId }
        )
      }
    } catch (err) {
      console.error(
        "adjustInventoryForOrderAsAdmin: unexpected error adjusting item",
        err,
        { orderId, item }
      )
    }
  }
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
    ageVerified: data.age_verified ?? false,
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
    ageVerified: data.age_verified ?? false,
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
  if (updates.ageVerified !== undefined) updateData.age_verified = updates.ageVerified

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
    ageVerified: data.age_verified ?? false,
  }
}

// Products (public data - use public client)
export type SortOption = 
  | "name_asc" 
  | "name_desc" 
  | "price_asc" 
  | "price_desc" 
  | "date_asc" 
  | "date_desc"

export async function getProducts(options?: { 
  includeArchived?: boolean
  limit?: number
  offset?: number
  sortBy?: SortOption
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
  
  // Apply sorting
  const sortBy = options?.sortBy || "name_asc" // Default to name ascending
  switch (sortBy) {
    case "name_asc":
      query = query.order("name", { ascending: true })
      break
    case "name_desc":
      query = query.order("name", { ascending: false })
      break
    case "price_asc":
      query = query.order("price", { ascending: true })
      break
    case "price_desc":
      query = query.order("price", { ascending: false })
      break
    case "date_asc":
      query = query.order("created_at", { ascending: true })
      break
    case "date_desc":
      query = query.order("created_at", { ascending: false })
      break
    default:
      query = query.order("name", { ascending: true })
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
  
  const { data, error } = await query

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
      ),
      variants:product_variants (
        *
      )
    `)
    .eq("id", id)
    .eq("is_archived", false)
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
      ),
      variants:product_variants (
        *
      )
    `)
    .eq("slug", slug)
    .eq("is_archived", false)
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
  const supabase = await createClient()

  // Permanently delete variant images for this product's variants
  const { data: variants, error: variantsError } = await supabase
    .from("product_variants")
    .select("id")
    .eq("product_id", id)

  if (variantsError) {
    console.error("Error fetching variants for delete:", variantsError)
    return false
  }

  const variantIds = (variants || []).map((v: any) => v.id)

  if (variantIds.length > 0) {
    const { error: imagesError } = await supabase
      .from("variant_images")
      .delete()
      .in("variant_id", variantIds)

    if (imagesError) {
      console.error("Error deleting variant images:", imagesError)
      return false
    }

    const { error: deleteVariantsError } = await supabase
      .from("product_variants")
      .delete()
      .in("id", variantIds)

    if (deleteVariantsError) {
      console.error("Error deleting variants:", deleteVariantsError)
      return false
    }
  }

  // Finally, delete the product row itself
  const { error: deleteProductError } = await supabase
    .from("products")
    .delete()
    .eq("id", id)

  if (deleteProductError) {
    console.error("Error deleting product:", deleteProductError)
    return false
  }

  return true
}

// Product Variants
export async function getProductVariants(productId: string): Promise<ProductVariant[]> {
  const supabase = createPublicClient()
  const { data, error } = await supabase
    .from("product_variants")
    .select("*")
    .eq("product_id", productId)
    .order("display_order", { ascending: true })
    .order("name", { ascending: true })

  if (error || !data) return []
  return data.map(rowToVariant)
}

export async function getVariantById(id: string): Promise<ProductVariant | null> {
  const supabase = createPublicClient()
  const { data, error } = await supabase
    .from("product_variants")
    .select("*")
    .eq("id", id)
    .single()

  if (error || !data) return null
  return rowToVariant(data)
}

export async function createVariant(
  variant: Omit<ProductVariant, "id" | "createdAt" | "updatedAt">
): Promise<ProductVariant> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("product_variants")
    .insert({
      product_id: variant.productId,
      // Keep legacy name column populated for now to satisfy NOT NULL + uniqueness,
      // but all application logic should use sku instead.
      name: variant.sku,
      sku: variant.sku,
      price: variant.price,
      stock: variant.stock,
      stock_quantity: variant.stock, // legacy
      in_stock: variant.stock > 0,
      is_default: variant.isDefault,
      display_order: variant.displayOrder,
    })
    .select()
    .single()

  if (error) throw error
  return rowToVariant(data)
}

export async function updateVariant(
  id: string,
  updates: Partial<ProductVariant>
): Promise<ProductVariant | null> {
  const supabase = await createClient()
  
  const updateData: any = {}
  if (updates.sku !== undefined) updateData.sku = updates.sku
  if (updates.price !== undefined) updateData.price = updates.price
  if (updates.stripePriceId !== undefined) updateData.stripe_price_id = updates.stripePriceId
  if (updates.stock !== undefined) {
    updateData.stock = updates.stock
    updateData.stock_quantity = updates.stock // legacy
    updateData.in_stock = updates.stock > 0
  }
  if (updates.isDefault !== undefined) updateData.is_default = updates.isDefault
  if (updates.displayOrder !== undefined) updateData.display_order = updates.displayOrder

  const { data, error } = await supabase
    .from("product_variants")
    .update(updateData)
    .eq("id", id)
    .select()
    .single()

  if (error || !data) return null
  return rowToVariant(data)
}

export async function deleteVariant(id: string): Promise<boolean> {
  const supabase = await createClient()
  const { error } = await supabase
    .from("product_variants")
    .delete()
    .eq("id", id)

  return !error
}

/**
 * Ensure exactly one default variant for a product.
 * If no default exists, picks the first by display_order/created_at.
 */
export async function ensureDefaultVariant(productId: string): Promise<string | null> {
  const supabase = await createClient()

  const { data: existingDefault } = await supabase
    .from("product_variants")
    .select("id")
    .eq("product_id", productId)
    .eq("is_default", true)
    .maybeSingle()

  if (existingDefault?.id) return existingDefault.id

  const { data: firstVariant, error } = await supabase
    .from("product_variants")
    .select("id")
    .eq("product_id", productId)
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle()

  if (error || !firstVariant?.id) return null

  await supabase
    .from("product_variants")
    .update({ is_default: true })
    .eq("id", firstVariant.id)

  return firstVariant.id
}

/**
 * Set a product's default variant and (optionally) sync product thumbnail to the new default's primary image.
 * Note: This intentionally clears other defaults first to satisfy the partial unique index.
 */
export async function setDefaultVariant(
  productId: string,
  variantId: string,
  options?: { syncThumbnail?: boolean }
): Promise<void> {
  const supabase = await createClient()

  // Clear all defaults for the product first (prevents unique index conflict)
  const { error: clearError } = await supabase
    .from("product_variants")
    .update({ is_default: false })
    .eq("product_id", productId)

  if (clearError) throw clearError

  const { error: setError } = await supabase
    .from("product_variants")
    .update({ is_default: true })
    .eq("id", variantId)
    .eq("product_id", productId)
  if (setError) throw setError

  // Only derive product thumbnail from the default variant when the product
  // does not already have an explicit thumbnail.
  // This prevents clobbering admin-uploaded thumbnails on every save.
  if (options?.syncThumbnail ?? true) {
    await syncProductThumbnailToDefaultVariant(productId, { force: false })
  }
}

/**
 * Sync products.thumbnail_url from the primary image of the default variant.
 */
export async function syncProductThumbnailToDefaultVariant(
  productId: string,
  options?: { force?: boolean }
): Promise<void> {
  const supabase = await createClient()

  // If not forcing, only fill if thumbnail_url is blank.
  if (!options?.force) {
    const { data: product } = await supabase
      .from("products")
      .select("thumbnail_url")
      .eq("id", productId)
      .single()

    const cur = product?.thumbnail_url as string | null | undefined
    if (cur && cur.trim() !== "") return
  }

  const { data: def } = await supabase
    .from("product_variants")
    .select("id")
    .eq("product_id", productId)
    .eq("is_default", true)
    .maybeSingle()

  const defaultVariantId = def?.id || (await ensureDefaultVariant(productId))
  if (!defaultVariantId) return

  const { data: img } = await supabase
    .from("variant_images")
    .select("image_url")
    .eq("variant_id", defaultVariantId)
    .order("is_primary", { ascending: false })
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle()

  const imageUrl = img?.image_url as string | null | undefined
  if (!imageUrl || imageUrl.trim() === "") return

  await supabase
    .from("products")
    .update({ thumbnail_url: imageUrl })
    .eq("id", productId)
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
    variantId: row.variant_id || undefined,
    quantity: row.quantity,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }))
}

export async function addCartItem(
  userId: string,
  productId: string,
  quantity: number,
  variantId?: string
): Promise<CartItem> {
  const supabase = await createClient()

  // Check if item already exists (same product + variant combination)
  let query = supabase
    .from("cart_items")
    .select("*")
    .eq("user_id", userId)
    .eq("product_id", productId)
  
  if (variantId) {
    query = query.eq("variant_id", variantId)
  } else {
    query = query.is("variant_id", null)
  }

  const { data: existing, error: queryError } = await query.maybeSingle()

  if (queryError && queryError.code !== 'PGRST116') {
    // PGRST116 is "not found" which is expected, other errors should be thrown
    throw queryError
  }

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
      variantId: data.variant_id || undefined,
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
      variant_id: variantId || null,
      quantity: Math.min(quantity, 10),
    })
    .select()
    .single()

  if (error) throw error
  return {
    id: data.id,
    userId: data.user_id,
    productId: data.product_id,
    variantId: data.variant_id || undefined,
    quantity: data.quantity,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  }
}

export async function updateCartItem(
  userId: string,
  productId: string,
  quantity: number,
  variantId?: string
): Promise<CartItem | null> {
  const supabase = await createClient()

  if (quantity <= 0) {
    await removeCartItem(userId, productId, variantId)
    return null
  }

  let query = supabase
    .from("cart_items")
    .update({ quantity: Math.min(quantity, 10) })
    .eq("user_id", userId)
    .eq("product_id", productId)
  
  if (variantId) {
    query = query.eq("variant_id", variantId)
  } else {
    query = query.is("variant_id", null)
  }

  const { data, error } = await query.select().single()

  if (error || !data) return null

  return {
    id: data.id,
    userId: data.user_id,
    productId: data.product_id,
    variantId: data.variant_id || undefined,
    quantity: data.quantity,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  }
}

export async function removeCartItem(userId: string, productId: string, variantId?: string): Promise<boolean> {
  const supabase = await createClient()
  let query = supabase
    .from("cart_items")
    .delete()
    .eq("user_id", userId)
    .eq("product_id", productId)
  
  if (variantId) {
    query = query.eq("variant_id", variantId)
  } else {
    query = query.is("variant_id", null)
  }

  const { error } = await query
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
    serviceFee: parseFloat(row.service_fee),
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
    serviceFee: parseFloat(data.service_fee),
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
    serviceFee: parseFloat(data.service_fee),
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
      service_fee: order.serviceFee,
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
    serviceFee: parseFloat(data.service_fee),
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

  console.log("Updating order", id)
  console.log("Update data", updateData)

  const { data, error } = await supabase
    .from("orders")
    .update(updateData)
    .eq("id", id)
    .select()
    .single()

  console.log("Updated order", data)
  console.log("Error", error)

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
    serviceFee: parseFloat(data.service_fee),
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

/**
 * Admin-only order update that bypasses RLS using the service role.
 * Intended for background jobs and webhooks (e.g. Stripe).
 */
export async function updateOrderAsAdmin(
  id: string,
  updates: Partial<Order>
): Promise<Order | null> {
  const supabase = createAdminClient()
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

  if (error || !data) {
    console.error("updateOrderAsAdmin error", error)
    return null
  }

  return {
    id: data.id,
    userId: data.user_id,
    email: data.email,
    orderNumber: data.order_number,
    status: data.status,
    items: data.items,
    subtotal: parseFloat(data.subtotal),
    shipping: parseFloat(data.shipping),
    serviceFee: parseFloat(data.service_fee),
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

/**
 * Admin-only cart clear that bypasses RLS using the service role.
 * Used by Stripe webhook after successful checkout.
 */
export async function clearCartAsAdmin(userId: string): Promise<void> {
  const supabase = createAdminClient()
  const { error } = await supabase.from("cart_items").delete().eq("user_id", userId)
  if (error) {
    console.error("clearCartAsAdmin error", error)
  }
}
