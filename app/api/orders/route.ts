import { NextRequest, NextResponse } from "next/server"
import { requireAuthMiddleware, type AuthenticatedRequest } from "@/lib/auth/middleware"
import {
  getOrders,
  createOrder,
  adjustInventoryForOrderAsAdmin,
  deleteOrderAsAdmin,
} from "@/lib/db/supabase"
import { getCartItems, clearCart } from "@/lib/db/supabase"
import { getProductById, getVariantById } from "@/lib/db/supabase"
import { z } from "zod"
import type { Order, OrderItem, Address } from "@/lib/db/schema"
import { getServiceFeeRate } from "@/lib/order-constants"
import { getAffiliateCodeFromRequest } from "@/lib/affiliates"

const createOrderSchema = z.object({
  cartItems: z.array(z.object({
    productId: z.string(),
    quantity: z.number().min(1),
    // variantId is required: every product must have at least one variant
    // (enforced by migration 026 + admin form), and inventory adjustment
    // depends on variantId to know which row to decrement.
    variantId: z.string().uuid(),
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
  notes: z.string().optional(),
}).passthrough() // Allow additional fields for backward compatibility

export const GET = requireAuthMiddleware(async (req: AuthenticatedRequest) => {
  try {
    const userId = req.user!.id
    const isAdmin = req.user!.role === "admin"

    // Admins can see all orders, users only their own
    const orders = await getOrders(isAdmin ? undefined : userId)

    return NextResponse.json({ orders })
  } catch (error) {
    console.error("Get orders error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
})

export const POST = requireAuthMiddleware(async (req: AuthenticatedRequest) => {
  try {
    const userId = req.user!.id
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

      const variant = await getVariantById(cartItem.variantId)
      if (!variant) {
        return NextResponse.json(
          { error: `Variant ${cartItem.variantId} not found` },
          { status: 400 }
        )
      }
      if (variant.productId !== product.id) {
        return NextResponse.json(
          { error: `Variant does not belong to product ${product.name}` },
          { status: 400 }
        )
      }

      const displayPrice = variant.price
      const displayImage = variant.images?.[0] || variant.image || product.images?.[0] || product.image
      const displayName = `${product.name} (${variant.sku})`

      if (!variant.inStock || variant.stock < cartItem.quantity) {
        return NextResponse.json(
          { error: `${displayName} is out of stock` },
          { status: 400 }
        )
      }

      const itemTotal = displayPrice * cartItem.quantity
      subtotal += itemTotal

      orderItems.push({
        productId: product.id,
        productName: displayName,
        productImage: displayImage,
        price: displayPrice,
        quantity: cartItem.quantity,
        variantId: variant.id,
        variantName: variant.sku,
        specifications: product.specifications,
      })
    }

    const shipping = 0 // Shipping (non-Stripe path, no method selection)
    const serviceFee = subtotal * getServiceFeeRate(paymentMethod)
    const total = subtotal + shipping + serviceFee

    // Generate order number
    const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substring(2, 9).toUpperCase()}`

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
      serviceFee,
      total,
      shippingAddress,
      billingAddress: billingAddress || shippingAddress,
      paymentMethod: resolvedPaymentMethod,
      paymentStatus,
      notes,
      affiliateCode: getAffiliateCodeFromRequest(req),
    }

    const createdOrder = await createOrder(order)

    // Atomically decrement inventory. If a concurrent order beat us to the
    // last units, the function returns a shortfall and leaves stock untouched
    // — we then delete the order we just created so the customer isn't
    // charged for unavailable stock and inventory stays consistent.
    const adjustResult = await adjustInventoryForOrderAsAdmin(createdOrder.id)

    if (adjustResult.rpcError) {
      await deleteOrderAsAdmin(createdOrder.id)
      return NextResponse.json(
        { error: "Could not reserve inventory, please try again" },
        { status: 503 }
      )
    }

    if (!adjustResult.ok) {
      await deleteOrderAsAdmin(createdOrder.id)
      return NextResponse.json(
        {
          error: "Some items are no longer in stock",
          shortfalls: adjustResult.shortfalls,
        },
        { status: 409 }
      )
    }

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

