"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Loader2, CreditCard } from "lucide-react"

export interface CentryOSCheckoutData {
  cartItems: { productId: string; quantity: number; variantId?: string }[]
  shippingAddress: {
    street: string
    city: string
    state: string
    zipCode: string
    country: string
    email: string
    phone: string
    firstName: string
    lastName: string
  }
  billingAddress?: {
    street: string
    city: string
    state: string
    zipCode: string
    country: string
  }
  notes?: string
  shippingMethod: "ship" | "local-pickup"
}

interface CentryOSButtonProps {
  /** Full checkout data matching the create-link API schema. */
  checkoutData: CentryOSCheckoutData
  /** Disable when the form is incomplete. */
  disabled?: boolean
  /** Optional pre-formatted total (e.g. "$132.00") rendered inside the button. */
  totalLabel?: string
}

/**
 * "Pay with CentryOS" button. Calls our backend to create a hosted
 * checkout link, then full-page-redirects to the returned URL.
 *
 * The customer is redirected back to /payments/centryos/callback after
 * paying — but the order is not marked paid until the webhook arrives.
 */
export function CentryOSButton({ checkoutData, disabled, totalLabel }: CentryOSButtonProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function handlePay() {
    setLoading(true)
    setError("")

    try {
      const res = await fetch("/api/payments/centryos/create-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(checkoutData),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || "Failed to create CentryOS payment link")
      }

      const { checkoutUrl } = (await res.json()) as { checkoutUrl: string }

      if (!checkoutUrl) {
        throw new Error("CentryOS did not return a checkout URL")
      }

      window.location.href = checkoutUrl
    } catch (err) {
      console.error("Pay with CentryOS error:", err)
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again."
      )
      setLoading(false)
    }
  }

  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant="outline"
        disabled={disabled || loading}
        onClick={handlePay}
        className="w-full h-14 text-base border-2"
        size="lg"
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Redirecting to CentryOS...
          </>
        ) : (
          <>
            <CreditCard className="mr-2 h-4 w-4" />
            {totalLabel ? `Pay ${totalLabel} with CentryOS` : "Pay with CentryOS"}
          </>
        )}
      </Button>
      {error && <p className="text-sm text-red-600 text-center">{error}</p>}
    </div>
  )
}
