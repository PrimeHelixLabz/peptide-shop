import { NextRequest, NextResponse } from "next/server"
import { optionalAuthMiddleware } from "@/lib/auth/middleware"
import { getOrderById, getOrderByNumber, updateOrder } from "@/lib/db/supabase"
import { z } from "zod"

const updateOrderSchema = z.object({
  status: z.enum(["pending", "processing", "shipped", "delivered", "cancelled"]).optional(),
  paymentStatus: z.enum(["pending", "paid", "failed", "refunded"]).optional(),
  trackingNumber: z.string().optional(),
})

// Check if the identifier is an order number (starts with "ORD-") or an order ID (UUID)
function isOrderNumber(identifier: string): boolean {
  return identifier.startsWith("ORD-")
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Get user if authenticated (optional)
    const { getCurrentUser } = await import("@/lib/auth/supabase-auth")
    const user = await getCurrentUser()
    
    const { id } = await params
    const { searchParams } = new URL(req.url)
    const email = searchParams.get("email")
    
    // Try to get order by ID or order number
    const order = isOrderNumber(id) 
      ? await getOrderByNumber(id)
      : await getOrderById(id)
    
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }

    // If user is authenticated, check permissions
    if (user) {
      const userId = user.id
      const isAdmin = user.role === "admin"

      // Admins can see all orders
      if (isAdmin) {
        return NextResponse.json({ order })
      }

      // Authenticated users can only see their own orders
      if (order.userId !== null && order.userId === userId) {
        return NextResponse.json({ order })
      }
    }

    // For guest orders (userId is null), require email verification
    if (order.userId === null) {
      if (!email) {
        return NextResponse.json({ 
          error: "Email address required to view guest orders" 
        }, { status: 400 })
      }

      // Verify email matches the order
      const orderEmail = order.email?.toLowerCase() || 
        (order.shippingAddress as any)?.email?.toLowerCase()
      const providedEmail = email.toLowerCase().trim()

      if (orderEmail !== providedEmail) {
        return NextResponse.json({ 
          error: "Email address does not match this order" 
        }, { status: 403 })
      }
    } else {
      // Authenticated order but user is not authenticated or doesn't own it
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    return NextResponse.json({ order })
  } catch (error) {
    console.error("Get order error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Require admin authentication
    const { requireAdmin } = await import("@/lib/auth/supabase-auth")
    const user = await requireAdmin()
    
    const { id } = await params

    const body = await req.json()
    const data = updateOrderSchema.parse(body)

    // Get order first to find the actual ID if orderNumber was provided
    const order = isOrderNumber(id)
      ? await getOrderByNumber(id)
      : await getOrderById(id)
    
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }

    const updatedOrder = await updateOrder(order.id, data)
    if (!updatedOrder) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }

    return NextResponse.json({ order: updatedOrder })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      )
    }
    
    if (error instanceof Error && (error.message === "Unauthorized" || error.message === "Forbidden")) {
      return NextResponse.json({ error: error.message }, { status: error.message === "Unauthorized" ? 401 : 403 })
    }

    console.error("Update order error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
