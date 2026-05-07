"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { ArrowLeft, Package, CheckCircle2, Loader2, Banknote, Trash2 } from "lucide-react"
import { toast } from "sonner"
import type { AdminOrder } from "./admin-orders-table"
import type { Order } from "@/lib/db/schema"
import { getProductImageUrl } from "@/lib/storage/image-utils"
import { format } from "date-fns"
import { formatPaymentMethod } from "@/lib/format-payment-method"
import { FormSelect } from "@/components/common/form-select"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

/* ------------------------------------------------------------------ */
/*  Badge styles (same as orders table)                                */
/* ------------------------------------------------------------------ */

const paymentStyles: Record<AdminOrder["paymentStatus"], string> = {
  Paid: "bg-primary text-white",
  Pending: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800",
  Authorized: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800",
  Processing: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800",
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
  if (status === "authorized") return "Authorized"
  if (status === "processing") return "Processing"
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
  const router = useRouter()
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [customerName, setCustomerName] = useState<string>("")
  const [shippingStatus, setShippingStatus] = useState<AdminOrder["shippingStatus"]>("Processing")
  const [fulfilled, setFulfilled] = useState(false)
  const [saving, setSaving] = useState(false)
  const [cashDialogOpen, setCashDialogOpen] = useState(false)
  const [markingCash, setMarkingCash] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

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
        if (data.customerName) setCustomerName(data.customerName)
        setShippingStatus(mapShippingStatus(data.order.status))
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load order")
      } finally {
        setLoading(false)
      }
    }

    fetchOrder()
  }, [orderId])

  const handleMarkPaidByCash = async () => {
    setMarkingCash(true)
    try {
      const response = await fetch(`/api/orders/${orderId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentStatus: "paid",
          paymentMethod: "cash",
        }),
      })

      const data = await response.json().catch(() => ({}))

      if (response.status === 409 && Array.isArray(data?.shortfalls)) {
        const lines = data.shortfalls
          .map(
            (s: { productName: string; variantName?: string; requested: number; available: number }) =>
              `${s.productName}${s.variantName ? ` (${s.variantName})` : ""}: need ${s.requested}, only ${s.available} in stock`
          )
          .join("\n")
        toast.error("Cannot mark as paid — insufficient stock", {
          description: lines,
        })
        return
      }

      if (!response.ok) {
        throw new Error(data?.error || "Failed to mark order as paid by cash")
      }

      setOrder(data.order)
      setCashDialogOpen(false)
      toast.success("Order marked as paid by cash. Stock has been deducted.")
    } catch (err) {
      console.error("Error marking order as paid by cash:", err)
      toast.error("Failed to mark order as paid by cash")
    } finally {
      setMarkingCash(false)
    }
  }

  const handleDeleteOrder = async () => {
    setDeleting(true)
    try {
      const response = await fetch(`/api/orders/${orderId}`, {
        method: "DELETE",
      })

      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(data?.error || "Failed to delete order")
      }

      toast.success(
        data?.inventoryRestored
          ? "Order deleted. Stock has been restored."
          : "Order deleted. No stock change (order had not been paid)."
      )
      setDeleteDialogOpen(false)
      router.push("/admin/orders")
    } catch (err) {
      console.error("Error deleting order:", err)
      toast.error("Failed to delete order")
      setDeleting(false)
    }
  }

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

  // Get customer name (prefer API-resolved name, fall back to shipping address)
  const displayCustomerName = customerName
    || (shippingAddr?.firstName && shippingAddr?.lastName
      ? `${shippingAddr.firstName} ${shippingAddr.lastName}`
      : order.email || "Guest Customer")

  const subtotal = order.subtotal
  const serviceFee = order.serviceFee
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
                  <span className="text-xs text-muted-foreground">Service Fee</span>
                  <span className="text-sm font-semibold text-foreground">${serviceFee.toFixed(2)}</span>
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
                  {displayCustomerName}
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
                <span className="text-xs text-muted-foreground">
                  {formatPaymentMethod(order.paymentMethod)}
                </span>
              </div>

              {/* Shipping status (editable) */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Shipping Status
                </span>
                <FormSelect
                  value={shippingStatus}
                  onChange={(e) =>
                    setShippingStatus(
                      e.target.value as AdminOrder["shippingStatus"]
                    )
                  }
                  options={shippingOptions.map((opt) => ({ value: opt, label: opt }))}
                  wrapperClassName="w-full"
                  aria-label="Update shipping status"
                />
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

              {order.paymentStatus !== "paid" && (
                <button
                  type="button"
                  onClick={() => setCashDialogOpen(true)}
                  disabled={markingCash}
                  className="h-12 w-full rounded-2xl border border-emerald-600/40 bg-emerald-50 dark:bg-emerald-900/20 text-sm font-semibold text-emerald-700 dark:text-emerald-400 transition-all duration-200 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <Banknote className="h-4 w-4" />
                  Mark as Paid by Cash
                </button>
              )}

              <button
                type="button"
                onClick={() => setDeleteDialogOpen(true)}
                disabled={deleting}
                className="h-12 w-full rounded-2xl border border-destructive/40 bg-destructive/5 text-sm font-semibold text-destructive transition-all duration-200 hover:bg-destructive/10 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Delete Order
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

      {/* Mark as Paid by Cash confirmation */}
      <AlertDialog open={cashDialogOpen} onOpenChange={setCashDialogOpen}>
        <AlertDialogContent className="rounded-3xl bg-white dark:bg-gray-900 shadow-[0_10px_30px_rgba(0,0,0,0.05)] dark:shadow-[0_10px_30px_rgba(0,0,0,0.3)] border-0">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-bold text-foreground">
              Mark order as paid by cash?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-muted-foreground">
              This will set order <strong>{order.orderNumber}</strong> to{" "}
              <strong>Paid</strong>, change the payment method to{" "}
              <strong>Cash</strong>, and{" "}
              <strong>deduct the following stock</strong>:
            </AlertDialogDescription>
          </AlertDialogHeader>
          <ul className="rounded-2xl border border-border/50 bg-muted/30 px-4 py-3 text-sm text-foreground">
            {order.items.map((item, idx) => (
              <li
                key={idx}
                className="flex items-center justify-between py-1"
              >
                <span>
                  {item.productName}
                  {item.variantName ? ` (${item.variantName})` : ""}
                </span>
                <span className="font-semibold tabular-nums">
                  &minus; {item.quantity}
                </span>
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted-foreground">
            Only confirm after you have physically received the cash payment.
            If any item lacks stock the action will be blocked and nothing
            will change.
          </p>
          <AlertDialogFooter className="flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <AlertDialogCancel
              disabled={markingCash}
              className="rounded-2xl border border-gray-300 dark:border-gray-700 px-5 py-2.5 text-sm font-semibold text-muted-foreground transition-all duration-200 hover:border-foreground hover:text-foreground hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                handleMarkPaidByCash()
              }}
              disabled={markingCash}
              className="rounded-2xl bg-emerald-600 text-white hover:bg-emerald-700 px-5 py-2.5 text-sm font-semibold shadow-[0_10px_30px_rgba(0,0,0,0.1)] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {markingCash ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                "Confirm Cash Payment"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete order confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="rounded-3xl bg-white dark:bg-gray-900 shadow-[0_10px_30px_rgba(0,0,0,0.05)] dark:shadow-[0_10px_30px_rgba(0,0,0,0.3)] border-0">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-bold text-foreground">
              Delete this order permanently?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-muted-foreground">
              You are about to delete order{" "}
              <strong>{order.orderNumber}</strong> for{" "}
              <strong>{displayCustomerName}</strong>{" "}
              (<strong>${order.total.toFixed(2)}</strong>). This action is
              irreversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {order.paymentStatus === "paid" ? (
            <div className="rounded-2xl border border-emerald-600/30 bg-emerald-50 dark:bg-emerald-900/20 px-4 py-3">
              <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                Stock will be restored to inventory:
              </p>
              <ul className="mt-2 text-sm text-foreground">
                {order.items.map((item, idx) => (
                  <li
                    key={idx}
                    className="flex items-center justify-between py-1"
                  >
                    <span>
                      {item.productName}
                      {item.variantName ? ` (${item.variantName})` : ""}
                    </span>
                    <span className="font-semibold tabular-nums text-emerald-700 dark:text-emerald-400">
                      + {item.quantity}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="rounded-2xl border border-border/50 bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
              This order was never marked as paid, so no stock had been
              deducted. Inventory will not change.
            </div>
          )}
          <AlertDialogFooter className="flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <AlertDialogCancel
              disabled={deleting}
              className="rounded-2xl border border-gray-300 dark:border-gray-700 px-5 py-2.5 text-sm font-semibold text-muted-foreground transition-all duration-200 hover:border-foreground hover:text-foreground hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                handleDeleteOrder()
              }}
              disabled={deleting}
              className="rounded-2xl bg-destructive text-destructive-foreground hover:bg-destructive/90 px-5 py-2.5 text-sm font-semibold shadow-[0_10px_30px_rgba(0,0,0,0.1)] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {deleting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete Order"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}