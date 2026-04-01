"use client"

import { useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Loader2, CheckCircle2, Clock, XCircle } from "lucide-react"

/**
 * Link Money Callback Page
 *
 * After the user completes (or abandons) the Link Money bank-link/payment
 * flow, Link Money redirects here with query params:
 *   ?status=...&customerId=...&paymentId=...&paymentStatusCode=...
 *
 * This page persists the result in Supabase and shows a clear outcome UI.
 */
export default function LinkMoneyCallbackPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [saving, setSaving] = useState(true)
  const [saveError, setSaveError] = useState("")

  const status = searchParams.get("status") ?? "unknown"
  const customerId = searchParams.get("customerId") ?? undefined
  const paymentId = searchParams.get("paymentId") ?? undefined
  const paymentStatusCode = searchParams.get("paymentStatusCode") ?? undefined

  useEffect(() => {
    async function persistCallback() {
      try {
        const res = await fetch("/api/payments/link-money/callback", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status,
            customerId,
            paymentId,
            paymentStatusCode,
          }),
        })
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data.error || "Failed to save payment result")
        }
      } catch (err) {
        console.error("Callback persist error:", err)
        setSaveError(
          err instanceof Error ? err.message : "Failed to save payment result"
        )
      } finally {
        setSaving(false)
      }
    }

    persistCallback()
  }, [status, customerId, paymentId, paymentStatusCode])

  // Determine UI state
  const isSuccess = status === "success" || status === "completed"
  const isPending =
    status === "pending" ||
    status === "processing" ||
    paymentStatusCode === "PENDING"
  const isFailed = !isSuccess && !isPending

  if (saving) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-muted-foreground">Processing your payment...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="mx-auto max-w-md rounded-3xl bg-white p-8 text-center shadow-[0_10px_30px_rgba(0,0,0,0.05)] space-y-6">
        {isSuccess && (
          <>
            <CheckCircle2 className="mx-auto h-16 w-16 text-green-500" />
            <h1 className="text-2xl font-bold">Payment Successful</h1>
            <p className="text-muted-foreground">
              Your bank payment has been initiated. You&apos;ll receive a
              confirmation once the transfer completes.
            </p>
            {paymentId && (
              <p className="text-xs text-muted-foreground">
                Payment ID: {paymentId}
              </p>
            )}
          </>
        )}

        {isPending && (
          <>
            <Clock className="mx-auto h-16 w-16 text-amber-500" />
            <h1 className="text-2xl font-bold">Payment Pending</h1>
            <p className="text-muted-foreground">
              Your bank payment is being processed. This may take a few moments.
              We&apos;ll update your order once the transfer is confirmed.
            </p>
            {paymentId && (
              <p className="text-xs text-muted-foreground">
                Payment ID: {paymentId}
              </p>
            )}
          </>
        )}

        {isFailed && (
          <>
            <XCircle className="mx-auto h-16 w-16 text-red-500" />
            <h1 className="text-2xl font-bold">Payment Failed</h1>
            <p className="text-muted-foreground">
              Something went wrong with your bank payment. Please try again or
              use a different payment method.
            </p>
          </>
        )}

        {saveError && (
          <p className="text-sm text-red-500">
            Note: {saveError}
          </p>
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
