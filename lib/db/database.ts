/**
 * Database Layer
 * 
 * This is a simple in-memory database implementation using JSON files.
 * In production, replace with:
 * - Prisma + PostgreSQL/MySQL
 * - Drizzle ORM
 * - MongoDB with Mongoose
 * - Supabase
 * - Any other database solution
 */

import { readFile, writeFile, mkdir } from "fs/promises"
import { existsSync } from "fs"
import { join } from "path"
import type { User, Product, CartItem, WishlistItem, Order } from "./schema"

const DATA_DIR = join(process.cwd(), "data")
const USERS_FILE = join(DATA_DIR, "users.json")
const PRODUCTS_FILE = join(DATA_DIR, "products.json")
const CART_FILE = join(DATA_DIR, "cart.json")
const WISHLIST_FILE = join(DATA_DIR, "wishlist.json")
const ORDERS_FILE = join(DATA_DIR, "orders.json")

// Ensure data directory exists
async function ensureDataDir() {
  if (!existsSync(DATA_DIR)) {
    await mkdir(DATA_DIR, { recursive: true })
  }
}

// Generic file operations
async function readJsonFile<T>(filePath: string, defaultValue: T[]): Promise<T[]> {
  try {
    if (!existsSync(filePath)) {
      return defaultValue
    }
    const content = await readFile(filePath, "utf-8")
    return JSON.parse(content)
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error)
    return defaultValue
  }
}

async function writeJsonFile<T>(filePath: string, data: T[]): Promise<void> {
  try {
    await ensureDataDir()
    await writeFile(filePath, JSON.stringify(data, null, 2), "utf-8")
  } catch (error) {
    console.error(`Error writing ${filePath}:`, error)
    throw error
  }
}

// Users
export async function getUsers(): Promise<User[]> {
  return readJsonFile<User>(USERS_FILE, [])
}

export async function getUserById(id: string): Promise<User | null> {
  const users = await getUsers()
  return users.find((u) => u.id === id) || null
}

export async function getUserByEmail(email: string): Promise<User | null> {
  const users = await getUsers()
  return users.find((u) => u.email === email) || null
}

