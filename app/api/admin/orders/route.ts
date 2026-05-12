import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { requireAdminMiddleware } from "@/lib/auth/middleware"
import { createAdminClient } from "@/lib/supabase/admin"
import {
  getProductById,
  getVariantById,
  createOrderAsAdmin,
  adjustInventoryForOrderAsAdmin,
  checkStockAvailability,
  deleteOrderAsAdmin,
} from "@/lib/db/supabase"
import { getShippingCost } from "@/lib/order-constants"
import type { Order, OrderItem } from "@/lib/db/schema"
import {
  sendOrderNotificationEmail,
  sendCustomerOrderConfirmedEmail,
} from "@/lib/email"

export const GET = requireAdminMiddleware(async (req) => {
  try {
    const supabase = createAdminClient()

    // Get all orders (including email column for guest orders)
    const { data: ordersData, error: ordersError } = await supabase
      .from("orders")
      .select("id, order_number, status, payment_status, payment_method, total, items, created_at, user_id, email, shipping_address")
      .order("created_at", { ascending: false })

    if (ordersError) {
      console.error("Error fetching orders:", ordersError)
      return NextResponse.json({ error: "Failed to fetch orders" }, { status: 500 })
    }

    if (!ordersData || ordersData.length === 0) {
      return NextResponse.json({ orders: [] })
    }

    // Get unique user IDs (filter out nulls for guest orders)
    const userIds = [...new Set(ordersData.map((o: any) => o.user_id).filter((id: any) => id !== null))]

    // Fetch profiles for authenticated users only
    const { data: profilesData } = await supabase
      .from("profiles")
      .select("id, name, email")
      .in("id", userIds)

    // Create a map of user_id -> profile
    const profilesMap = new Map(
      (profilesData || []).map((p: any) => [p.id, p])
    )

    // Transform orders to match the AdminOrder interface
    const orders = ordersData.map((order: any) => {
      // For guest orders (user_id is null), use email from orders table or shipping_address
      // For authenticated orders, use profile data
      const isGuestOrder = order.user_id === null
      const profile = profilesMap.get(order.user_id) || {}

      // Get customer name and email
      let customerName = "Guest Customer"
      let customerEmail = order.email || "No email"

      if (!isGuestOrder && profile.name) {
        customerName = profile.name
        customerEmail = profile.email || customerEmail
      }

      // For guest orders, or authenticated users without a profile name,
      // fall back to shipping address name
      if (customerName === "Guest Customer" && order.shipping_address) {
        const shippingAddr = order.shipping_address
        if (shippingAddr.firstName && shippingAddr.lastName) {
          customerName = `${shippingAddr.firstName} ${shippingAddr.lastName}`
        } else if (shippingAddr.firstName) {
          customerName = shippingAddr.firstName
        }
        if (!isGuestOrder) {
          customerEmail = profile.email || customerEmail
        } else {
          customerEmail = order.email || shippingAddr.email || customerEmail
        }
      }

      const itemsCount = Array.isArray(order.items) ? order.items.length : 0

      // Map payment status
      const paymentStatusMap: Record<
        string,
        "Paid" | "Pending" | "Authorized" | "Processing" | "Refunded"
      > = {
        paid: "Paid",
        pending: "Pending",
        authorized: "Authorized",
        processing: "Processing",
        refunded: "Refunded",
        failed: "Pending",
      }

      // Map shipping status
      const shippingStatusMap: Record<string, "Processing" | "Shipped" | "Delivered"> = {
        pending: "Processing",
        processing: "Processing",
        shipped: "Shipped",
        delivered: "Delivered",
        cancelled: "Processing",
      }

      return {
        id: order.order_number || order.id,
        customer: customerName,
        email: customerEmail,
        items: itemsCount,
        total: `$${parseFloat(order.total || "0").toFixed(2)}`,
        date: new Date(order.created_at).toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
        }),
        paymentStatus: paymentStatusMap[order.payment_status || "pending"] || "Pending",
        shippingStatus: shippingStatusMap[order.status || "pending"] || "Processing",
        paymentMethod: order.payment_method || "stripe",
        orderId: order.id, // Keep original ID for detail page
      }
    })

    return NextResponse.json({ orders })
  } catch (error) {
    console.error("Get orders error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
})

const adminCreateOrderSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string().uuid(),
        variantId: z.string().uuid(),
        quantity: z.number().int().min(1),
      })
    )
    .min(1, "At least one item is required"),
  shippingAddress: z.object({
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    email: z.string().email(),
    phone: z.string().min(1),
    street: z.string().min(1),
    city: z.string().min(1),
    state: z.string().min(1),
    zipCode: z.string().min(1),
    country: z.string().min(1),
  }),
  shippingMethod: z.enum(["ship", "local-pickup"]).default("ship"),
  notes: z.string().optional(),
})

export const POST = requireAdminMiddleware(async (req) => {
  try {
    const body = await req.json()
    const data = adminCreateOrderSchema.parse(body)

    // Resolve products and variants, build items list with server-side prices.
    const orderItems: OrderItem[] = []
    let subtotal = 0

    for (const line of data.items) {
      const product = await getProductById(line.productId)
      if (!product) {
        return NextResponse.json(
          { error: `Product ${line.productId} not found` },
          { status: 400 }
        )
      }

      const variant = await getVariantById(line.variantId)
      if (!variant || variant.productId !== product.id) {
        return NextResponse.json(
          { error: `Variant does not belong to product ${product.name}` },
          { status: 400 }
        )
      }

      orderItems.push({
        productId: product.id,
        productName: `${product.name} (${variant.sku})`,
        productImage: product.images?.[0] || product.image,
        price: variant.price,
        quantity: line.quantity,
        variantId: variant.id,
        variantName: variant.sku,
        specifications: product.specifications,
      })

      subtotal += variant.price * line.quantity
    }

    // Pre-flight stock check — block before any DB mutation.
    const shortfalls = await checkStockAvailability(
      orderItems.map((i) => ({
        variantId: i.variantId,
        quantity: i.quantity,
        productName: i.productName,
        variantName: i.variantName,
      }))
    )
    if (shortfalls.length > 0) {
      return NextResponse.json(
        {
          error: "Insufficient stock",
          message:
            "One or more items don't have enough stock. Adjust quantities or restock before creating this order.",
          shortfalls,
        },
        { status: 409 }
      )
    }

    // Pricing — admin cash orders skip the service fee since there's no
    // payment processor to compensate.
    const shipping = getShippingCost(subtotal, data.shippingMethod)
    const serviceFee = 0
    const total = subtotal + shipping + serviceFee

    const orderNumber = `ORD-${Date.now()}-${Math.random()
      .toString(36)
      .substring(2, 9)
      .toUpperCase()}`

    const orderInput: Omit<Order, "createdAt" | "updatedAt"> = {
      id: crypto.randomUUID(),
      userId: null,
      email: data.shippingAddress.email,
      orderNumber,
      status: "processing",
      items: orderItems,
      subtotal,
      shipping,
      serviceFee,
      total,
      shippingAddress: data.shippingAddress as any,
      billingAddress: data.shippingAddress as any,
      paymentMethod: "cash",
      paymentStatus: "paid",
      notes: data.notes,
    }

    const createdOrder = await createOrderAsAdmin(orderInput)

    // Atomic deduct. The pre-flight check above is best-effort; another order
    // could have decremented stock in the gap, so the RPC is the real gate.
    const adjustResult = await adjustInventoryForOrderAsAdmin(createdOrder.id)

    if (adjustResult.rpcError || !adjustResult.ok) {
      await deleteOrderAsAdmin(createdOrder.id)

      if (adjustResult.rpcError) {
        return NextResponse.json(
          { error: "Inventory service unavailable, please retry" },
          { status: 503 }
        )
      }

      return NextResponse.json(
        {
          error: "Insufficient stock",
          message:
            "Stock changed between the pre-flight check and the decrement. Adjust quantities or restock and try again.",
          shortfalls: adjustResult.shortfalls,
        },
        { status: 409 }
      )
    }

    sendOrderNotificationEmail(createdOrder).catch((err) =>
      console.error("Failed to send admin cash order notification:", err)
    )
    sendCustomerOrderConfirmedEmail(createdOrder).catch((err) =>
      console.error("Failed to send customer paid-confirmation email:", err)
    )

    return NextResponse.json({ order: createdOrder }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      )
    }
    console.error("Admin create order error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
})
