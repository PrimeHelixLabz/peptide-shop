"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, FileDown, Loader2, Package, Printer } from "lucide-react"
import { toast } from "sonner"
import { format } from "date-fns"
import type { Order } from "@/lib/db/schema"
import { formatPaymentMethod } from "@/lib/format-payment-method"
import { CARRIER_OPTIONS } from "@/lib/shipping/carriers"

/**
 * Rasterize the WebP brand logo to a PNG data URL. react-pdf's <Image>
 * supports PNG/JPG only, so we decode the webp into a canvas and re-encode.
 * Returns undefined on any failure so the PDF just renders without a logo.
 */
async function logoToPngDataUrl(): Promise<string | undefined> {
  try {
    const img = new window.Image()
    img.crossOrigin = "anonymous"
    img.src = "/logo-1.webp"
    await img.decode()
    const canvas = document.createElement("canvas")
    canvas.width = img.naturalWidth || 128
    canvas.height = img.naturalHeight || 128
    const ctx = canvas.getContext("2d")
    if (!ctx) return undefined
    ctx.drawImage(img, 0, 0)
    return canvas.toDataURL("image/png")
  } catch {
    return undefined
  }
}

/**
 * Print-optimized packing slip / receipt for a single order.
 *
 * Rendered at /admin/orders/[id]/receipt and inherits the admin chrome
 * (AdminShell sidebar). The `@media print` rules below hide that chrome
 * so only the slip itself goes to paper — no extra layout route needed.
 *
 * Source of truth is our own `orders` row, NOT the CentryOS receipt:
 * CentryOS only knows the charge amount, not the line items or our
 * fee breakdown. Everything here comes from the order record.
 */
