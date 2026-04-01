"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Search, AlertCircle, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { format } from "date-fns"
import { useAuth } from "@/lib/auth/auth-context"
import type { Order } from "@/lib/db/schema"
import { formatPaymentMethod } from "@/lib/format-payment-method"

interface RecentOrder {
  orderNumber: string
  createdAt: string
  total: number
  paymentMethod: string
}

export function OrdersList() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [orderNumber, setOrderNumber] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([])
  const [loadingOrders, setLoadingOrders] = useState(true)

  // Require authentication and load orders from database for authenticated users
  useEffect(() => {
    if (authLoading) return

    // If not authenticated, redirect to sign in
    if (!user) {
      router.push("/signin")
      return
    }

    // Fetch user's orders from API
    setLoadingOrders(true)
    fetch("/api/orders")
      .then((res) => {
        if (res.ok) {
          return res.json()
        }
        throw new Error("Failed to fetch orders")
      })
      .then((data) => {
        const orders: Order[] = data.orders || []
        // Convert to RecentOrder format
        const recent: RecentOrder[] = orders
          .slice(0, 10) // Show last 10 orders
          .map((order) => ({
            orderNumber: order.orderNumber,
            createdAt: order.createdAt,
            total: order.total,
            paymentMethod: order.paymentMethod || "stripe",
          }))
        setRecentOrders(recent)
      })
      .catch((err) => {
        console.error("Error loading orders:", err)
      })
      .finally(() => {
        setLoadingOrders(false)
      })
  }, [user, authLoading, router])

  const handleOrderSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!orderNumber.trim()) {
      setError("Please enter an order number")
      return
    }

    // Require authentication to view orders
    if (!user) {
      router.push("/signin")
      return
    }

    setLoading(true)
    router.push(`/orders/${orderNumber.trim()}`)
  }

  const handleQuickLookup = (order: RecentOrder) => {
    setOrderNumber(order.orderNumber)
    // Authenticated users can only access their own orders via the API
    router.push(`/orders/${order.orderNumber}`)
  }

  return (
    <div className="space-y-6">
      {/* Order Lookup Section */}
      <div className="rounded-3xl bg-white p-6 shadow-[0_10px_30px_rgba(0,0,0,0.05)] lg:p-8">
        <h2 className="text-2xl font-semibold mb-2">Track Your Order</h2>
        <p className="text-sm text-muted-foreground mb-6">
          Enter your order number to view order details and tracking information.
        </p>
        
        <form onSubmit={handleOrderSearch} className="space-y-4">
          <div>
            <Label htmlFor="orderNumber">Order Number *</Label>
            <div className="relative mt-1">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="orderNumber"
                type="text"
                placeholder="Enter order number (e.g., ORD-123456-ABC)"
                value={orderNumber}
                onChange={(e) => setOrderNumber(e.target.value)}
                className="pl-11"
                required
              />
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-red-50 p-4 text-sm text-red-600">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <Button 
            type="submit" 
            disabled={!orderNumber.trim() || loading}
            className="w-full h-12"
            size="lg"
          >
            {loading ? "Verifying..." : "Track Order"}
          </Button>
        </form>
      </div>

      {/* Recent Orders Section */}
      {loadingOrders ? (
        <div className="rounded-3xl bg-white p-6 shadow-[0_10px_30px_rgba(0,0,0,0.05)] lg:p-8">
          <div className="flex items-center justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        </div>
      ) : recentOrders.length > 0 && (
        <div className="rounded-3xl bg-white p-6 shadow-[0_10px_30px_rgba(0,0,0,0.05)] lg:p-8">
          <h3 className="text-lg font-semibold mb-4">Recent Orders</h3>
          <div className="space-y-3">
            {recentOrders.map((order) => (
              <button
                key={order.orderNumber}
                onClick={() => handleQuickLookup(order)}
                className="w-full rounded-xl border border-gray-200 p-4 text-left transition-all hover:border-primary hover:bg-primary/5"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">Order #{order.orderNumber}</p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(order.createdAt), "MMM d, yyyy")} &bull; ${order.total.toFixed(2)} &bull; {formatPaymentMethod(order.paymentMethod)}
                    </p>
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground" />
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
