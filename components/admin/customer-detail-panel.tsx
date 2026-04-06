"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import {
  X,
  Mail,
  Phone,
  MapPin,
  Calendar,
  ShoppingCart,
  DollarSign,
  Package,
  Clock,
  Repeat,
  TrendingUp,
  ChevronDown,
  ChevronRight,
  Eye,
} from "lucide-react"
import { StatusBadge, type StatusVariant } from "@/components/common/status-badge"
import { formatPaymentMethodShort } from "@/lib/format-payment-method"

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface CustomerProfile {
  id: string
  name: string
  email: string
  phone: string | null
  address: any | null
  role: string
  avatar: string | null
  ageVerified: boolean | null
  createdAt: string
  updatedAt: string
}

interface PurchaseSummary {
  totalOrders: number
  paidOrders: number
  totalSpent: number
  totalItems: number
  firstOrderDate: string | null
  lastOrderDate: string | null
  avgOrderValue: number
  pendingOrders: number
  daysSinceLastPurchase: number | null
  isRepeatCustomer: boolean
}

interface TopProduct {
  name: string
  quantity: number
  image: string
}

interface OrderDetail {
  id: string
  orderNumber: string
  status: string
  paymentStatus: string
  paymentMethod: string
  provider: string
  total: number
  subtotal: number
  shipping: number
  serviceFee: number
  items: Array<{
    productId?: string
    productName?: string
    productImage?: string
    price?: number
    quantity?: number
    variantName?: string
  }>
  itemsCount: number
  totalQuantity: number
  trackingNumber: string | null
  notes: string | null
  createdAt: string
}

interface TimelineEvent {
  type: string
  date: string
  label: string
  detail?: string
}

/* ------------------------------------------------------------------ */
/*  Status mapping                                                     */
/* ------------------------------------------------------------------ */

const paymentStatusVariant: Record<string, StatusVariant> = {
  paid: "success",
  pending: "warning",
  failed: "error",
  refunded: "neutral",
}