export async function createUser(user: Omit<User, "createdAt" | "updatedAt">): Promise<User> {
  const users = await getUsers()
  const newUser: User = {
    ...user,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  users.push(newUser)
  await writeJsonFile(USERS_FILE, users)
  return newUser
}

export async function updateUser(id: string, updates: Partial<User>): Promise<User | null> {
  const users = await getUsers()
  const index = users.findIndex((u) => u.id === id)
  if (index === -1) return null

  users[index] = {
    ...users[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  }
  await writeJsonFile(USERS_FILE, users)
  return users[index]
}

// Products
export async function getProducts(): Promise<Product[]> {
  return readJsonFile<Product>(PRODUCTS_FILE, [])
}

export async function getProductById(id: string): Promise<Product | null> {
  const products = await getProducts()
  return products.find((p) => p.id === id) || null
}

export async function createProduct(
  product: Omit<Product, "createdAt" | "updatedAt">
): Promise<Product> {
  const products = await getProducts()
  const newProduct: Product = {
    ...product,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  products.push(newProduct)
  await writeJsonFile(PRODUCTS_FILE, products)
  return newProduct
}

export async function updateProduct(
  id: string,
  updates: Partial<Product>
): Promise<Product | null> {
  const products = await getProducts()
  const index = products.findIndex((p) => p.id === id)
  if (index === -1) return null

  products[index] = {
    ...products[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  }
  await writeJsonFile(PRODUCTS_FILE, products)
  return products[index]
}

export async function deleteProduct(id: string): Promise<boolean> {
  const products = await getProducts()
  const filtered = products.filter((p) => p.id !== id)
  if (filtered.length === products.length) return false
  await writeJsonFile(PRODUCTS_FILE, filtered)
  return true
}

// Cart
export async function getCartItems(userId: string): Promise<CartItem[]> {
  const items = await readJsonFile<CartItem>(CART_FILE, [])
  return items.filter((item) => item.userId === userId)
}

export async function addCartItem(
  userId: string,
  productId: string,
  quantity: number
): Promise<CartItem> {
  const items = await readJsonFile<CartItem>(CART_FILE, [])
  const existing = items.find(
    (item) => item.userId === userId && item.productId === productId
  )

  if (existing) {
    existing.quantity = Math.min(existing.quantity + quantity, 10)
    existing.updatedAt = new Date().toISOString()
    await writeJsonFile(CART_FILE, items)
    return existing
  }

  const newItem: CartItem = {
    id: crypto.randomUUID(),
    userId,
    productId,
    quantity,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  items.push(newItem)
  await writeJsonFile(CART_FILE, items)
  return newItem
}

export async function updateCartItem(
  userId: string,
  productId: string,
  quantity: number
): Promise<CartItem | null> {
  const items = await readJsonFile<CartItem>(CART_FILE, [])
  const item = items.find((i) => i.userId === userId && i.productId === productId)
  if (!item) return null

  if (quantity <= 0) {
    const filtered = items.filter((i) => !(i.userId === userId && i.productId === productId))
    await writeJsonFile(CART_FILE, filtered)
    return null
  }

  item.quantity = Math.min(quantity, 10)
  item.updatedAt = new Date().toISOString()
  await writeJsonFile(CART_FILE, items)
  return item
}

export async function removeCartItem(userId: string, productId: string): Promise<boolean> {
  const items = await readJsonFile<CartItem>(CART_FILE, [])
  const filtered = items.filter((i) => !(i.userId === userId && i.productId === productId))
  if (filtered.length === items.length) return false
  await writeJsonFile(CART_FILE, filtered)
  return true
}

export async function clearCart(userId: string): Promise<void> {
  const items = await readJsonFile<CartItem>(CART_FILE, [])
  const filtered = items.filter((i) => i.userId !== userId)
  await writeJsonFile(CART_FILE, filtered)
}

// Wishlist
export async function getWishlistItems(userId: string): Promise<WishlistItem[]> {
  const items = await readJsonFile<WishlistItem>(WISHLIST_FILE, [])
  return items.filter((item) => item.userId === userId)
}

export async function addWishlistItem(userId: string, productId: string): Promise<WishlistItem> {
  const items = await readJsonFile<WishlistItem>(WISHLIST_FILE, [])
  const existing = items.find((item) => item.userId === userId && item.productId === productId)

  if (existing) {
    return existing
  }

  const newItem: WishlistItem = {
    id: crypto.randomUUID(),
    userId,
    productId,
    createdAt: new Date().toISOString(),
  }
  items.push(newItem)
  await writeJsonFile(WISHLIST_FILE, items)
  return newItem
}

export async function removeWishlistItem(userId: string, productId: string): Promise<boolean> {
  const items = await readJsonFile<WishlistItem>(WISHLIST_FILE, [])
  const filtered = items.filter(
    (i) => !(i.userId === userId && i.productId === productId)
  )
  if (filtered.length === items.length) return false
  await writeJsonFile(WISHLIST_FILE, filtered)
  return true
}

// Orders
export async function getOrders(userId?: string): Promise<Order[]> {
  const orders = await readJsonFile<Order>(ORDERS_FILE, [])
  if (userId) {
    return orders.filter((o) => o.userId === userId)
  }
  return orders
}

export async function getOrderById(id: string): Promise<Order | null> {
  const orders = await getOrders()
  return orders.find((o) => o.id === id) || null
}

export async function getOrderByNumber(orderNumber: string): Promise<Order | null> {
  const orders = await getOrders()
  return orders.find((o) => o.orderNumber === orderNumber) || null
}

export async function createOrder(order: Omit<Order, "createdAt" | "updatedAt">): Promise<Order> {
  const orders = await getOrders()
  const newOrder: Order = {
    ...order,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  orders.push(newOrder)
  await writeJsonFile(ORDERS_FILE, orders)
  return newOrder
}

export async function updateOrder(id: string, updates: Partial<Order>): Promise<Order | null> {
  const orders = await getOrders()
  const index = orders.findIndex((o) => o.id === id)
  if (index === -1) return null

  orders[index] = {
    ...orders[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  }
  await writeJsonFile(ORDERS_FILE, orders)
  return orders[index]
}

// Initialize with mock data if empty
export async function initializeDatabase() {
  await ensureDataDir()
  const products = await getProducts()
  if (products.length === 0) {
    // Import and seed mock products
    const { mockProducts } = await import("../api/mock-data")
    const dbProducts: Product[] = mockProducts.map((p) => ({
      ...p,
      stockQuantity: p.inStock ? 100 : 0,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }))
    await writeJsonFile(PRODUCTS_FILE, dbProducts)
  }
}
