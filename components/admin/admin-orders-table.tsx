"use client"

import { useState, useMemo, useEffect } from "react"
import Link from "next/link"
import { Search, Eye, ChevronDown } from "lucide-react"

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface AdminOrder {
  id: string
  customer: string
  email: string
  items: number
  total: string
  date: string
  paymentStatus: "Paid" | "Pending" | "Refunded"
  shippingStatus: "Processing" | "Shipped" | "Delivered"
  orderId?: string // Original order ID for detail page
}

/* ------------------------------------------------------------------ */
/*  Badge styles                                                       */
/* ------------------------------------------------------------------ */

const paymentStyles: Record<AdminOrder["paymentStatus"], string> = {
  Paid: "bg-gradient-to-r from-emerald-500 to-green-600 text-white",
  Pending: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800",
  Refunded: "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300",
}

const shippingStyles: Record<AdminOrder["shippingStatus"], string> = {
  Shipped: "bg-gradient-to-r from-emerald-500 to-green-600 text-white",
  Processing: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800",
  Delivered: "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300",
}

/* ------------------------------------------------------------------ */
/*  Filter options                                                     */
/* ------------------------------------------------------------------ */

type PaymentFilter = "all" | "Paid" | "Pending" | "Refunded"

const filterOptions: { value: PaymentFilter; label: string }[] = [
  { value: "all", label: "All Orders" },
  { value: "Paid", label: "Paid" },
  { value: "Pending", label: "Pending" },
  { value: "Refunded", label: "Refunded" },
]

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function AdminOrdersTable() {
  const [query, setQuery] = useState("")
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>("all")
  const [orders, setOrders] = useState<AdminOrder[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchOrders() {
      try {
        const response = await fetch("/api/admin/orders")
        if (response.ok) {
          const data = await response.json()
          setOrders(data.orders || [])
        }
      } catch (error) {
        console.error("Error fetching orders:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchOrders()
  }, [])

  const filtered = useMemo(() => {
    let result = orders

    if (paymentFilter !== "all") {
      result = result.filter((o) => o.paymentStatus === paymentFilter)
    }

    if (query.trim()) {
      const q = query.toLowerCase()
      result = result.filter(
        (o) =>
          o.id.toLowerCase().includes(q) ||
          o.customer.toLowerCase().includes(q) ||
          o.email.toLowerCase().includes(q)
      )
    }

    return result
  }, [query, paymentFilter])

  return (
    <div className="flex flex-col gap-6">
      {/* Toolbar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Search */}
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search orders..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-12 w-full rounded-xl bg-white dark:bg-gray-900 border-0 shadow-[0_10px_30px_rgba(0,0,0,0.05)] dark:shadow-[0_10px_30px_rgba(0,0,0,0.3)] pl-11 pr-4 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-emerald-500/20"
            aria-label="Search orders"
          />
        </div>

        {/* Filter + count */}
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">
            {filtered.length} of {orders.length} orders
          </span>
          <div className="relative">
            <select
              value={paymentFilter}
              onChange={(e) =>
                setPaymentFilter(e.target.value as PaymentFilter)
              }
              className="h-12 appearance-none rounded-xl bg-white dark:bg-gray-900 border-0 shadow-[0_10px_30px_rgba(0,0,0,0.05)] dark:shadow-[0_10px_30px_rgba(0,0,0,0.3)] pl-4 pr-10 text-sm text-foreground outline-none focus:ring-2 focus:ring-emerald-500/20"
              aria-label="Filter by payment status"
            >
              {filterOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          </div>
        </div>
      </div>

      {/* Table card */}
      <div className="rounded-3xl bg-white dark:bg-gray-900 shadow-[0_10px_30px_rgba(0,0,0,0.05)] dark:shadow-[0_10px_30px_rgba(0,0,0,0.3)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-border/50">
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Order
                </th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Customer
                </th>
                <th className="hidden px-6 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground md:table-cell">
                  Date
                </th>
                <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Total
                </th>
                <th className="hidden px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground sm:table-cell">
                  Payment
                </th>
                <th className="hidden px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground lg:table-cell">
                  Shipping
                </th>
                <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((order) => (
                <tr
                  key={order.id}
                  className="border-b border-border/50 transition-colors last:border-0 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                >
                  {/* Order ID */}
                  <td className="px-6 py-4 text-sm font-medium text-foreground">
                    {order.id}
                  </td>

                  {/* Customer */}
                  <td className="px-6 py-4">
                    <p className="text-sm font-medium text-foreground">
                      {order.customer}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {order.email}
                    </p>
                  </td>

                  {/* Date */}
                  <td className="hidden px-6 py-4 text-sm text-muted-foreground md:table-cell">
                    {order.date}
                  </td>

                  {/* Total */}
                  <td className="px-6 py-4 text-right text-sm font-semibold text-foreground">
                    {order.total}
                  </td>

                  {/* Payment Status */}
                  <td className="hidden px-6 py-4 text-right sm:table-cell">
                    <span
                      className={`inline-block rounded-xl px-3 py-1 text-xs font-semibold uppercase tracking-wider ${paymentStyles[order.paymentStatus]}`}
                    >
                      {order.paymentStatus}
                    </span>
                  </td>

                  {/* Shipping Status */}
                  <td className="hidden px-6 py-4 text-right lg:table-cell">
                    <span
                      className={`inline-block rounded-xl px-3 py-1 text-xs font-semibold uppercase tracking-wider ${shippingStyles[order.shippingStatus]}`}
                    >
                      {order.shippingStatus}
                    </span>
                  </td>

                  {/* View */}
                  <td className="px-6 py-4 text-right">
                    <Link
                      href={`/admin/orders/${order.orderId || order.id}`}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-foreground"
                      aria-label={`View order ${order.id}`}
                      title={`View order ${order.id}`}
                    >
                      <Eye className="h-4 w-4" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Loading state */}
        {loading && (
          <div className="flex flex-col items-center justify-center gap-3 px-6 py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-muted-foreground" />
            <p className="text-sm text-muted-foreground">Loading orders...</p>
          </div>
        )}

        {/* Empty state */}
        {!loading && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-3 px-6 py-16">
            <Search className="h-8 w-8 text-muted-foreground/60" />
            <p className="text-sm text-muted-foreground">
              {query.trim()
                ? <>No orders match &ldquo;{query}&rdquo;</>
                : orders.length === 0
                ? "No orders found"
                : "No orders found for this filter"}
            </p>
            {query.trim() || paymentFilter !== "all" ? (
              <button
                onClick={() => {
                  setQuery("")
                  setPaymentFilter("all")
                }}
                className="text-sm font-medium text-foreground underline underline-offset-4 hover:text-muted-foreground transition-colors"
              >
                Clear filters
              </button>
            ) : null}
          </div>
        )}
      </div>
    </div>
  )
}
