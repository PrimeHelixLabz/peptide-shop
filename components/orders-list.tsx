"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Search, Mail, AlertCircle, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { format } from "date-fns"

const RECENT_ORDERS_KEY = "elysian_recent_orders"
const LAST_EMAIL_KEY = "elysian_last_order_email"

interface RecentOrder {
  orderNumber: string
  email: string
  createdAt: string
  total: number
}

export function OrdersList() {
  const router = useRouter()
  const [orderNumber, setOrderNumber] = useState("")
  const [email, setEmail] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([])

  // Load recent orders and last email from localStorage
  useEffect(() => {
    const storedOrders = localStorage.getItem(RECENT_ORDERS_KEY)
    const lastEmail = localStorage.getItem(LAST_EMAIL_KEY)
    
    if (storedOrders) {
      try {
        setRecentOrders(JSON.parse(storedOrders))
      } catch (e) {
        console.error("Error parsing recent orders:", e)
      }
    }
    
    if (lastEmail) {
      setEmail(lastEmail)
    }
  }, [])

  const handleOrderSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    
    if (!orderNumber.trim() || !email.trim()) {
      setError("Please enter both order number and email address")
      return
    }

    setLoading(true)
    
    try {
      // Verify order with email
      const response = await fetch(`/api/orders/${orderNumber.trim()}?email=${encodeURIComponent(email.trim())}`)
      
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Order not found or email doesn't match")
      }

      // If verification successful, redirect to order page with email in query
      router.push(`/orders/${orderNumber.trim()}?email=${encodeURIComponent(email.trim())}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to verify order. Please check your order number and email.")
      setLoading(false)
    }
  }

  const handleQuickLookup = (order: RecentOrder) => {
    setOrderNumber(order.orderNumber)
    setEmail(order.email)
    router.push(`/orders/${order.orderNumber}?email=${encodeURIComponent(order.email)}`)
  }

  return (
    <div className="space-y-6">
      {/* Order Lookup Section */}
      <div className="rounded-3xl bg-white p-6 shadow-[0_10px_30px_rgba(0,0,0,0.05)] lg:p-8">
        <h2 className="text-2xl font-semibold mb-2">Track Your Order</h2>
        <p className="text-sm text-muted-foreground mb-6">
          Enter your order number and email address to view order details and tracking information.
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

          <div>
            <Label htmlFor="email">Email Address *</Label>
            <div className="relative mt-1">
              <Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="Enter the email address used for this order"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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
            disabled={!orderNumber.trim() || !email.trim() || loading}
            className="w-full h-12"
            size="lg"
          >
            {loading ? "Verifying..." : "Track Order"}
          </Button>
        </form>
      </div>

      {/* Recent Orders Section */}
      {recentOrders.length > 0 && (
        <div className="rounded-3xl bg-white p-6 shadow-[0_10px_30px_rgba(0,0,0,0.05)] lg:p-8">
          <h3 className="text-lg font-semibold mb-4">Recent Orders</h3>
          <div className="space-y-3">
            {recentOrders.map((order) => (
              <button
                key={order.orderNumber}
                onClick={() => handleQuickLookup(order)}
                className="w-full rounded-xl border border-gray-200 p-4 text-left transition-all hover:border-emerald-500 hover:bg-emerald-50/50"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">Order #{order.orderNumber}</p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(order.createdAt), "MMM d, yyyy")} • ${order.total.toFixed(2)}
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