export function OrderReceipt({ orderId }: { orderId: string }) {
  const router = useRouter()
  const [order, setOrder] = useState<Order | null>(null)
  const [customerName, setCustomerName] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [downloading, setDownloading] = useState(false)

  useEffect(() => {
    async function fetchOrder() {
      try {
        const response = await fetch(`/api/orders/${orderId}`)
        if (!response.ok) {
          throw new Error("Order not found")
        }
        const data = await response.json()
        setOrder(data.order)
        if (data.customerName) setCustomerName(data.customerName)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load order")
      } finally {
        setLoading(false)
      }
    }

    fetchOrder()
  }, [orderId])

  // Generate a true vector PDF and trigger a download. The heavy react-pdf
  // bundle is loaded on demand so it never weighs down the initial page.
  const handleDownloadPdf = async () => {
    if (!order) return
    setDownloading(true)
    try {
      const [{ pdf }, { OrderReceiptPdf }] = await Promise.all([
        import("@react-pdf/renderer"),
        import("./order-receipt-pdf"),
      ])
      const logoDataUrl = await logoToPngDataUrl()
      const blob = await pdf(
        <OrderReceiptPdf
          order={order}
          customerName={customerName}
          logoDataUrl={logoDataUrl}
        />
      ).toBlob()

      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `packing-slip-${order.orderNumber}.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error("Failed to generate PDF:", err)
      toast.error("Could not generate the PDF. Please try again.")
    } finally {
      setDownloading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 px-6 py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Loading receipt...</p>
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 px-6 py-20">
        <Package className="h-10 w-10 text-muted-foreground/60" />
        <p className="text-sm text-muted-foreground">{error || "Order not found"}</p>
        <Link
          href="/admin/orders"
          className="mt-2 text-sm font-medium text-foreground underline underline-offset-4 hover:text-muted-foreground"
        >
          Return to orders
        </Link>
      </div>
    )
  }

  const addr = order.shippingAddress as Order["shippingAddress"] & {
    firstName?: string
    lastName?: string
  }
  const shipToName =
    customerName ||
    (addr?.firstName && addr?.lastName
      ? `${addr.firstName} ${addr.lastName}`
      : order.email || "")

  const carrierLabel = order.trackingCarrier
    ? CARRIER_OPTIONS.find((c) => c.value === order.trackingCarrier)?.label ??
      order.trackingCarrier
    : null

  const hasDiscount = order.discountAmount != null && order.discountAmount > 0

  return (
    <>
      {/* Print rules: hide the admin shell, show only the slip, fit one page. */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #packing-slip,
          #packing-slip * {
            visibility: visible;
          }
          #packing-slip {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          /* margin: 0 leaves the browser no room to inject its own
             header/footer (date, page title, URL, page number), so they
             are omitted. We supply the page padding ourselves below. */
          @page {
            margin: 0;
          }
        }
      `}</style>

      {/* On-screen toolbar — never printed. */}
      <div className="mb-6 flex items-center justify-between print:hidden">
        <button
          type="button"
          onClick={() => router.push(`/admin/orders/${orderId}`)}
          className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Order
        </button>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={downloading}
            className="inline-flex items-center gap-2 rounded-2xl border border-gray-300 px-5 py-2.5 text-sm font-semibold text-foreground transition-all hover:border-foreground hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:hover:bg-gray-800"
          >
            {downloading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileDown className="h-4 w-4" />
            )}
            {downloading ? "Generating..." : "Download PDF"}
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 rounded-2xl bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-[0_10px_30px_rgba(0,0,0,0.1)] transition-all hover:shadow-[0_20px_40px_rgba(0,0,0,0.15)]"
          >
            <Printer className="h-4 w-4" />
            Print
          </button>
        </div>
      </div>

      {/* The slip. Black on white, no photos — packing-slip convention and
          cheap to print on any office/thermal printer. */}
      <div
        id="packing-slip"
        className="mx-auto max-w-3xl bg-white p-10 text-black shadow-[0_10px_30px_rgba(0,0,0,0.05)] print:max-w-none print:p-[16mm] print:shadow-none"
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-black/15 pb-6">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo-1.webp"
              alt="PrimeHelix Labz"
              className="h-12 w-12 object-contain"
            />
            <div>
              <p className="text-lg font-bold leading-tight">PrimeHelix Labz</p>
              <p className="text-xs text-black/60">Research Peptides</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm font-bold uppercase tracking-wider">Packing Slip</p>
            <p className="mt-1 text-xs text-black/60">
              {format(new Date(order.createdAt), "MMM d, yyyy")}
            </p>
            <p className="mt-1 text-sm font-semibold">#{order.orderNumber}</p>
          </div>
        </div>

        {/* Ship to */}
        <div className="grid grid-cols-2 gap-8 py-6">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-black/50">
              Ship To
            </p>
            <div className="mt-2 text-sm leading-relaxed">
              {shipToName && <p className="font-semibold">{shipToName}</p>}
              <p>{addr?.street}</p>
              <p>
                {addr?.city}, {addr?.state} {addr?.zipCode}
              </p>
              <p>{addr?.country}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-black/50">
              Order Details
            </p>
            <div className="mt-2 space-y-0.5 text-sm">
              <p>
                <span className="text-black/60">Order: </span>
                {order.orderNumber}
              </p>
              <p>
                <span className="text-black/60">Payment: </span>
                {formatPaymentMethod(order.paymentMethod)}
              </p>
              {order.trackingNumber && (
                <p>
                  <span className="text-black/60">Tracking: </span>
                  {carrierLabel ? `${carrierLabel} · ` : ""}
                  {order.trackingNumber}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Line items */}
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-y border-black/15 text-left">
              <th className="py-2 font-semibold">Item</th>
              <th className="w-16 py-2 text-center font-semibold">Qty</th>
              <th className="w-24 py-2 text-right font-semibold">Unit</th>
              <th className="w-28 py-2 text-right font-semibold">Amount</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item, index) => (
              <tr key={index} className="border-b border-black/10 align-top">
                <td className="py-2.5">
                  <span className="font-medium">{item.productName}</span>
                  {item.variantName &&
                  !item.productName.includes(`(${item.variantName})`) ? (
                    <span className="text-black/60"> ({item.variantName})</span>
                  ) : null}
                </td>
                <td className="py-2.5 text-center tabular-nums">{item.quantity}</td>
                <td className="py-2.5 text-right tabular-nums">
                  ${item.price.toFixed(2)}
                </td>
                <td className="py-2.5 text-right font-medium tabular-nums">
                  ${(item.price * item.quantity).toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div className="mt-4 flex justify-end">
          <div className="w-full max-w-xs space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-black/60">Subtotal</span>
              <span className="tabular-nums">${order.subtotal.toFixed(2)}</span>
            </div>
            {hasDiscount && (
              <div className="flex justify-between">
                <span className="text-black/60">
                  Discount{order.discountCode ? ` (${order.discountCode})` : ""}
                </span>
                <span className="tabular-nums">
                  -${order.discountAmount!.toFixed(2)}
                </span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-black/60">Shipping</span>
              <span className="tabular-nums">${order.shipping.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-black/60">Service Fee</span>
              <span className="tabular-nums">${order.serviceFee.toFixed(2)}</span>
            </div>
            <div className="mt-2 flex justify-between border-t border-black/20 pt-2 text-base font-bold">
              <span>Total Paid</span>
              <span className="tabular-nums">${order.total.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Footer — thank you + compliance disclaimer (matches site footer). */}
        <div className="mt-10 border-t border-black/15 pt-6 text-left">
          <p className="text-sm font-medium">Thank you for your order.</p>
          <p className="mt-2 text-xs leading-relaxed text-black/55">
            All products are sold strictly for research purposes only. Not for
            human consumption. <br /> &copy; 2026 PrimeHelix Labz. All rights reserved.
          </p>
        </div>
      </div>
    </>
  )
}
