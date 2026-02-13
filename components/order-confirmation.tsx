"use client"

import { useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import { CheckCircle2, Package, Truck, ArrowRight, Mail, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { Order } from "@/lib/db/schema"
import { getProductImageUrl } from "@/lib/storage/image-utils"

interface OrderConfirmationProps {
  orderNumber: string
}

export function OrderConfirmation({ orderNumber }: OrderConfirmationProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [email, setEmail] = useState(searchParams.get("email") || "")
  const [needsEmailVerification, setNeedsEmailVerification] = useState(false)

  useEffect(() => {
    async function fetchOrder() {
      try {
        // Build URL with email if provided
        const url = email 
          ? `/api/orders/${orderNumber}?email=${encodeURIComponent(email)}`
          : `/api/orders/${orderNumber}`
        
        const response = await fetch(url)
        
        if (!response.ok) {
          const data = await response.json()
          
          // If email is required, show email form
          if (response.status === 400 && data.error?.includes("Email address required")) {
            setNeedsEmailVerification(true)
            setLoading(false)
            return
          }
          
          throw new Error(data.error || "Order not found")
        }
        
        const data = await response.json()
        setOrder(data.order)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load order")
      } finally {
        setLoading(false)
      }
    }

    fetchOrder()
  }, [orderNumber, email])

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (email.trim()) {
      router.push(`/orders/${orderNumber}?email=${encodeURIComponent(email.trim())}`)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent mx-auto mb-4" />
          <p className="text-muted-foreground">Loading order details...</p>
        </div>
      </div>
    )
  }

  // Show email verification form if needed
  if (needsEmailVerification) {
    return (
      <div className="max-w-md mx-auto">
        <div className="rounded-3xl bg-white p-8 shadow-[0_10px_30px_rgba(0,0,0,0.05)]">
          <h2 className="text-2xl font-semibold mb-2">Verify Your Email</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Please enter the email address associated with order <strong>{orderNumber}</strong> to view order details.
          </p>
          
          <form onSubmit={handleEmailSubmit} className="space-y-4">
            <div>
              <Label htmlFor="verifyEmail">Email Address *</Label>
              <div className="relative mt-1">
                <Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="verifyEmail"
                  type="email"
                  placeholder="Enter your email address"
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

            <Button type="submit" disabled={!email.trim()} className="w-full" size="lg">
              Verify & View Order
            </Button>
          </form>
        </div>
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="rounded-3xl bg-white p-12 text-center shadow-[0_10px_30px_rgba(0,0,0,0.05)]">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <p className="text-red-600 mb-4">{error || "Order not found"}</p>
        <div className="flex gap-3 justify-center">
          <Button asChild variant="outline">
            <Link href="/orders">Track Another Order</Link>
          </Button>
          <Button asChild>
            <Link href="/shop">Continue Shopping</Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Success Header */}
      <div className="rounded-3xl bg-white p-8 md:p-12 text-center shadow-[0_10px_30px_rgba(0,0,0,0.05)] mb-8">
        <div className="flex justify-center mb-4">
          <div className="rounded-full bg-emerald-100 p-4">
            <CheckCircle2 className="h-12 w-12 text-emerald-600" />
          </div>
        </div>
        <h1 className="text-3xl md:text-4xl font-bold mb-2">Order Confirmed!</h1>
        <p className="text-muted-foreground text-lg mb-4">
          Thank you for your order. We've received your order and will begin processing it shortly.
        </p>
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-full">
          <Package className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">Order #{order.orderNumber}</span>
        </div>
      </div>

      {/* Order Details */}
      <div className="grid gap-8 md:grid-cols-2">
        {/* Order Items */}
        <div className="rounded-3xl bg-white p-6 shadow-[0_10px_30px_rgba(0,0,0,0.05)]">
          <h2 className="text-xl font-semibold mb-4">Order Items</h2>
          <div className="space-y-4">
            {order.items.map((item, index) => (
              <div key={index} className="flex gap-4 pb-4 border-b last:border-0">
                <div className="relative h-20 w-20 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                  <img
                    src={getProductImageUrl(item.productImage, [])}
                    alt={item.productName}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium truncate">{item.productName}</h3>
                  <p className="text-sm text-muted-foreground">
                    Quantity: {item.quantity}
                  </p>
                  <p className="text-sm font-medium mt-1">
                    ${(item.price * item.quantity).toFixed(2)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Order Summary */}
        <div className="space-y-6">
          {/* Shipping Address */}
          <div className="rounded-3xl bg-white p-6 shadow-[0_10px_30px_rgba(0,0,0,0.05)]">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Truck className="h-5 w-5" />
              Shipping Address
            </h2>
            <div className="text-sm text-muted-foreground space-y-1">
              <p className="font-medium text-foreground">
                {typeof order.shippingAddress === 'object' && 'firstName' in order.shippingAddress
                  ? `${order.shippingAddress.firstName} ${order.shippingAddress.lastName}`
                  : ''}
              </p>
              <p>{order.shippingAddress.street}</p>
              <p>
                {order.shippingAddress.city}, {order.shippingAddress.state}{" "}
                {order.shippingAddress.zipCode}
              </p>
              <p>{order.shippingAddress.country}</p>
            </div>
          </div>

          {/* Order Summary */}
          <div className="rounded-3xl bg-white p-6 shadow-[0_10px_30px_rgba(0,0,0,0.05)]">
            <h2 className="text-xl font-semibold mb-4">Order Summary</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>${order.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Shipping</span>
                <span>Free</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tax</span>
                <span>${order.tax.toFixed(2)}</span>
              </div>
              <div className="h-px bg-gray-200 my-3" />
              <div className="flex justify-between text-lg font-semibold">
                <span>Total</span>
                <span>${order.total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Payment Status */}
          <div className="rounded-3xl bg-white p-6 shadow-[0_10px_30px_rgba(0,0,0,0.05)]">
            <h2 className="text-xl font-semibold mb-4">Payment Status</h2>
            <div className="flex items-center gap-2">
              <div
                className={`h-2 w-2 rounded-full ${
                  order.paymentStatus === "paid"
                    ? "bg-emerald-500"
                    : order.paymentStatus === "failed"
                    ? "bg-red-500"
                    : "bg-yellow-500"
                }`}
              />
              <span className="text-sm font-medium capitalize">
                {order.paymentStatus}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Payment method: {order.paymentMethod}
            </p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
        <Button asChild variant="outline" size="lg">
          <Link href="/orders">
            View All Orders
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
        <Button asChild size="lg">
          <Link href="/shop">
            Continue Shopping
          </Link>
        </Button>
      </div>
    </div>
  )
}
