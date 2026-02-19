"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { ArrowLeft, ChevronDown, Package, CheckCircle2, Loader2 } from "lucide-react"
import type { AdminOrder } from "./admin-orders-table"
import type { Order } from "@/lib/db/schema"
import { getProductImageUrl } from "@/lib/storage/image-utils"
import { format } from "date-fns"

/* ------------------------------------------------------------------ */
/*  Badge styles (same as orders table)                                */
/* ------------------------------------------------------------------ */

const paymentStyles: Record<AdminOrder["paymentStatus"], string> = {
  Paid: "bg-primary text-white",
  Pending: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800",
  Refunded: "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300",
}

const shippingStyles: Record<AdminOrder["shippingStatus"], string> = {
  Shipped: "bg-primary text-white",
  Processing: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800",
  Delivered: "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300",
}

const shippingOptions: AdminOrder["shippingStatus"][] = [
  "Processing",
  "Shipped",
  "Delivered",
]

// Map database status to AdminOrder status
const mapPaymentStatus = (status: string): AdminOrder["paymentStatus"] => {
  if (status === "paid") return "Paid"
  if (status === "refunded") return "Refunded"
  return "Pending"
}

const mapShippingStatus = (status: string): AdminOrder["shippingStatus"] => {
  if (status === "shipped") return "Shipped"
  if (status === "delivered") return "Delivered"
  return "Processing"
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function AdminOrderDetail({ orderId }: { orderId: string }) {
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [shippingStatus, setShippingStatus] = useState<AdminOrder["shippingStatus"]>("Processing")
  const [fulfilled, setFulfilled] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    async function fetchOrder() {
      try {
        // Try to fetch by order ID (UUID) or order number
        const response = await fetch(`/api/orders/${orderId}`)
        if (!response.ok) {
          throw new Error("Order not found")
        }
        const data = await response.json()
        setOrder(data.order)
        setShippingStatus(mapShippingStatus(data.order.status))
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load order")
      } finally {
        setLoading(false)
      }
    }

    fetchOrder()
  }, [orderId])

  const handleStatusUpdate = async () => {
    setSaving(true)
    try {
      const statusMap: Record<string, string> = {
        "Processing": "processing",
        "Shipped": "shipped",
        "Delivered": "delivered",
      }

      const response = await fetch(`/api/orders/${orderId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: statusMap[shippingStatus],
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to update order")
      }

      const data = await response.json()
      setOrder(data.order)
      setShippingStatus(mapShippingStatus(data.order.status))

      if (shippingStatus === "Delivered") {
        setFulfilled(true)
      }
    } catch (err) {
      console.error("Error updating order:", err)
      alert("Failed to update order status")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <Link
            href="/admin/orders"
            className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Orders
          </Link>
        </div>
        <div className="flex flex-col items-center justify-center gap-3 rounded-3xl bg-white dark:bg-gray-900 shadow-[0_10px_30px_rgba(0,0,0,0.05)] dark:shadow-[0_10px_30px_rgba(0,0,0,0.3)] px-6 py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Loading order details...</p>
        </div>
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <Link
            href="/admin/orders"
            className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Orders
          </Link>
        </div>
        <div className="flex flex-col items-center justify-center gap-3 rounded-3xl bg-white dark:bg-gray-900 shadow-[0_10px_30px_rgba(0,0,0,0.05)] dark:shadow-[0_10px_30px_rgba(0,0,0,0.3)] px-6 py-20">
          <Package className="h-10 w-10 text-muted-foreground/60" />
          <p className="text-sm text-muted-foreground">{error || "Order not found"}</p>
          <Link
            href="/admin/orders"
            className="mt-2 text-sm font-medium text-foreground underline underline-offset-4 hover:text-muted-foreground transition-colors"
          >
            Return to orders
          </Link>
        </div>
      </div>
    )
  }

  // Format shipping address
  const shippingAddr = order.shippingAddress as any
  const formattedAddress = shippingAddr
    ? `${shippingAddr.street}, ${shippingAddr.city}, ${shippingAddr.state} ${shippingAddr.zipCode}, ${shippingAddr.country}`
    : "No address provided"

  // Get customer name
  const customerName = shippingAddr?.firstName && shippingAddr?.lastName
    ? `${shippingAddr.firstName} ${shippingAddr.lastName}`
    : order.email || "Guest Customer"

  const subtotal = order.subtotal
  const tax = order.tax
  const shipping = order.shipping

  return (
    <div className="flex flex-col gap-6">
      {/* Back link */}
      <div className="flex items-center justify-between">
        <Link
          href="/admin/orders"
          className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Orders
        </Link>
        <span className="text-sm text-muted-foreground">
          {format(new Date(order.createdAt), "MMM d, yyyy")}
        </span>
      </div>

      {/* Two-column grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* ====== Left column – Items ====== */}
        <div className="flex flex-col gap-6 lg:col-span-2">
          {/* Order items card */}
          <div className="rounded-3xl bg-white dark:bg-gray-900 shadow-[0_10px_30px_rgba(0,0,0,0.05)] dark:shadow-[0_10px_30px_rgba(0,0,0,0.3)] overflow-hidden">
            <div className="border-b border-border/50 px-6 py-5">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground">
                Items
              </h2>
            </div>

            <div className="divide-y divide-border/50">
              {order.items.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center gap-4 px-6 py-4"
                >
                  {/* Product image */}
                  <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-gray-100 dark:bg-gray-800">
                    <img
                      src={getProductImageUrl(item.productImage, [])}
                      alt={item.productName}
                      className="h-full w-full object-cover"
                    />
                  </div>

                  {/* Product info */}
                  <div className="flex flex-1 flex-col gap-0.5">
                    <p className="text-sm font-medium text-foreground">
                      {item.productName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Qty: {item.quantity}
                    </p>
                  </div>

                  {/* Price */}
                  <p className="text-sm font-medium text-foreground">
                    ${(item.price * item.quantity).toFixed(2)}
                  </p>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="border-t border-border/50 px-6 py-5">
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Subtotal</span>
                  <span className="text-sm font-semibold text-foreground">${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Shipping</span>
                  <span className="text-sm font-semibold text-foreground">${shipping.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Tax</span>
                  <span className="text-sm font-semibold text-foreground">${tax.toFixed(2)}</span>
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-border/50 pt-3">
                  <span className="text-base font-semibold uppercase tracking-wider text-foreground">
                    Total
                  </span>
                  <span className="text-xl font-bold text-foreground">
                    ${order.total.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ====== Right column – Summary & Actions ====== */}
        <div className="flex flex-col gap-6">
          {/* Order summary card */}
          <div className="rounded-3xl bg-white dark:bg-gray-900 shadow-[0_10px_30px_rgba(0,0,0,0.05)] dark:shadow-[0_10px_30px_rgba(0,0,0,0.3)] overflow-hidden">
            <div className="border-b border-border/50 px-6 py-5">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground">
                Order Summary
              </h2>
            </div>

            <div className="flex flex-col gap-4 p-6">
              {/* Order ID */}
              <div className="flex flex-col gap-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Order Number
                </span>
                <span className="text-sm font-semibold text-foreground">
                  {order.orderNumber}
                </span>
              </div>

              {/* Customer */}
              <div className="flex flex-col gap-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Customer
                </span>
                <span className="text-sm font-semibold text-foreground">
                  {customerName}
                </span>
                <span className="text-xs text-muted-foreground">
                  {order.email || shippingAddr?.email || "No email"}
                </span>
              </div>

              {/* Address */}
              <div className="flex flex-col gap-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Shipping Address
                </span>
                <span className="text-sm text-foreground">
                  {formattedAddress}
                </span>
              </div>

              {/* Payment status */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Payment
                </span>
                <div>
                  <span
                    className={`inline-block rounded-xl px-3 py-1 text-xs font-semibold uppercase tracking-wider ${paymentStyles[mapPaymentStatus(order.paymentStatus)]}`}
                  >
                    {mapPaymentStatus(order.paymentStatus)}
                  </span>
                </div>
              </div>

              {/* Shipping status (editable) */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Shipping Status
                </span>
                <div className="relative">
                  <select
                    value={shippingStatus}
                    onChange={(e) =>
                      setShippingStatus(
                        e.target.value as AdminOrder["shippingStatus"]
                      )
                    }
                    className="h-12 w-full appearance-none rounded-xl bg-white dark:bg-gray-900 border-0 shadow-[0_10px_30px_rgba(0,0,0,0.05)] dark:shadow-[0_10px_30px_rgba(0,0,0,0.3)] pl-4 pr-10 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20"
                    aria-label="Update shipping status"
                  >
                    {shippingOptions.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                </div>
              </div>
            </div>
          </div>

          {/* Actions card */}
          <div className="rounded-3xl bg-white dark:bg-gray-900 shadow-[0_10px_30px_rgba(0,0,0,0.05)] dark:shadow-[0_10px_30px_rgba(0,0,0,0.3)] overflow-hidden">
            <div className="flex flex-col gap-3 p-6">
              <button
                type="button"
                onClick={handleStatusUpdate}
                disabled={saving || fulfilled}
                className="h-12 w-full rounded-2xl bg-primary text-sm font-semibold text-white shadow-[0_10px_30px_rgba(0,0,0,0.1)] transition-all duration-200 hover:shadow-[0_20px_40px_rgba(0,0,0,0.15)] hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : fulfilled ? (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    Fulfilled
                  </>
                ) : (
                  "Update Status"
                )}
              </button>
              <Link
                href="/admin/orders"
                className="flex h-12 w-full items-center justify-center rounded-2xl border border-gray-300 dark:border-gray-700 text-sm font-semibold text-muted-foreground transition-all duration-200 hover:border-foreground hover:text-foreground hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                Back to Orders
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}