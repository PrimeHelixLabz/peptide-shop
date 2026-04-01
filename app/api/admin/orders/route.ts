import { NextRequest, NextResponse } from "next/server"
import { requireAdminMiddleware } from "@/lib/auth/middleware"
import { createAdminClient } from "@/lib/supabase/admin"

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
      const paymentStatusMap: Record<string, "Paid" | "Pending" | "Refunded"> = {
        paid: "Paid",
        pending: "Pending",
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
