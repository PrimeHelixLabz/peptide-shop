"use client"

import { useCart } from "@/lib/cart-context"
import { FlaskConical, Shield, Truck } from "lucide-react"

const SHIPPING_RATE = 15
const SHIPPING_LABEL = "USPS Priority"
const SERVICE_FEE_RATE = 0.05

export function OrderSummary() {
  const { subtotal, totalItems } = useCart()

  const serviceFee = subtotal * SERVICE_FEE_RATE
  const total = subtotal + SHIPPING_RATE + serviceFee

  return (
    <div className="flex flex-col gap-6 rounded-3xl bg-white p-6 shadow-[0_10px_30px_rgba(0,0,0,0.05)] lg:p-8">
      <h2 className="text-2xl font-semibold text-foreground md:text-3xl">
        Order Summary
      </h2>

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
            Shipping ({SHIPPING_LABEL})
          </span>
          <span className="text-sm font-medium text-foreground">
            ${SHIPPING_RATE.toFixed(2)}
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
      <a
        href="/checkout"
        className="flex h-14 w-full items-center justify-center rounded-2xl bg-primary text-sm font-medium text-white transition-all duration-300 hover:brightness-110 active:scale-95 disabled:pointer-events-none disabled:opacity-40 shadow-[0_10px_30px_rgba(0,0,0,0.05)] hover:shadow-[0_20px_40px_rgba(0,0,0,0.08)] min-h-[48px]"
      >
        Proceed to Checkout
      </a>

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
