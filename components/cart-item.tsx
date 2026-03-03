"use client"

import Image from "next/image"
import Link from "next/link"
import { Minus, Plus, X } from "lucide-react"
import { useCart, type CartItem } from "@/lib/cart-context"
import { getProductImageUrl } from "@/lib/storage/image-utils"

export function CartItemRow({ item }: { item: CartItem }) {
  const { updateQuantity, removeItem } = useCart()
  const { product, quantity, variantId } = item
  
  // Get variant info if variantId exists
  const variant = variantId && product.variants
    ? product.variants.find(v => v.id === variantId)
    : null
  
  // Use variant image if available, otherwise product image
  const displayImage = variant?.image || variant?.images?.[0] || product.image
  const displayImages = variant?.images || product.images
  
  // Use variant price if available, otherwise product price
  const displayPrice = variant?.price || product.price
  
  // Display name with variant
  const displayName = variant
    ? `${product.name} (${variant.sku})`
    : product.name

  return (
    <div className="flex gap-5 rounded-3xl bg-white p-4 shadow-[0_10px_30px_rgba(0,0,0,0.05)] transition-all duration-300 sm:gap-6">
      {/* Product Image */}
          <Link
            href={`/shop/${product.slug}`}
            className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl bg-gray-100 sm:h-32 sm:w-32"
          >
        <Image
          src={getProductImageUrl(displayImage, displayImages)}
          alt={displayName}
          fill
          className="object-cover transition-opacity hover:opacity-80"
          sizes="128px"
          unoptimized={getProductImageUrl(displayImage, displayImages).includes("supabase")}
        />
      </Link>

      {/* Details */}
      <div className="flex flex-1 flex-col justify-between gap-3">
        {/* Top row: name + remove */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
                <Link
                  href={`/shop/${product.slug}`}
                  className="text-sm font-semibold text-foreground transition-colors hover:text-muted-foreground sm:text-base"
                >
              {displayName}
            </Link>
            {variant && (
              <span className="text-xs text-muted-foreground">
                Strength: {variant.sku}
              </span>
            )}
            {product.specifications?.purity && (
              <span className="text-xs text-muted-foreground">
                {product.specifications.purity} purity
              </span>
            )}
          </div>
          <button
            onClick={() => removeItem(product.id, variantId)}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-gray-100 hover:text-foreground min-h-[48px] min-w-[48px]"
            aria-label={`Remove ${displayName} from cart`}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Bottom row: quantity + price */}
        <div className="flex items-center justify-between gap-4">
          {/* Quantity selector */}
          <div className="flex items-center rounded-xl border-0 bg-gray-50 overflow-hidden">
            <button
              onClick={() => updateQuantity(product.id, quantity - 1, variantId)}
              className="flex h-10 w-10 items-center justify-center text-muted-foreground transition-colors hover:bg-gray-200 hover:text-foreground disabled:opacity-40 min-h-[48px] min-w-[48px]"
              aria-label="Decrease quantity"
              disabled={quantity <= 1}
            >
              <Minus className="h-3 w-3" />
            </button>
            <span
              className="flex h-10 w-12 items-center justify-center text-sm font-medium text-foreground"
              aria-live="polite"
              aria-label={`Quantity: ${quantity}`}
            >
              {quantity}
            </span>
            <button
              onClick={() => updateQuantity(product.id, quantity + 1, variantId)}
              className="flex h-10 w-10 items-center justify-center text-muted-foreground transition-colors hover:bg-gray-200 hover:text-foreground disabled:opacity-40 min-h-[48px] min-w-[48px]"
              aria-label="Increase quantity"
              disabled={quantity >= 10}
            >
              <Plus className="h-3 w-3" />
            </button>
          </div>

          {/* Price info */}
          <div className="flex flex-col items-end gap-0.5">
            {/* Unit price */}
            <span className="text-xs text-muted-foreground">
              ${displayPrice.toFixed(2)} each
            </span>
            {/* Line total */}
            <span className="text-lg font-semibold text-foreground sm:text-xl">
              ${(displayPrice * quantity).toFixed(2)}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
