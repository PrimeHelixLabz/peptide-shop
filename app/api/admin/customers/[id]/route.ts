import { NextRequest, NextResponse } from "next/server"
import { requireAdminMiddleware } from "@/lib/auth/middleware"
import { createAdminClient } from "@/lib/supabase/admin"

export const GET = requireAdminMiddleware(async (req, context) => {
  try {
    const { id } = await context.params
    const supabase = createAdminClient()

    // Fetch the profile
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, name, email, phone, address, role, avatar, age_verified, created_at, updated_at")
      .eq("id", id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 })
    }

    // Fetch all orders for this customer
    const { data: ordersData, error: ordersError } = await supabase
      .from("orders")
      .select("id, order_number, status, payment_status, payment_method, provider, total, subtotal, shipping, service_fee, items, shipping_address, billing_address, tracking_number, notes, created_at")
      .eq("user_id", id)
      .order("created_at", { ascending: false })

    if (ordersError) {
      console.error("Error fetching customer orders:", ordersError)
      return NextResponse.json({ error: "Failed to fetch orders" }, { status: 500 })
    }

    const orders = ordersData || []

    // Compute purchase summary from paid orders
    const paidOrders = orders.filter((o: any) => o.payment_status === "paid")
    const totalSpent = paidOrders.reduce(
      (sum: number, o: any) => sum + parseFloat(o.total || "0"),
      0
    )
    const totalItems = orders.reduce((sum: number, o: any) => {
      const items = Array.isArray(o.items) ? o.items : []
      return sum + items.reduce((s: number, i: any) => s + (i.quantity || 0), 0)
    }, 0)

    // Top products by quantity purchased
    const productMap = new Map<string, { name: string; quantity: number; image: string }>()
    for (const order of orders) {
      if (order.payment_status !== "paid") continue
      const items = Array.isArray(order.items) ? order.items : []
      for (const item of items) {
        const key = item.productId || item.productName
        if (!key) continue
        const existing = productMap.get(key) || {
          name: item.productName || "Unknown",
          quantity: 0,
          image: item.productImage || "",
        }
        existing.quantity += item.quantity || 0
        productMap.set(key, existing)
      }
    }
    const topProducts = Array.from(productMap.values())
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5)

    // Build activity timeline from orders + account creation
    const timeline: Array<{ type: string; date: string; label: string; detail?: string }> = []

    timeline.push({
      type: "account",
      date: profile.created_at,
      label: "Account created",
    })

    for (const order of orders) {
      timeline.push({
        type: "order",
        date: order.created_at,
        label: `Order ${order.order_number || order.id.slice(0, 8)} placed`,
        detail: `$${parseFloat(order.total || "0").toFixed(2)} — ${order.payment_status}`,
      })
    }

    // Sort timeline newest first
    timeline.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    // Format orders for the response
    const formattedOrders = orders.map((order: any) => {
      const items = Array.isArray(order.items) ? order.items : []
      const itemsCount = items.length
      const totalQty = items.reduce((s: number, i: any) => s + (i.quantity || 0), 0)

      return {
        id: order.id,
        orderNumber: order.order_number,
        status: order.status,
        paymentStatus: order.payment_status,
        paymentMethod: order.payment_method,
        provider: order.provider,
        total: parseFloat(order.total || "0"),
        subtotal: parseFloat(order.subtotal || "0"),
        shipping: parseFloat(order.shipping || "0"),
        serviceFee: parseFloat(order.service_fee || "0"),
        items,
        itemsCount,
        totalQuantity: totalQty,
        trackingNumber: order.tracking_number,
        notes: order.notes,
        createdAt: order.created_at,
      }
    })

    // Pending orders count
    const pendingOrders = orders.filter(
      (o: any) => o.status === "pending" || o.status === "processing"
    ).length

    // Days since last purchase
    const lastOrderDate = orders.length > 0 ? orders[0].created_at : null
    const daysSinceLastPurchase = lastOrderDate
      ? Math.floor(
          (Date.now() - new Date(lastOrderDate).getTime()) / (1000 * 60 * 60 * 24)
        )
      : null

    return NextResponse.json({
      customer: {
        id: profile.id,
        name: profile.name || "Unknown",
        email: profile.email || "",
        phone: profile.phone || null,
        address: profile.address || null,
        role: profile.role,
        avatar: profile.avatar || null,
        ageVerified: profile.age_verified ?? null,
        createdAt: profile.created_at,
        updatedAt: profile.updated_at,
      },
      purchaseSummary: {
        totalOrders: orders.length,
        paidOrders: paidOrders.length,
        totalSpent,
        totalItems,
        firstOrderDate: orders.length > 0 ? orders[orders.length - 1].created_at : null,
        lastOrderDate,
        avgOrderValue: paidOrders.length > 0 ? totalSpent / paidOrders.length : 0,
        pendingOrders,
        daysSinceLastPurchase,
        isRepeatCustomer: paidOrders.length > 1,
      },
      topProducts,
      orders: formattedOrders,
      timeline,
    })
  } catch (error) {
    console.error("Get customer detail error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
})
