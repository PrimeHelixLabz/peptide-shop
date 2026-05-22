"use client"

import Link from "next/link"
import { ArrowRight, ShoppingBag } from "lucide-react"
import { useCart } from "@/lib/cart-context"
import { CartItemRow } from "@/components/cart-item"
import { OrderSummary } from "@/components/order-summary"
import { EmptyState } from "@/components/common/empty-state"
import { DiscountCodeInput } from "@/components/discount-code-input"

export function CartView() {
  const { items, clearCart, totalItems } = useCart()

  if (items.length === 0) {
    return (
      <EmptyState
        icon={ShoppingBag}
        title="Your cart is empty"
        description="Browse our catalog to find the right peptides for your research."
        action={{
          label: "Continue Shopping",
          href: "/shop",
        }}
      />
    )
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_380px] lg:gap-12">
      {/* Cart Items */}
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between pb-2">
          <span className="text-sm text-muted-foreground">
            {totalItems} {totalItems === 1 ? "item" : "items"} in your cart
          </span>
          <button
            onClick={clearCart}
            className="text-xs font-medium text-muted-foreground underline underline-offset-4 transition-colors hover:text-foreground"
          >
            Clear all
          </button>
        </div>

        <div className="flex flex-col gap-4">
          {items.map((item) => (
            <CartItemRow key={`${item.product.id}-${item.variantId || 'none'}`} item={item} />
          ))}
        </div>

        {/* Discount code */}
        <div className="mt-2">
          <DiscountCodeInput />
        </div>

        {/* Continue Shopping */}
        <Link
          href="/shop"
          className="mt-2 inline-flex items-center gap-1.5 self-start text-sm font-medium text-foreground transition-colors hover:text-muted-foreground"
        >
          <ArrowRight className="h-3.5 w-3.5 rotate-180" />
          Continue Shopping
        </Link>
      </div>

      {/* Order Summary */}
      <div className="lg:sticky lg:top-28 lg:self-start">
        <OrderSummary />
      </div>
    </div>
  )
}