const orderStatusVariant: Record<string, StatusVariant> = {
  delivered: "success",
  shipped: "info",
  processing: "warning",
  pending: "warning",
  cancelled: "error",
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatCurrency(value: number): string {
  return `$${value.toFixed(2)}`
}

function formatDate(iso: string | null): string {
  if (!iso) return "-"
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

/* ------------------------------------------------------------------ */
/*  Tabs                                                               */
/* ------------------------------------------------------------------ */

type Tab = "overview" | "orders" | "activity"

const tabs: { value: Tab; label: string }[] = [
  { value: "overview", label: "Overview" },
  { value: "orders", label: "Orders" },
  { value: "activity", label: "Activity" },
]

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

interface CustomerDetailPanelProps {
  customerId: string | null
  onClose: () => void
}

export function CustomerDetailPanel({ customerId, onClose }: CustomerDetailPanelProps) {
  const [loading, setLoading] = useState(true)
  const [customer, setCustomer] = useState<CustomerProfile | null>(null)
  const [purchaseSummary, setPurchaseSummary] = useState<PurchaseSummary | null>(null)
  const [topProducts, setTopProducts] = useState<TopProduct[]>([])
  const [orders, setOrders] = useState<OrderDetail[]>([])
  const [timeline, setTimeline] = useState<TimelineEvent[]>([])
  const [activeTab, setActiveTab] = useState<Tab>("overview")
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null)

  useEffect(() => {
    if (!customerId) return

    setLoading(true)
    setActiveTab("overview")
    setExpandedOrder(null)

    async function fetchDetail() {
      try {
        const response = await fetch(`/api/admin/customers/${customerId}`)
        if (response.ok) {
          const data = await response.json()
          setCustomer(data.customer)
          setPurchaseSummary(data.purchaseSummary)
          setTopProducts(data.topProducts || [])
          setOrders(data.orders || [])
          setTimeline(data.timeline || [])
        }
      } catch (error) {
        console.error("Error fetching customer detail:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchDetail()
  }, [customerId])

  if (!customerId) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <aside
        className="fixed inset-y-0 right-0 z-50 flex w-full max-w-2xl flex-col bg-[#f6f6f7] dark:bg-gray-950 shadow-[0_10px_30px_rgba(0,0,0,0.15)] dark:shadow-[0_10px_30px_rgba(0,0,0,0.5)] overflow-hidden"
        aria-label="Customer detail"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/50 bg-white dark:bg-gray-900 px-6 py-4">
          <h2 className="text-lg font-semibold text-foreground">Customer Detail</h2>
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
            aria-label="Close panel"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex flex-1 flex-col items-center justify-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-muted-foreground" />
            <p className="text-sm text-muted-foreground">Loading customer...</p>
          </div>
        )}

        {/* Content */}
        {!loading && customer && (
          <div className="flex-1 overflow-y-auto">
            {/* Profile header card */}
            <div className="bg-white dark:bg-gray-900 px-6 py-5 shadow-[0_10px_30px_rgba(0,0,0,0.05)] dark:shadow-[0_10px_30px_rgba(0,0,0,0.3)]">
              <div className="flex items-start gap-4">
                {/* Avatar */}
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-lg font-semibold text-primary">
                  {customer.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase()
                    .slice(0, 2)}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-lg font-semibold text-foreground truncate">
                    {customer.name}
                  </h3>
                  <div className="mt-1 flex flex-col gap-1">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Mail className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{customer.email}</span>
                    </div>
                    {customer.phone && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Phone className="h-3.5 w-3.5 shrink-0" />
                        <span>{customer.phone}</span>
                      </div>
                    )}
                    {customer.address && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">
                          {[
                            customer.address.street,
                            customer.address.city,
                            customer.address.state,
                            customer.address.zipCode,
                          ]
                            .filter(Boolean)
                            .join(", ")}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-3.5 w-3.5 shrink-0" />
                      <span>Joined {formatDate(customer.createdAt)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick role / verification badges */}
              <div className="mt-3 flex flex-wrap gap-2">
                {customer.role === "admin" && (
                  <span className="inline-block rounded-xl bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary">
                    Admin
                  </span>
                )}
                {customer.ageVerified && (
                  <span className="inline-block rounded-xl bg-gradient-to-r from-brand-primary to-brand-secondary px-3 py-1 text-xs font-semibold uppercase tracking-wider text-brand-primary-foreground">
                    Age Verified
                  </span>
                )}
                {purchaseSummary?.isRepeatCustomer && (
                  <span className="inline-block rounded-xl bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary">
                    Repeat Buyer
                  </span>
                )}
              </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-border/50 bg-white dark:bg-gray-900 px-6">
              <div className="flex gap-1">
                {tabs.map((tab) => (
                  <button
                    key={tab.value}
                    onClick={() => setActiveTab(tab.value)}
                    className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
                      activeTab === tab.value
                        ? "border-primary text-primary"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {tab.label}
                    {tab.value === "orders" && orders.length > 0 && (
                      <span className="ml-1.5 text-xs text-muted-foreground">
                        ({orders.length})
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Tab content */}
            <div className="p-6">
              {/* ---- OVERVIEW TAB ---- */}
              {activeTab === "overview" && purchaseSummary && (
                <div className="flex flex-col gap-6">
                  {/* Purchase summary grid */}
                  <div className="rounded-3xl bg-white dark:bg-gray-900 p-6 shadow-[0_10px_30px_rgba(0,0,0,0.05)] dark:shadow-[0_10px_30px_rgba(0,0,0,0.3)]">
                    <h4 className="mb-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                      Purchase Summary
                    </h4>
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                      <div className="flex flex-col gap-1">
                        <span className="text-xs text-muted-foreground">Total Orders</span>
                        <span className="text-lg font-semibold text-foreground">
                          {purchaseSummary.totalOrders}
                        </span>
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-xs text-muted-foreground">Paid Orders</span>
                        <span className="text-lg font-semibold text-foreground">
                          {purchaseSummary.paidOrders}
                        </span>
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-xs text-muted-foreground">Total Spent</span>
                        <span className="text-lg font-semibold text-foreground">
                          {formatCurrency(purchaseSummary.totalSpent)}
                        </span>
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-xs text-muted-foreground">Total Items</span>
                        <span className="text-lg font-semibold text-foreground">
                          {purchaseSummary.totalItems}
                        </span>
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-xs text-muted-foreground">Avg Order Value</span>
                        <span className="text-lg font-semibold text-foreground">
                          {formatCurrency(purchaseSummary.avgOrderValue)}
                        </span>
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-xs text-muted-foreground">Pending Orders</span>
                        <span className="text-lg font-semibold text-foreground">
                          {purchaseSummary.pendingOrders}
                        </span>
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-xs text-muted-foreground">First Purchase</span>
                        <span className="text-sm font-medium text-foreground">
                          {formatDate(purchaseSummary.firstOrderDate)}
                        </span>
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-xs text-muted-foreground">Last Purchase</span>
                        <span className="text-sm font-medium text-foreground">
                          {formatDate(purchaseSummary.lastOrderDate)}
                        </span>
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-xs text-muted-foreground">Days Since Last</span>
                        <span className="text-lg font-semibold text-foreground">
                          {purchaseSummary.daysSinceLastPurchase !== null
                            ? purchaseSummary.daysSinceLastPurchase
                            : "-"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Top Products */}
                  {topProducts.length > 0 && (
                    <div className="rounded-3xl bg-white dark:bg-gray-900 p-6 shadow-[0_10px_30px_rgba(0,0,0,0.05)] dark:shadow-[0_10px_30px_rgba(0,0,0,0.3)]">
                      <h4 className="mb-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                        Top Purchased Products
                      </h4>
                      <div className="flex flex-col gap-3">
                        {topProducts.map((product, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between gap-3"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xs font-semibold text-primary">
                                {idx + 1}
                              </span>
                              <span className="text-sm font-medium text-foreground truncate">
                                {product.name}
                              </span>
                            </div>
                            <span className="shrink-0 text-sm font-semibold text-muted-foreground">
                              {product.quantity} {product.quantity === 1 ? "unit" : "units"}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Insights */}
                  <div className="rounded-3xl bg-white dark:bg-gray-900 p-6 shadow-[0_10px_30px_rgba(0,0,0,0.05)] dark:shadow-[0_10px_30px_rgba(0,0,0,0.3)]">
                    <h4 className="mb-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                      Customer Insights
                    </h4>
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center gap-3">
                        <DollarSign className="h-4 w-4 text-primary shrink-0" />
                        <span className="text-sm text-foreground">
                          Lifetime value:{" "}
                          <strong>{formatCurrency(purchaseSummary.totalSpent)}</strong>
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Repeat className="h-4 w-4 text-primary shrink-0" />
                        <span className="text-sm text-foreground">
                          {purchaseSummary.isRepeatCustomer
                            ? "Repeat customer"
                            : purchaseSummary.paidOrders === 1
                              ? "One-time buyer"
                              : "No completed purchases"}
                        </span>
                      </div>
                      {purchaseSummary.daysSinceLastPurchase !== null && (
                        <div className="flex items-center gap-3">
                          <Clock className="h-4 w-4 text-primary shrink-0" />
                          <span className="text-sm text-foreground">
                            {purchaseSummary.daysSinceLastPurchase === 0
                              ? "Purchased today"
                              : `${purchaseSummary.daysSinceLastPurchase} day${purchaseSummary.daysSinceLastPurchase === 1 ? "" : "s"} since last purchase`}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center gap-3">
                        <Package className="h-4 w-4 text-primary shrink-0" />
                        <span className="text-sm text-foreground">
                          {purchaseSummary.totalItems} total items purchased
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ---- ORDERS TAB ---- */}
              {activeTab === "orders" && (
                <div className="flex flex-col gap-4">
                  {orders.length === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-3 py-12">
                      <ShoppingCart className="h-8 w-8 text-muted-foreground/60" />
                      <p className="text-sm text-muted-foreground">
                        No orders found for this customer
                      </p>
                    </div>
                  ) : (
                    orders.map((order) => (
                      <div
                        key={order.id}
                        className="rounded-3xl bg-white dark:bg-gray-900 shadow-[0_10px_30px_rgba(0,0,0,0.05)] dark:shadow-[0_10px_30px_rgba(0,0,0,0.3)] overflow-hidden"
                      >
                        {/* Order header */}
                        <button
                          onClick={() =>
                            setExpandedOrder(
                              expandedOrder === order.id ? null : order.id
                            )
                          }
                          className="flex w-full items-center justify-between px-6 py-4 text-left transition-colors hover:bg-accent"
                        >
                          <div className="flex flex-col gap-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-semibold text-foreground">
                                {order.orderNumber || order.id.slice(0, 8)}
                              </span>
                              <StatusBadge
                                variant={paymentStatusVariant[order.paymentStatus] || "neutral"}
                              >
                                {order.paymentStatus}
                              </StatusBadge>
                              <StatusBadge
                                variant={orderStatusVariant[order.status] || "neutral"}
                              >
                                {order.status}
                              </StatusBadge>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                              <span>{formatDate(order.createdAt)}</span>
                              <span>{order.itemsCount} items</span>
                              <span>{formatPaymentMethodShort(order.paymentMethod || "stripe")}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <span className="text-sm font-semibold text-foreground">
                              {formatCurrency(order.total)}
                            </span>
                            <Link
                              href={`/admin/orders/${order.id}`}
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                              aria-label={`View order ${order.orderNumber}`}
                              title="View full order detail"
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </Link>
                            {expandedOrder === order.id ? (
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            )}
                          </div>
                        </button>

                        {/* Expanded order items */}
                        {expandedOrder === order.id && (
                          <div className="border-t border-border/50 px-6 py-4">
                            <table className="w-full text-left">
                              <thead>
                                <tr className="border-b border-border/30">
                                  <th className="pb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                    Product
                                  </th>
                                  <th className="pb-2 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                    Qty
                                  </th>
                                  <th className="pb-2 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                    Price
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {order.items.map((item, idx) => (
                                  <tr
                                    key={idx}
                                    className="border-b border-border/20 last:border-0"
                                  >
                                    <td className="py-2 text-sm text-foreground">
                                      {item.productName || "Unknown"}
                                      {item.variantName && (
                                        <span className="ml-1 text-xs text-muted-foreground">
                                          ({item.variantName})
                                        </span>
                                      )}
                                    </td>
                                    <td className="py-2 text-right text-sm text-muted-foreground">
                                      {item.quantity || 0}
                                    </td>
                                    <td className="py-2 text-right text-sm font-medium text-foreground">
                                      {formatCurrency((item.price || 0) * (item.quantity || 0))}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>

                            {/* Order totals */}
                            <div className="mt-3 flex flex-col gap-1 border-t border-border/30 pt-3">
                              <div className="flex justify-between text-xs text-muted-foreground">
                                <span>Subtotal</span>
                                <span>{formatCurrency(order.subtotal)}</span>
                              </div>
                              {order.shipping > 0 && (
                                <div className="flex justify-between text-xs text-muted-foreground">
                                  <span>Shipping</span>
                                  <span>{formatCurrency(order.shipping)}</span>
                                </div>
                              )}
                              {order.serviceFee > 0 && (
                                <div className="flex justify-between text-xs text-muted-foreground">
                                  <span>Service Fee</span>
                                  <span>{formatCurrency(order.serviceFee)}</span>
                                </div>
                              )}
                              <div className="flex justify-between text-sm font-semibold text-foreground">
                                <span>Total</span>
                                <span>{formatCurrency(order.total)}</span>
                              </div>
                            </div>

                            {order.trackingNumber && (
                              <div className="mt-3 text-xs text-muted-foreground">
                                Tracking: <span className="font-medium text-foreground">{order.trackingNumber}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* ---- ACTIVITY TAB ---- */}
              {activeTab === "activity" && (
                <div className="flex flex-col gap-0">
                  {timeline.length === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-3 py-12">
                      <Clock className="h-8 w-8 text-muted-foreground/60" />
                      <p className="text-sm text-muted-foreground">
                        No activity found
                      </p>
                    </div>
                  ) : (
                    <div className="rounded-3xl bg-white dark:bg-gray-900 p-6 shadow-[0_10px_30px_rgba(0,0,0,0.05)] dark:shadow-[0_10px_30px_rgba(0,0,0,0.3)]">
                      <div className="relative">
                        {/* Timeline line */}
                        <div className="absolute left-[11px] top-3 bottom-3 w-px bg-border/50" />

                        <div className="flex flex-col gap-6">
                          {timeline.map((event, idx) => (
                            <div key={idx} className="relative flex gap-4 pl-0">
                              {/* Dot */}
                              <div
                                className={`relative z-10 mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                                  event.type === "account"
                                    ? "bg-primary/10"
                                    : "bg-white dark:bg-gray-900 border-2 border-border"
                                }`}
                              >
                                <div
                                  className={`h-2 w-2 rounded-full ${
                                    event.type === "account"
                                      ? "bg-primary"
                                      : "bg-muted-foreground"
                                  }`}
                                />
                              </div>

                              {/* Content */}
                              <div className="flex flex-col gap-0.5 min-w-0 pb-0">
                                <span className="text-sm font-medium text-foreground">
                                  {event.label}
                                </span>
                                {event.detail && (
                                  <span className="text-xs text-muted-foreground">
                                    {event.detail}
                                  </span>
                                )}
                                <span className="text-xs text-muted-foreground">
                                  {formatDateTime(event.date)}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </aside>
    </>
  )
}
