"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ShoppingCart, Check, Heart } from "lucide-react"
import { useCart } from "@/lib/cart-context"
import { useWishlist } from "@/lib/wishlist-context"
import { useAuth } from "@/lib/auth/auth-context"
import { Badge } from "@/components/common/badge"
import { PriceDisplay } from "@/components/common/price-display"
import { getProductImageUrl } from "@/lib/storage/image-utils"
import { ReviewSummary } from "@/components/reviews/review-summary"
import type { ProductRatingSummary } from "@/lib/db/reviews"

export interface Product {
  id: string
  slug: string
  name: string
  price: number
  description: string
  thumbnailUrl?: string
  // Optional Certificate of Analysis image URL (for detail COA tab)
  coaUrl?: string
  image: string // Keep for backward compatibility, will use first image from images if available
  images?: string[] // Array of image URLs
  category?: string
  inStock: boolean
  specifications?: Record<string, string | number> // Dynamic specifications (e.g., { purity: "99.1%", weight: "5mg", form: "Lyophilized" })
  variants?: Array<{
    id: string
    name: string
    price: number
    inStock: boolean
    stock: number
    sku?: string
    image?: string // legacy
    images?: string[] // legacy
  }> // Product variants
  // Aggregated review counts/average. Optional — not all callers compute it.
  ratingSummary?: ProductRatingSummary
}

export function ProductCard({ product }: { product: Product }) {
  const [added, setAdded] = useState(false)
  const router = useRouter()
  const { addItem } = useCart()
  const { toggleItem, isInWishlist } = useWishlist()
  const { user } = useAuth()
  const isWishlisted = isInWishlist(product.id)

  function handleAddToCart(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (!user) { router.push(`/signin?redirect=/shop/${product.slug}`); return }
    // Multi-variant products require a deliberate selection — send the user
    // to the detail page rather than guessing.
    if (!product.variants || product.variants.length !== 1) {
      router.push(`/shop/${product.slug}`)
      return
    }
    addItem(product, 1, product.variants[0].id)
    setAdded(true)
    setTimeout(() => setAdded(false), 2000)
  }

  function handleToggleWishlist(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (!user) { router.push(`/signin?redirect=/shop/${product.slug}`); return }
    toggleItem(product)
  }

  return (
    <Link
      href={`/shop/${product.slug}`}
      className="group block"
    >
      <article className="rounded-3xl bg-white p-4 shadow-[0_10px_30px_rgba(0,0,0,0.05)] transition-all duration-300 hover:shadow-[0_20px_40px_rgba(0,0,0,0.08)] hover:scale-[1.02]">
        {/* Image */}
        <div className="relative aspect-square overflow-hidden rounded-2xl bg-gray-100">
          <Image
            src={product.thumbnailUrl || getProductImageUrl(product.image, product.images)}
            alt={`${product.name} peptide vial`}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
            unoptimized={(product.thumbnailUrl || getProductImageUrl(product.image, product.images)).includes("supabase")}
          />
          {!product.inStock && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/70 backdrop-blur-sm rounded-2xl">
              <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                Out of Stock
              </span>
            </div>
          )}
          {product.category && (
            <div className="absolute left-3 top-3">
              <Badge variant="category">{product.category}</Badge>
            </div>
          )}
          <button
            onClick={handleToggleWishlist}
            className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 backdrop-blur-sm text-muted-foreground transition-all duration-300 hover:bg-white hover:scale-110 active:scale-95 min-h-[48px] min-w-[48px]"
            aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
          >
            <Heart
              className={`h-4 w-4 transition-all duration-300 ${
                isWishlisted
                  ? "fill-red-500 text-red-500"
                  : "text-muted-foreground hover:text-red-500"
              }`}
            />
          </button>
        </div>

        {/* Content */}
        <div className="mt-4 space-y-2">
          <h3 className="text-lg font-semibold text-foreground">
            {product.name}
          </h3>
          {product.ratingSummary && product.ratingSummary.count > 0 && (
            <ReviewSummary
              count={product.ratingSummary.count}
              average={product.ratingSummary.average}
              size="sm"
            />
          )}
          {product.variants && product.variants.length > 1 && (
            <p className="text-xs text-muted-foreground">
              {product.variants.length} strength options available
            </p>
          )}
          {product.category && (
            <p className="text-sm text-muted-foreground">
              {product.category}
            </p>
          )}

          {/* Price & CTA */}
          <div className="flex items-center justify-between pt-2">
            <div className="flex flex-col">
              <PriceDisplay price={product.price} size="lg" />
              {product.variants && product.variants.length > 1 && (
                <span className="text-xs text-muted-foreground mt-0.5">
                  From {product.variants[0]?.name || ""}
                </span>
              )}
            </div>
            <button
              onClick={handleAddToCart}
              disabled={!product.inStock || added}
              className="inline-flex items-center gap-2 rounded-2xl bg-primary px-4 py-2 text-sm font-medium text-white transition-all duration-300 hover:brightness-110 active:scale-95 disabled:pointer-events-none disabled:opacity-50 min-h-[48px]"
              aria-label={`Add ${product.name} to cart`}
            >
              {added ? (
                <>
                  <Check className="h-3.5 w-3.5" />
                  Added
                </>
              ) : (
                <>
                  <ShoppingCart className="h-3.5 w-3.5" />
                  Add
                </>
              )}
            </button>
          </div>
        </div>
      </article>
    </Link>
  )
}
