"use client"

import { useState, useMemo, useEffect } from "react"
import Link from "next/link"
import { Search, Eye, Plus } from "lucide-react"
import { Pagination } from "./pagination"
import { FormInput } from "@/components/common/form-input"
import { FormSelect } from "@/components/common/form-select"
import { StatusBadge, type StatusVariant } from "@/components/common/status-badge"
import { useScrollRestoration } from "@/hooks/useScrollRestoration"
import { usePersistentTableState } from "@/hooks/usePersistentTableState"
import { formatPaymentMethodShort } from "@/lib/format-payment-method"

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
  paymentMethod?: string // "stripe" | "link_money"
  orderId?: string // Original order ID for detail page
}

/* ------------------------------------------------------------------ */
/*  Status mapping                                                      */
/* ------------------------------------------------------------------ */

const paymentStatusMap: Record<AdminOrder["paymentStatus"], StatusVariant> = {
  Paid: "success",
  Pending: "warning",
  Refunded: "neutral",
}

const shippingStatusMap: Record<AdminOrder["shippingStatus"], StatusVariant> = {
  Shipped: "success",
  Processing: "warning",
  Delivered: "neutral",
}

/* ------------------------------------------------------------------ */
/*  Filter options                                                     */
/* ------------------------------------------------------------------ */

type PaymentFilter = "all" | "Paid" | "Pending" | "Refunded"
type ShippingFilter = "all" | "Processing" | "Shipped" | "Delivered"

const paymentFilterOptions: { value: PaymentFilter; label: string }[] = [
  { value: "all", label: "All Payments" },
  { value: "Paid", label: "Paid" },
  { value: "Pending", label: "Pending" },
  { value: "Refunded", label: "Refunded" },
]

const shippingFilterOptions: { value: ShippingFilter; label: string }[] = [
  { value: "all", label: "All Shipping" },
  { value: "Processing", label: "Processing" },
  { value: "Shipped", label: "Shipped" },
  { value: "Delivered", label: "Delivered" },
]

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function AdminOrdersTable() {
  // Persist scroll position for this admin page
  useScrollRestoration("admin-orders-scroll")

  const [tableState, setTableState] = usePersistentTableState("admin-orders-table", {
    query: "",
    paymentFilter: "all" as PaymentFilter,
    shippingFilter: "all" as ShippingFilter,
    currentPage: 1,
    itemsPerPage: 20,
  })

  const { query, paymentFilter, shippingFilter, currentPage, itemsPerPage } = tableState

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

    if (shippingFilter !== "all") {
      result = result.filter((o) => o.shippingStatus === shippingFilter)
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
  }, [orders, query, paymentFilter, shippingFilter])

  // Reset to page 1 when search or filter changes
  useEffect(() => {
    setTableState((prev) => ({ ...prev, currentPage: 1 }))
  }, [query, paymentFilter, shippingFilter, setTableState])

  // Paginate filtered results
  const paginated = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    const end = start + itemsPerPage
    return filtered.slice(start, end)
  }, [filtered, currentPage, itemsPerPage])

  const totalPages = Math.ceil(filtered.length / itemsPerPage)

  return (
    <div className="flex flex-col gap-6">
      {/* Page header with primary action */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground md:text-3xl">
            Orders
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage customer orders. Use &ldquo;New Cash Order&rdquo; to record an in-person cash payment.
          </p>
        </div>
        <Link
          href="/admin/orders/new"
          className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-white shadow-[0_10px_30px_rgba(0,0,0,0.1)] transition-all sm:w-auto"
        >
          <Plus className="h-4 w-4" />
          New Cash Order
        </Link>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Search */}
        <div className="w-full sm:max-w-xs">
          <FormInput
            type="text"
            placeholder="Search orders..."
            value={query}
            onChange={(e) =>
              setTableState((prev) => ({
                ...prev,
                query: e.target.value,
              }))
            }
            prefix={<Search className="h-4 w-4" />}
            aria-label="Search orders"
          />
        </div>

        {/* Filter + count */}
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">
            {filtered.length} {filtered.length === 1 ? 'order' : 'orders'}
            {filtered.length !== orders.length && ` of ${orders.length}`}
          </span>
          <FormSelect
            value={paymentFilter}
            onChange={(e) =>
              setTableState((prev) => ({
                ...prev,
                paymentFilter: e.target.value as PaymentFilter,
              }))
            }
            options={paymentFilterOptions}
            aria-label="Filter by payment status"
          />
          <FormSelect
            value={shippingFilter}
            onChange={(e) =>
              setTableState((prev) => ({
                ...prev,
                shippingFilter: e.target.value as ShippingFilter,
              }))
            }
            options={shippingFilterOptions}
            aria-label="Filter by shipping status"
          />
        </div>
      </div>

      {/* Table card */}
      <div className="rounded-3xl bg-card text-card-foreground shadow-[0_10px_30px_rgba(0,0,0,0.05)] dark:shadow-[0_10px_30px_rgba(0,0,0,0.3)] overflow-hidden">
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
                <th className="hidden px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground md:table-cell">
                  Method
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
              {paginated.map((order) => (
                <tr
                  key={order.id}
                  className="border-b border-border/50 transition-colors last:border-0 hover:bg-accent"
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
                    <StatusBadge variant={paymentStatusMap[order.paymentStatus]}>
                      {order.paymentStatus}
                    </StatusBadge>
                  </td>

                  {/* Payment Method */}
                  <td className="hidden px-6 py-4 text-right text-sm text-muted-foreground md:table-cell">
                    {formatPaymentMethodShort(order.paymentMethod || "stripe")}
                  </td>

                  {/* Shipping Status */}
                  <td className="hidden px-6 py-4 text-right lg:table-cell">
                    <StatusBadge variant={shippingStatusMap[order.shippingStatus]}>
                      {order.shippingStatus}
                    </StatusBadge>
                  </td>

                  {/* View */}
                  <td className="px-6 py-4 text-right">
                    <Link
                      href={`/admin/orders/${order.orderId || order.id}`}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
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

        {/* Pagination */}
        {!loading && filtered.length > 0 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={(page) =>
              setTableState((prev) => ({
                ...prev,
                currentPage: page,
              }))
            }
            itemsPerPage={itemsPerPage}
            totalItems={filtered.length}
            onItemsPerPageChange={(newItemsPerPage) =>
              setTableState((prev) => ({
                ...prev,
                itemsPerPage: newItemsPerPage,
                currentPage: 1,
              }))
            }
          />
        )}

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
            {query.trim() || paymentFilter !== "all" || shippingFilter !== "all" ? (
              <button
                onClick={() => {
                  setTableState((prev) => ({
                    ...prev,
                    query: "",
                    paymentFilter: "all",
                    shippingFilter: "all",
                    currentPage: 1,
                  }))
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
