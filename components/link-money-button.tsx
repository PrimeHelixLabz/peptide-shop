"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Loader2, Landmark } from "lucide-react"

export interface LinkMoneyCheckoutData {
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
  /** Manually-entered affiliate code (client-validated). When absent the
   *  server falls back to the phl_ref cookie. */
  affiliateCode?: string
  /** Applied discount code (already validated client-side). Server re-validates
   *  and reserves a redemption slot atomically. */
  discountCode?: string
}

interface LinkMoneyButtonProps {
  /** Full checkout data matching the session API schema */
  checkoutData: LinkMoneyCheckoutData
  /** Disable when form is incomplete */
  disabled?: boolean
  /** Optional pre-formatted total (e.g. "$132.00") rendered inside the button. */
  totalLabel?: string
}

/**
 * "Pay by Bank" button that creates a Link Money session on our backend
 * and then launches the Link Money SDK for bank-link/payment.
 */
export function LinkMoneyButton({
  checkoutData,
  disabled,
  totalLabel,
}: LinkMoneyButtonProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function handlePayByBank() {
    setLoading(true)
    setError("")

    try {
      // Step 1: Create session on our backend (validates cart, creates order)
      const res = await fetch("/api/payments/link-money/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(checkoutData),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || "Failed to create payment session")
      }

      const { sessionUrl, environment } = await res.json()

      // Step 2: Launch Link Money SDK
      const Link = (await import("@link.money/linkmoney-web")).default

      const lm = Link.LinkInstance({
        sessionUrl,
        environment: environment || "sandbox",
        sessionVersion: 2,
      })

      lm.callSessionUrl()
    } catch (err) {
      console.error("Pay by Bank error:", err)
      setError(
        err instanceof Error ? err.message : "Something went wrong. Please try again."
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
        onClick={handlePayByBank}
        className="w-full h-14 text-base border-2"
        size="lg"
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Connecting to Bank...
          </>
        ) : (
          <>
            <Landmark className="mr-2 h-4 w-4" />
            {totalLabel ? `Pay ${totalLabel} by Bank` : "Pay by Bank"}
          </>
        )}
      </Button>
      {error && (
        <p className="text-sm text-red-600 text-center">{error}</p>
      )}
    </div>
  )
}
