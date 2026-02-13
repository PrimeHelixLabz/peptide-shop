import { NextRequest, NextResponse } from "next/server"
import { optionalAuthMiddleware } from "@/lib/auth/middleware"
import { getOrders, createOrder } from "@/lib/db/supabase"
import { getCartItems, clearCart } from "@/lib/db/supabase"
import { getProductById } from "@/lib/db/supabase"
import { z } from "zod"
import type { Order, OrderItem, Address } from "@/lib/db/schema"

const createOrderSchema = z.object({
  cartItems: z.array(z.object({
    productId: z.string(),
    quantity: z.number().min(1),
  })),
  shippingAddress: z.object({
    street: z.string().min(1),
    city: z.string().min(1),
    state: z.string().min(1),
    zipCode: z.string().min(1),
    country: z.string().min(1),
    email: z.string().email(),
    phone: z.string().min(1),
    firstName: z.string().min(1),
    lastName: z.string().min(1),
  }),
  billingAddress: z
    .object({
      street: z.string().min(1),
      city: z.string().min(1),
      state: z.string().min(1),
      zipCode: z.string().min(1),
      country: z.string().min(1),
    })
    .optional(),
  paymentMethod: z.string().min(1),
  paymentToken: z.string().optional(), // PaymentCloud token
  notes: z.string().optional(),
}).passthrough() // Allow additional fields for backward compatibility

// Generate guest user ID for MVP
// For MVP, we use null user_id for guest orders
// In production, you might want to create a guest user or use session-based tracking
function getGuestUserId(): string | null {
  // Return null for guest orders (database allows nullable user_id)
  return null
}

export const GET = optionalAuthMiddleware(async (req) => {
  try {
    // For MVP: return empty array for guests, or user orders if authenticated
    if (!req.user) {
      return NextResponse.json({ orders: [] })
    }

    const userId = req.user.id
    const isAdmin = req.user.role === "admin"

    // Admins can see all orders, users only their own
    const orders = await getOrders(isAdmin ? undefined : userId)

    return NextResponse.json({ orders })
  } catch (error) {
    console.error("Get orders error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
})

export const POST = optionalAuthMiddleware(async (req) => {
  try {
    // For MVP: use guest user ID if not authenticated
    const userId = req.user?.id || getGuestUserId()
    const body = await req.json()
    const { cartItems, shippingAddress, billingAddress, paymentMethod, notes } =
      createOrderSchema.parse(body)

    if (cartItems.length === 0) {
      return NextResponse.json({ error: "Cart is empty" }, { status: 400 })
    }

    // Build order items and calculate totals
    const orderItems: OrderItem[] = []
    let subtotal = 0

    for (const cartItem of cartItems) {
      const product = await getProductById(cartItem.productId)
      if (!product) {
        return NextResponse.json(
          { error: `Product ${cartItem.productId} not found` },
          { status: 400 }
        )
      }

      if (!product.inStock || product.stockQuantity < cartItem.quantity) {
        return NextResponse.json(
          { error: `Product ${product.name} is out of stock` },
          { status: 400 }
        )
      }

      const itemTotal = product.price * cartItem.quantity
      subtotal += itemTotal

      orderItems.push({
        productId: product.id,
        productName: product.name,
        productImage: product.images?.[0] || product.image,
        price: product.price,
        quantity: cartItem.quantity,
        specifications: product.specifications,
      })
    }

    const shipping = 0 // Free shipping
    const tax = subtotal * 0.1 // 10% tax (adjust as needed)
    const total = subtotal + shipping + tax

    // Generate order number
    const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substring(2, 9).toUpperCase()}`

    // Payments temporarily disabled for MVP.
    // We'll always create the order with paymentStatus "pending" and collect payment later.
    const resolvedPaymentMethod = paymentMethod || "manual"
    const paymentStatus: "pending" = "pending"

    // Create order
    // For guest orders, use email from shippingAddress instead of user_id
    const order: Omit<Order, "createdAt" | "updatedAt"> = {
      id: crypto.randomUUID(),
      userId, // null for guests, user_id for authenticated users
      email: shippingAddress.email, // Store email for guest orders
      orderNumber,
      status: "pending",
      items: orderItems,
      subtotal,
      shipping,
      tax,
      total,
      shippingAddress,
      billingAddress: billingAddress || shippingAddress,
      paymentMethod: resolvedPaymentMethod,
      paymentStatus,
      notes,
    }

    const createdOrder = await createOrder(order)

    // Clear cart if authenticated
    if (req.user) {
      await clearCart(userId)
    }

    return NextResponse.json({ order: createdOrder }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      )
    }

    console.error("Create order error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
})

