import { NextRequest, NextResponse } from "next/server"
import { requireAdminMiddleware } from "@/lib/auth/middleware"
import { createAdminClient } from "@/lib/supabase/admin"

export const GET = requireAdminMiddleware(async (req) => {
  try {
    const supabase = createAdminClient()

    // Fetch all profiles (registered customers)
    const { data: profilesData, error: profilesError } = await supabase
      .from("profiles")
      .select("id, name, email, phone, address, role, avatar, age_verified, created_at")
      .order("created_at", { ascending: false })

    if (profilesError) {
      console.error("Error fetching profiles:", profilesError)
      return NextResponse.json({ error: "Failed to fetch profiles" }, { status: 500 })
    }

    // Fetch all orders for aggregate computation
    const { data: ordersData, error: ordersError } = await supabase
      .from("orders")
      .select("id, user_id, email, status, payment_status, total, items, created_at")
      .order("created_at", { ascending: false })

    if (ordersError) {
      console.error("Error fetching orders:", ordersError)
      return NextResponse.json({ error: "Failed to fetch orders" }, { status: 500 })
    }

    const orders = ordersData || []

    // Build order aggregates per user_id
    const userOrderMap = new Map<
      string,
      {
        totalOrders: number
        paidOrders: number
        totalSpent: number
        totalItems: number
        firstOrderDate: string | null
        lastOrderDate: string | null
      }
    >()

    for (const order of orders) {
      if (!order.user_id) continue

      const existing = userOrderMap.get(order.user_id) || {
        totalOrders: 0,
        paidOrders: 0,
        totalSpent: 0,
        totalItems: 0,
        firstOrderDate: null,
        lastOrderDate: null,
      }

      existing.totalOrders += 1

      const isPaid = order.payment_status === "paid"
      if (isPaid) {
        existing.paidOrders += 1
        existing.totalSpent += parseFloat(order.total || "0")
      }

      const itemsArr = Array.isArray(order.items) ? order.items : []
      existing.totalItems += itemsArr.reduce(
        (sum: number, item: any) => sum + (item.quantity || 0),
        0
      )

      const orderDate = order.created_at
      if (!existing.firstOrderDate || orderDate < existing.firstOrderDate) {
        existing.firstOrderDate = orderDate
      }
      if (!existing.lastOrderDate || orderDate > existing.lastOrderDate) {
        existing.lastOrderDate = orderDate
      }

      userOrderMap.set(order.user_id, existing)
    }

    // Build customer list from profiles
    const customers = (profilesData || []).map((profile: any) => {
      const agg = userOrderMap.get(profile.id) || {
        totalOrders: 0,
        paidOrders: 0,
        totalSpent: 0,
        totalItems: 0,
        firstOrderDate: null,
        lastOrderDate: null,
      }

      return {
        id: profile.id,
        name: profile.name || "Unknown",
        email: profile.email || "",
        phone: profile.phone || null,
        role: profile.role || "user",
        avatar: profile.avatar || null,
        ageVerified: profile.age_verified ?? null,
        createdAt: profile.created_at,
        totalOrders: agg.totalOrders,
        paidOrders: agg.paidOrders,
        totalSpent: agg.totalSpent,
        totalItems: agg.totalItems,
        firstOrderDate: agg.firstOrderDate,
        lastOrderDate: agg.lastOrderDate,
      }
    })

    // Compute summary KPIs
    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    const totalCustomers = customers.length
    const customersWithOrders = customers.filter((c: any) => c.totalOrders > 0)
    const activeCustomers = customers.filter(
      (c: any) => c.lastOrderDate && new Date(c.lastOrderDate) >= thirtyDaysAgo
    ).length
    const newCustomers = customers.filter(
      (c: any) => new Date(c.createdAt) >= thirtyDaysAgo
    ).length
    const repeatCustomers = customers.filter((c: any) => c.paidOrders > 1).length
    const totalRevenue = customersWithOrders.reduce(
      (sum: number, c: any) => sum + c.totalSpent,
      0
    )
    const totalPaidOrders = customersWithOrders.reduce(
      (sum: number, c: any) => sum + c.paidOrders,
      0
    )
    const avgOrderValue = totalPaidOrders > 0 ? totalRevenue / totalPaidOrders : 0
    const avgOrdersPerCustomer =
      customersWithOrders.length > 0
        ? totalPaidOrders / customersWithOrders.length
        : 0

    return NextResponse.json({
      customers,
      summary: {
        totalCustomers,
        activeCustomers,
        newCustomers,
        repeatCustomers,
        totalRevenue,
        avgOrderValue,
        avgOrdersPerCustomer,
      },
    })
  } catch (error) {
    console.error("Get customers error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
})
