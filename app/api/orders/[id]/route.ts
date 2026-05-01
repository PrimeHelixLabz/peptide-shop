import { NextRequest, NextResponse } from "next/server"
import { optionalAuthMiddleware } from "@/lib/auth/middleware"
import { getOrderById, getOrderByNumber, getOrderByIdAsAdmin, getOrderByNumberAsAdmin, updateOrder, deleteOrderAsAdmin } from "@/lib/db/supabase"
import { z } from "zod"

const updateOrderSchema = z.object({
  status: z.enum(["pending", "processing", "shipped", "delivered", "cancelled"]).optional(),
  paymentStatus: z.enum(["pending", "paid", "failed", "refunded"]).optional(),
  paymentMethod: z.enum(["stripe", "link_money", "cash"]).optional(),
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
    
    // If user is authenticated, check permissions first
    if (user) {
      const userId = user.id
      const isAdmin = user.role === "admin"

      // Admins can see all orders (use admin client to bypass RLS)
      if (isAdmin) {
        const order = isOrderNumber(id)
          ? await getOrderByNumberAsAdmin(id)
          : await getOrderByIdAsAdmin(id)
        if (!order) {
          return NextResponse.json({ error: "Order not found" }, { status: 404 })
        }

        // Resolve customer name for admin view
        let customerName: string | undefined
        if (order.userId) {
          const { createAdminClient } = await import("@/lib/supabase/admin")
          const adminSupabase = createAdminClient()
          const { data: profile } = await adminSupabase
            .from("profiles")
            .select("name")
            .eq("id", order.userId)
            .single()
          if (profile?.name) {
            customerName = profile.name
          }
        }
        if (!customerName) {
          const addr = order.shippingAddress as any
          if (addr?.firstName && addr?.lastName) {
            customerName = `${addr.firstName} ${addr.lastName}`
          } else if (addr?.firstName) {
            customerName = addr.firstName
          }
        }

        return NextResponse.json({ order, customerName })
      }

      // Authenticated users can see their own orders (RLS handles this)
      const order = isOrderNumber(id)
        ? await getOrderByNumber(id)
        : await getOrderById(id)
      if (order && order.userId === userId) {
        return NextResponse.json({ order })
      }
    }

    // Guest order flow: require email verification
    // Use admin client since RLS no longer allows public access to guest orders
    if (!email) {
      return NextResponse.json({
        error: "Email address required to view guest orders"
      }, { status: 400 })
    }

    const order = isOrderNumber(id)
      ? await getOrderByNumberAsAdmin(id)
      : await getOrderByIdAsAdmin(id)

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }

    // Only allow access to guest orders via email verification
    if (order.userId !== null) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Verify email matches the order
    const orderEmail = (order.email?.toLowerCase() ||
      (order.shippingAddress as any)?.email?.toLowerCase() || "").trim()
    const providedEmail = email.toLowerCase().trim()

    if (orderEmail !== providedEmail) {
      return NextResponse.json({
        error: "Email address does not match this order"
      }, { status: 403 })
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

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { requireAdmin } = await import("@/lib/auth/supabase-auth")
    await requireAdmin()

    const { id } = await params

    const order = isOrderNumber(id)
      ? await getOrderByNumberAsAdmin(id)
      : await getOrderByIdAsAdmin(id)

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }

    const deleted = await deleteOrderAsAdmin(order.id)
    if (!deleted) {
      return NextResponse.json({ error: "Failed to delete order" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof Error && (error.message === "Unauthorized" || error.message === "Forbidden")) {
      return NextResponse.json({ error: error.message }, { status: error.message === "Unauthorized" ? 401 : 403 })
    }

    console.error("Delete order error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
