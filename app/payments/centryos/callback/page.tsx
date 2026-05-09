"use client"

import { Suspense, useCallback, useEffect, useRef, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Loader2, CheckCircle2, Clock, XCircle } from "lucide-react"

export default function CentryOSCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="text-center space-y-4">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
      }
    >
      <CentryOSCallbackContent />
    </Suspense>
  )
}

interface StatusResponse {
  order: {
    id: string
    orderNumber: string
    status: string
    paymentStatus: string
    total: number
  }
  payment: {
    status: string
    transactionId: string | null
    updatedAt: string
  } | null
}

const POLL_INTERVAL_MS = 3000
const MAX_POLLS = 20 // ~60 seconds total

function CentryOSCallbackContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const orderId = searchParams.get("orderId") ?? ""

  const [data, setData] = useState<StatusResponse | null>(null)
  const [error, setError] = useState("")
  const [polling, setPolling] = useState(true)
  const pollCountRef = useRef(0)
  const persistedRef = useRef(false)

  const fetchStatus = useCallback(async () => {
    if (!orderId) {
      setError("Missing order reference")
      setPolling(false)
      return
    }
    try {
      const res = await fetch(
        `/api/payments/centryos/status?orderId=${encodeURIComponent(orderId)}`
      )
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || `Status check failed (${res.status})`)
      }
      const body = (await res.json()) as StatusResponse
      setData(body)

      // Stop polling once we reach a terminal state OR we've waited
      // long enough that further polling is unlikely to be useful.
      // The customer never marks themselves "paid" — that bit only
      // flips on a verified webhook (see /api/payments/centryos/webhook).
      const terminal =
        body.order.paymentStatus === "paid" ||
        body.order.paymentStatus === "failed" ||
        body.order.paymentStatus === "refunded" ||
        body.payment?.status === "FAILED" ||
        body.payment?.status === "CANCELLED" ||
        body.payment?.status === "EXPIRED"

      pollCountRef.current += 1
      if (terminal || pollCountRef.current >= MAX_POLLS) {
        setPolling(false)
      }
    } catch (err) {
      console.error("CentryOS callback: status check failed", err)
      setError(err instanceof Error ? err.message : "Unable to check status")
      setPolling(false)
    }
  }, [orderId])

  // First-load: persist that the user landed (parity with link-money's
  // POST /api/payments/link-money/callback). Server-side decides whether
  // to clear cart based on actual payment status — never trusts the page.
  useEffect(() => {
    if (!orderId || persistedRef.current) return
    persistedRef.current = true
    ;(async () => {
      try {
        await fetch("/api/payments/centryos/callback", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId }),
        })
      } catch (err) {
        console.error("CentryOS callback: persist failed", err)
      }
    })()
  }, [orderId])

  useEffect(() => {
    fetchStatus()
    if (!polling) return
    const id = setInterval(() => {
      if (!polling) return
      fetchStatus()
    }, POLL_INTERVAL_MS)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId])

  // Re-arm polling control when terminal state is reached.
  useEffect(() => {
    if (!polling) return
    const terminal =
      data?.order.paymentStatus === "paid" ||
      data?.order.paymentStatus === "failed" ||
      data?.payment?.status === "FAILED" ||
      data?.payment?.status === "CANCELLED" ||
      data?.payment?.status === "EXPIRED"
    if (terminal) setPolling(false)
  }, [data, polling])

  const paymentStatus = data?.order.paymentStatus
  const innerStatus = data?.payment?.status

  const isPaid = paymentStatus === "paid"
  const isFailed =
    paymentStatus === "failed" ||
    innerStatus === "FAILED" ||
    innerStatus === "CANCELLED" ||
    innerStatus === "EXPIRED"
  const isProcessing = !isPaid && !isFailed

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="mx-auto max-w-md rounded-3xl bg-white p-8 text-center shadow-[0_10px_30px_rgba(0,0,0,0.05)] space-y-6">
        {isPaid && (
          <>
            <CheckCircle2 className="mx-auto h-16 w-16 text-green-500" />
            <h1 className="text-2xl font-bold">Payment Confirmed</h1>
            <p className="text-muted-foreground">
              Thanks! Your CentryOS payment has been verified and your order
              is now being processed.
            </p>
            {data?.order.orderNumber && (
              <p className="text-xs text-muted-foreground">
                Order #{data.order.orderNumber}
              </p>
            )}
          </>
        )}

        {isProcessing && (
          <>
            {polling ? (
              <Loader2 className="mx-auto h-16 w-16 animate-spin text-muted-foreground" />
            ) : (
              <Clock className="mx-auto h-16 w-16 text-amber-500" />
            )}
            <h1 className="text-2xl font-bold">Payment Processing</h1>
            <p className="text-muted-foreground">
              We&apos;re waiting for CentryOS to confirm your payment. This
              page will update automatically — you can also safely close this
              tab and we&apos;ll email you once the order is confirmed.
            </p>
            {data?.order.orderNumber && (
              <p className="text-xs text-muted-foreground">
                Order #{data.order.orderNumber}
              </p>
            )}
          </>
        )}

        {isFailed && (
          <>
            <XCircle className="mx-auto h-16 w-16 text-red-500" />
            <h1 className="text-2xl font-bold">Payment Not Completed</h1>
            <p className="text-muted-foreground">
              Your CentryOS payment did not go through. You haven&apos;t been
              charged. Please try again or pick a different payment method.
            </p>
          </>
        )}

        {error && (
          <p className="text-sm text-red-500">Note: {error}</p>
        )}

        <div className="flex flex-col gap-3 pt-2">
          <Button onClick={() => router.push("/orders")}>
            View My Orders
          </Button>
          {isFailed && (
            <Button variant="outline" onClick={() => router.push("/checkout")}>
              Return to Checkout
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
