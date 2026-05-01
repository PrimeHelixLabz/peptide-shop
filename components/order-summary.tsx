"use client"

import { useCart } from "@/lib/cart-context"
import { FlaskConical, Shield, Truck } from "lucide-react"
import {
  SERVICE_FEE_RATE,
  SHIPPING_CARRIER_LABEL,
  FREE_SHIPPING_THRESHOLD,
  getShippingCost,
} from "@/lib/order-constants"

export type ShippingMethod = "ship" | "local-pickup"

interface OrderSummaryProps {
  showCheckoutButton?: boolean
  shippingMethod?: ShippingMethod
}

export function OrderSummary({ showCheckoutButton = true, shippingMethod = "ship" }: OrderSummaryProps) {
  const { subtotal, totalItems } = useCart()

  const shipping = getShippingCost(subtotal, shippingMethod)
  const shippingLabel = shippingMethod === "local-pickup" ? "Local Pickup" : SHIPPING_CARRIER_LABEL
  const serviceFee = subtotal * SERVICE_FEE_RATE
  const total = subtotal + shipping + serviceFee

  const amountToFreeShipping =
    shippingMethod === "ship" && subtotal > 0 && subtotal < FREE_SHIPPING_THRESHOLD
      ? FREE_SHIPPING_THRESHOLD - subtotal
      : 0
  const earnedFreeShipping =
    shippingMethod === "ship" && subtotal >= FREE_SHIPPING_THRESHOLD

  return (
    <div className="flex flex-col gap-6 rounded-3xl bg-white p-6 shadow-[0_10px_30px_rgba(0,0,0,0.05)] lg:p-8">
      <h2 className="text-2xl font-semibold text-foreground md:text-3xl">
        Order Summary
      </h2>

      {/* Free shipping progress hint */}
      {amountToFreeShipping > 0 && (
        <div className="rounded-2xl bg-primary/5 px-4 py-3 text-sm text-foreground">
          <p>
            Add{" "}
            <span className="font-semibold">
              ${amountToFreeShipping.toFixed(2)}
            </span>{" "}
            more for free shipping.
          </p>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-primary/10">
            <div
              className="h-full rounded-full bg-primary transition-all duration-300"
              style={{
                width: `${Math.min(100, (subtotal / FREE_SHIPPING_THRESHOLD) * 100)}%`,
              }}
            />
          </div>
        </div>
      )}
      {earnedFreeShipping && (
        <div className="rounded-2xl bg-primary/5 px-4 py-3 text-sm font-medium text-foreground">
          You&rsquo;ve unlocked free shipping.
        </div>
      )}

      {/* Line items */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            Subtotal ({totalItems} {totalItems === 1 ? "item" : "items"})
          </span>
          <span className="text-sm font-medium text-foreground">
            ${subtotal.toFixed(2)}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            Shipping ({shippingLabel})
          </span>
          <span className="text-sm font-medium text-foreground">
            {shipping === 0 ? "FREE" : `$${shipping.toFixed(2)}`}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            Service Fee ({(SERVICE_FEE_RATE * 100).toFixed(0)}%)
          </span>
          <span className="text-sm font-medium text-foreground">
            ${serviceFee.toFixed(2)}
          </span>
        </div>

        <div className="h-px bg-gray-200" />

        <div className="flex items-center justify-between pt-2">
          <span className="text-lg font-semibold text-foreground">Total</span>
          <span className="text-2xl font-semibold text-foreground">
            ${total.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Checkout Button */}
      {showCheckoutButton && (
        <a
          href="/checkout"
          className="flex h-14 w-full items-center justify-center rounded-2xl bg-primary text-sm font-medium text-white transition-all duration-300 hover:brightness-110 active:scale-95 disabled:pointer-events-none disabled:opacity-40 shadow-[0_10px_30px_rgba(0,0,0,0.05)] hover:shadow-[0_20px_40px_rgba(0,0,0,0.08)] min-h-[48px]"
        >
          Proceed to Checkout
        </a>
      )}

      {/* Trust indicators */}
      <div className="flex items-center justify-center gap-6 border-t border-gray-200 pt-5">
        <div className="flex items-center gap-1.5">
          <FlaskConical className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Lab Tested
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <Shield className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Secure
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <Truck className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Shipping
          </span>
        </div>
      </div>
    </div>
  )
}
