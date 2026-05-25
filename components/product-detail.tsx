"use client"

import { useState, useRef, useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Minus, Plus, ShoppingCart, Check, FlaskConical, Shield, Truck, ChevronLeft, ChevronRight, Heart } from "lucide-react"
import type { ProductDetail } from "@/lib/products"
import type { ProductRatingSummary } from "@/lib/db/reviews"
import { ReviewSummary } from "@/components/reviews/review-summary"
import { RestockNotifyForm } from "@/components/restock-notify-form"
import { ReconstitutionCalculator } from "@/components/reconstitution-calculator"
import { useCart } from "@/lib/cart-context"
import { useWishlist } from "@/lib/wishlist-context"
import { useAuth } from "@/lib/auth/auth-context"

type TabId = "description" | "coa" | "calculator"

export function ProductDetailView({
  product,
  ratingSummary,
}: {
  product: ProductDetail
  ratingSummary?: ProductRatingSummary
}) {
  const hasCoa = !!product.coaUrl
  const tabs: { id: TabId; label: string }[] = [
    { id: "description", label: "Description" },
    ...(hasCoa ? [{ id: "coa" as TabId, label: "COA" }] : []),
    { id: "calculator", label: "Dosing Calculator" },
  ]
  const [quantity, setQuantity] = useState(1)
  const [activeTab, setActiveTab] = useState<TabId>("description")
  const [added, setAdded] = useState(false)
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)
  const touchStartX = useRef<number | null>(null)
  const touchEndX = useRef<number | null>(null)
  const router = useRouter()
  const { addItem } = useCart()
  const { toggleItem, isInWishlist } = useWishlist()
  const { user } = useAuth()
  const isWishlisted = isInWishlist(product.id)

  // Variant selection - default to first available variant or null
  const variants = product.variants || []
  const defaultVariant = variants.length > 0 ? variants[0] : null
  const [selectedVariant, setSelectedVariant] = useState<typeof defaultVariant>(defaultVariant)

  // Images are stored per-variant in variant_images table.
  // For the detail view we fetch images when the selected variant changes.
  const [variantImages, setVariantImages] = useState<string[]>([])

  useEffect(() => {
    let cancelled = false

    async function loadVariantImages(variantId: string) {
      try {
        const res = await fetch(`/api/variants/${variantId}/images`, { cache: "no-store" })
        if (!res.ok) throw new Error("Failed to load variant images")
        const data = await res.json()
        const urls: string[] = (data.images || []).map((img: any) => img.imageUrl).filter(Boolean)
        if (!cancelled) setVariantImages(urls)
      } catch {
        if (!cancelled) setVariantImages([])
      }
    }

    if (selectedVariant?.id) {
      loadVariantImages(selectedVariant.id)
    } else {
      setVariantImages([])
    }

    return () => {
      cancelled = true
    }
  }, [selectedVariant?.id])

  const images =
    variantImages.length > 0
      ? variantImages
      : (product.images && product.images.length > 0
          ? product.images
          : (product.image ? [product.image] : []))
  const currentImage = images[selectedImageIndex] || "/placeholder.svg"

  // Reset image index and quantity when variant changes
  useEffect(() => {
    setSelectedImageIndex(0)
    setQuantity(1)
  }, [selectedVariant?.id])

  // Get display price - use variant price if selected, otherwise product price
  const displayPrice = selectedVariant ? selectedVariant.price : product.price
  
  // Get stock status - use variant stock if selected, otherwise product stock
  const displayInStock = selectedVariant ? selectedVariant.inStock : product.inStock
  const displayStock = selectedVariant ? (selectedVariant.stock ?? 0) : 0

  // Touch handlers for swipe navigation
  const minSwipeDistance = 50

  const onTouchStart = (e: React.TouchEvent) => {
    touchEndX.current = null
    touchStartX.current = e.targetTouches[0].clientX
  }

  const onTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX
  }

  const onTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current || images.length <= 1) return
    
    const distance = touchStartX.current - touchEndX.current
    const isLeftSwipe = distance > minSwipeDistance
    const isRightSwipe = distance < -minSwipeDistance

    if (isLeftSwipe) {
      setSelectedImageIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1))
    }
    if (isRightSwipe) {
      setSelectedImageIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1))
    }
  }

  // Helper to get specification value
  const getSpec = (key: string): string | number | undefined => {
    return product.specifications?.[key]
  }

  const purity = getSpec("purity")
  const weight = getSpec("weight")
  const form = getSpec("form")
  const sequence = getSpec("sequence")

  function handleAddToCart() {
    if (!user) {
      router.push(`/signin?redirect=/shop/${product.slug}`)
      return
    }
    if (!selectedVariant) return
    const productToAdd = {
      ...product,
      price: displayPrice,
      inStock: displayInStock,
    }
    addItem(productToAdd, quantity, selectedVariant.id)
    setAdded(true)
    setTimeout(() => setAdded(false), 2500)
  }

  function incrementQuantity() {
    setQuantity((prev) => Math.min(prev + 1, displayStock))
  }

  function decrementQuantity() {
    setQuantity((prev) => Math.max(prev - 1, 1))
  }

  // Process HTML to replace &nbsp; with regular spaces for proper word wrapping
  // This allows words to wrap naturally while preserving formatting
  const processHtmlForWrapping = (html: string): string => {
    if (!html) return ""
    return html
      .replace(/&nbsp;/g, " ")
      // The product name is the page's canonical <h1>. Admins can insert
      // <h1> via the Quill editor, which trips Bing's "multiple H1" SEO
      // check — demote any description-level h1s to h2.
      .replace(/<(\/?)h1(\s|>)/gi, "<$1h2$2")
  }

  // const descriptionHtml = processHtmlForWrapping(product.longDescription || product.description || "")
  const descriptionHtml = processHtmlForWrapping(product.longDescription || "")

  const tabContent: Record<TabId, string> = {
    description: descriptionHtml,
    coa: "Certificate of Analysis (COA) images are provided for this product.",
    calculator: "",
  }

  return (
    <div className="flex flex-col gap-12 lg:gap-16">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm">
        <Link
          href="/"
          className="text-muted-foreground transition-colors hover:text-foreground"
        >
          Home
        </Link>
        <span className="text-muted-foreground/50">/</span>
        <Link
          href="/shop"
          className="text-muted-foreground transition-colors hover:text-foreground"
        >
          Shop
        </Link>
        <span className="text-muted-foreground/50">/</span>
        <span className="text-foreground">{product.name}</span>
      </nav>

      {/* Product Hero: Image + Info */}
      <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
        {/* Image Gallery */}
        <div className="flex flex-col gap-4 lg:flex-row-reverse lg:gap-6">
          {/* Main Image */}
          <div 
            className="relative aspect-square w-full overflow-hidden rounded-3xl bg-gray-100 shadow-[0_10px_30px_rgba(0,0,0,0.05)] lg:flex-1 touch-pan-y"
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
          >
            <Image
              src={currentImage}
              alt={`${product.name} peptide vial - Image ${selectedImageIndex + 1} of ${images.length}`}
              fill
              priority
              className="object-contain transition-opacity duration-300"
              sizes="(max-width: 1024px) 100vw, 50vw"
            />
            {!displayInStock && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/70 backdrop-blur-sm rounded-3xl">
                <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                  Out of Stock
                </span>
              </div>
            )}
            {product.category && (
              <div className="absolute left-4 top-4 z-10">
                <span className="bg-white/90 px-3 py-1.5 text-[10px] font-medium uppercase tracking-widest text-muted-foreground backdrop-blur-sm rounded-xl">
                  {product.category}
                </span>
              </div>
            )}
            {/* Navigation arrows for multiple images */}
            {images.length > 1 && (
              <>
                <button
                  onClick={() => setSelectedImageIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1))}
                  className="absolute left-4 top-1/2 -translate-y-1/2 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 backdrop-blur-sm text-foreground transition-all duration-300 hover:bg-white hover:scale-110 active:scale-95 shadow-[0_10px_30px_rgba(0,0,0,0.1)] min-h-[48px] min-w-[48px]"
                  aria-label="Previous image"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  onClick={() => setSelectedImageIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1))}
                  className="absolute right-4 top-1/2 -translate-y-1/2 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 backdrop-blur-sm text-foreground transition-all duration-300 hover:bg-white hover:scale-110 active:scale-95 shadow-[0_10px_30px_rgba(0,0,0,0.1)] min-h-[48px] min-w-[48px]"
                  aria-label="Next image"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </>
            )}
            {/* Image indicator dots - Mobile only */}
            {images.length > 1 && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex gap-2 lg:hidden">
                {images.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImageIndex(index)}
                    className={`h-2 rounded-full transition-all duration-300 ${
                      selectedImageIndex === index
                        ? "w-8 bg-white"
                        : "w-2 bg-white/50 hover:bg-white/75"
                    }`}
                    aria-label={`Go to image ${index + 1}`}
                  />
                ))}
              </div>
            )}
            {/* Image counter */}
            {images.length > 1 && (
              <div className="absolute right-4 bottom-4 z-10 hidden lg:block">
                <span className="bg-black/50 backdrop-blur-sm px-3 py-1.5 text-xs font-medium text-white rounded-xl">
                  {selectedImageIndex + 1} / {images.length}
                </span>
              </div>
            )}
          </div>
          
          {/* Thumbnail Gallery - Always visible if multiple images */}
          {images.length > 1 && (
            <div className="hidden lg:flex p-2 gap-3 overflow-x-auto pb-2 scrollbar-hide lg:flex-col lg:overflow-x-visible lg:overflow-y-auto lg:max-h-[600px] lg:pb-0 lg:scrollbar-thin lg:scrollbar-thumb-gray-300 lg:scrollbar-track-transparent">
              {images.map((img, index) => (
                <div
                  key={index}
                  className={`relative shrink-0 transition-all duration-300 ${
                    selectedImageIndex === index
                      ? "ring-2 ring-primary ring-offset-2"
                      : ""
                  }`}
                  style={{ minWidth: '80px', width: '80px' }}
                >
                  <button
                    onClick={() => setSelectedImageIndex(index)}
                    className="relative aspect-square w-full overflow-hidden bg-gray-100 border border-gray-200 transition-all duration-300 hover:opacity-75"
                    aria-label={`View image ${index + 1} of ${images.length}`}
                  >
                    <Image
                      src={img}
                      alt={`${product.name} thumbnail ${index + 1}`}
                      fill
                      className="object-contain"
                      sizes="80px"
                    />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Product Info */}
        <div className="flex flex-col gap-6 rounded-3xl bg-white p-8 shadow-[0_10px_30px_rgba(0,0,0,0.05)]">
          {/* Name & Purity */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex flex-col gap-2 flex-1">
              {purity && (
                <span className="text-xs font-medium uppercase tracking-[0.3em] text-muted-foreground">
                  {purity} Purity
                </span>
              )}
              <h1 className="text-4xl font-semibold tracking-tight text-foreground md:text-5xl text-balance">
                {product.name}
              </h1>
              {ratingSummary && ratingSummary.count > 0 && (
                <a
                  href="#reviews"
                  className="mt-1 inline-flex items-center gap-1.5 text-xs hover:underline"
                  aria-label={`Read ${ratingSummary.count} reviews`}
                >
                  <ReviewSummary
                    count={ratingSummary.count}
                    average={ratingSummary.average}
                    size="sm"
                  />
                  <span className="text-muted-foreground">&middot; Read reviews</span>
                </a>
              )}
            </div>
            <button
              onClick={() => {
                if (!user) { router.push(`/signin?redirect=/shop/${product.slug}`); return }
                toggleItem(product)
              }}
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gray-100 text-muted-foreground transition-all duration-300 hover:bg-gray-200 hover:scale-110 active:scale-95 min-h-[48px] min-w-[48px]"
              aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
            >
              <Heart
                className={`h-5 w-5 transition-all duration-300 ${
                  isWishlisted
                    ? "fill-red-500 text-red-500"
                    : "text-muted-foreground hover:text-red-500"
                }`}
              />
            </button>
          </div>

          {/* Variant Selector */}
          {variants.length > 0 && (
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-foreground">
                Strength
              </label>
              <div className="flex flex-wrap gap-2">
                {variants.map((variant) => (
                  <button
                    key={variant.id}
                    onClick={() => setSelectedVariant(variant)}
                    disabled={!variant.inStock}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 min-h-[48px] ${
                      selectedVariant?.id === variant.id
                        ? "bg-primary text-white shadow-md"
                        : variant.inStock
                        ? "bg-gray-100 text-foreground hover:bg-gray-200"
                        : "bg-gray-50 text-muted-foreground opacity-50 cursor-not-allowed"
                    }`}
                    aria-label={`Select ${variant.sku} strength`}
                  >
                    {variant.sku}
                    {!variant.inStock && " (Out of Stock)"}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Price */}
          <div className="flex items-baseline gap-3">
            <span className="text-3xl font-semibold text-foreground">
              ${displayPrice.toFixed(2)}
            </span>
            <span className="text-sm text-muted-foreground">per vial</span>
          </div>

          {/* Short Description - DISABLED */}
          {/* <p className="max-w-lg text-base leading-relaxed text-muted-foreground">
            {product.description}
          </p> */}

          {/* Specs */}
          {product.specifications && Object.keys(product.specifications).length > 0 && (
            <div className="rounded-2xl bg-gray-50 p-5">
              {/* Mobile: Grid layout without separators */}
              <div className="grid grid-cols-2 gap-4 sm:hidden">
                {Object.entries(product.specifications)
                  .filter(([key]) => key !== "sequence")
                  .map(([key, value]) => (
                    <div key={key} className="flex flex-col gap-0.5">
                      <span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
                        {key.charAt(0).toUpperCase() + key.slice(1)}
                      </span>
                      <span className="text-sm font-semibold text-foreground">
                        {String(value)}
                      </span>
                    </div>
                  ))}
                {product.category && (
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
                      Category
                    </span>
                    <span className="text-sm font-semibold text-foreground">
                      {product.category}
                    </span>
                  </div>
                )}
              </div>
              
              {/* Desktop: Flex layout with separators */}
              <div className="hidden sm:flex sm:flex-wrap sm:gap-4">
                {Object.entries(product.specifications)
                  .filter(([key]) => key !== "sequence")
                  .map(([key, value], index, array) => {
                    const isLast = index === array.length - 1 && !product.category
                    return (
                      <div key={key} className="flex items-center gap-4">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
                            {key.charAt(0).toUpperCase() + key.slice(1)}
                          </span>
                          <span className="text-sm font-semibold text-foreground">
                            {String(value)}
                          </span>
                        </div>
                        {!isLast && (
                          <div className="h-auto w-px bg-gray-200" />
                        )}
                      </div>
                    )
                  })}
                {product.category && (
                  <>
                    {Object.keys(product.specifications).filter((k) => k !== "sequence").length > 0 && (
                      <div className="h-auto w-px bg-gray-200" />
                    )}
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
                        Category
                      </span>
                      <span className="text-sm font-semibold text-foreground">
                        {product.category}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Stock Info */}
          {displayInStock && (
            <div className="flex items-center gap-2">
              <span className={`text-sm font-medium ${displayStock <= 5 ? "text-amber-600" : "text-green-600"}`}>
                {displayStock} in stock
              </span>
            </div>
          )}

          {/* Quantity & Add to Cart */}
          <div className="flex flex-col gap-4 justify-around lg:justify-between sm:flex-row sm:items-center sm:gap-4">
            {/* Quantity Selector */}
            <div className="flex justify-center items-center rounded-xl border-0 bg-gray-50 overflow-hidden">
              <button
                onClick={decrementQuantity}
                disabled={quantity <= 1}
                className="flex h-12 w-12 items-center justify-center text-muted-foreground transition-colors hover:bg-gray-200 hover:text-foreground disabled:opacity-40 min-h-[48px] min-w-[48px]"
                aria-label="Decrease quantity"
              >
                <Minus className="h-4 w-4" />
              </button>
              <span
                className="flex h-12 w-14 items-center justify-center text-sm font-semibold text-foreground"
                aria-live="polite"
                aria-label={`Quantity: ${quantity}`}
              >
                {quantity}
              </span>
              <button
                onClick={incrementQuantity}
                disabled={quantity >= displayStock}
                className="flex h-12 w-12 items-center justify-center text-muted-foreground transition-colors hover:bg-gray-200 hover:text-foreground disabled:opacity-40 min-h-[48px] min-w-[48px]"
                aria-label="Increase quantity"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>

            {/* Add to Cart */}
            <button
              onClick={handleAddToCart}
              disabled={!displayInStock || added}
              className="flex h-12 flex-1 items-center justify-center gap-2.5 rounded-2xl bg-primary px-8 text-sm font-medium text-white transition-all duration-300 hover:brightness-110 active:scale-95 disabled:pointer-events-none disabled:opacity-50 sm:max-w-xs shadow-[0_10px_30px_rgba(0,0,0,0.05)] hover:shadow-[0_20px_40px_rgba(0,0,0,0.08)] min-h-[48px]"
              aria-label={`Add ${quantity} ${product.name}${selectedVariant ? ` (${selectedVariant.sku})` : ""} to cart`}
            >
              {added ? (
                <>
                  <Check className="h-4 w-4" />
                  <span>Added to Cart</span>
                </>
              ) : (
                <>
                  <ShoppingCart className="h-4 w-4" />
                  <span>Add to Cart{quantity > 1 ? ` (${quantity})` : ""}</span>
                </>
              )}
            </button>
          </div>

          {/* Restock notification — only shown when the currently-selected
              variant is out of stock. Replaces the (disabled) Add-to-Cart
              experience with a way to recover the lost sale. */}
          {!displayInStock && selectedVariant && (
            <RestockNotifyForm
              variantId={selectedVariant.id}
              variantSku={selectedVariant.sku ?? selectedVariant.name ?? "this strength"}
              defaultEmail={user?.email}
            />
          )}

          {/* Trust Badges */}
          <div className="grid grid-cols-3 gap-3 rounded-2xl bg-gray-50 p-4">
            <div className="flex flex-col items-center gap-1.5">
              <FlaskConical className="h-4 w-4 text-blue-600" />
              <span className="text-center text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                HPLC Tested
              </span>
            </div>
            <div className="flex flex-col items-center gap-1.5 border-x border-gray-200">
              <Shield className="h-4 w-4 text-blue-600" />
              <span className="text-center text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                Secure Checkout
              </span>
            </div>
            <div className="flex flex-col items-center gap-1.5">
              <Truck className="h-4 w-4 text-blue-600" />
              <span className="text-center text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                Shipping
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Section */}
      <section className="flex flex-col gap-0 rounded-3xl bg-white shadow-[0_10px_30px_rgba(0,0,0,0.05)] overflow-hidden">
        {/* Tab Headers */}
        <div
          className="flex border-b border-gray-200 bg-gray-50"
          role="tablist"
          aria-label="Product information tabs"
        >
          {tabs.map((tab) => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={activeTab === tab.id}
              aria-controls={`panel-${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
              className={`relative px-6 py-4 text-sm font-medium transition-colors min-h-[48px] ${
                activeTab === tab.id
                  ? "text-foreground bg-white"
                  : "text-muted-foreground hover:text-foreground hover:bg-white/50"
              }`}
            >
              {tab.label}
              {activeTab === tab.id && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
              )}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {tabs.map((tab) => (
          <div
            key={tab.id}
            id={`panel-${tab.id}`}
            role="tabpanel"
            aria-labelledby={tab.id}
            hidden={activeTab !== tab.id}
            className="p-8 overflow-x-hidden"
          >
            {tab.id === "description" && (
              <div
                className="ql-editor-content max-w-3xl w-full"
                // Admin-authored content
                dangerouslySetInnerHTML={{ __html: descriptionHtml }}
              />
            )}

            {tab.id === "coa" && hasCoa && (
              <div className="max-w-3xl space-y-4">
                <p className="text-sm leading-relaxed text-muted-foreground lg:text-base lg:leading-relaxed">
                  {tabContent.coa}
                </p>
                <div className="overflow-hidden rounded-2xl border border-gray-200 bg-gray-50">
                  <div className="relative w-full max-h-[800px]">
                    <Image
                      src={product.coaUrl!}
                      alt={`${product.name} Certificate of Analysis`}
                      width={1200}
                      height={1600}
                      className="h-auto w-full object-contain bg-white"
                    />
                  </div>
                </div>
              </div>
            )}
            {tab.id === "description" && sequence && (
              <div className="mt-6 flex flex-col gap-1.5 rounded-2xl bg-gray-50 border-t border-gray-200 pt-6 p-4">
                <span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
                  Amino Acid Sequence
                </span>
                <code className="text-xs font-mono leading-relaxed text-foreground/70 break-all">
                  {String(sequence)}
                </code>
              </div>
            )}

            {tab.id === "calculator" && (
              <ReconstitutionCalculator
                productName={product.name}
                variantSku={selectedVariant?.sku}
              />
            )}
          </div>
        ))}
      </section>
    </div>
  )
}
