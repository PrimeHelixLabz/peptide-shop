"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { ProductCard } from "@/components/product-card"
import type { ProductDetail } from "@/lib/products"
import { SelectBox } from "@/components/common/select-box"

interface ProductGridProps {
  initialProducts: ProductDetail[]
  initialCategories: string[]
}

const PRODUCTS_PER_PAGE = 12
const MAX_FETCH_LIMIT = 100 // matches API safety cap in app/api/products/route.ts
const SHOP_STATE_KEY = "shop-state"

type SortOption = "name_asc" | "name_desc" | "price_asc" | "price_desc" | "date_asc" | "date_desc"

interface SavedShopState {
  category: string
  sort: SortOption
  count: number
  scrollY: number
}

export function ProductGrid({ initialProducts, initialCategories }: ProductGridProps) {
  const [activeCategory, setActiveCategory] = useState("All")
  const [products, setProducts] = useState<ProductDetail[]>(initialProducts)
  const [loading, setLoading] = useState(false)
  const [hasMore, setHasMore] = useState(initialProducts.length === PRODUCTS_PER_PAGE)
  const [offset, setOffset] = useState(initialProducts.length)
  const [initialized, setInitialized] = useState(false)
  const [sortBy, setSortBy] = useState<SortOption>("name_asc")
  const observerTarget = useRef<HTMLDivElement>(null)
  // After init, the change-effect would otherwise fire once with the (possibly
  // restored) category/sort and refetch only 12 — wiping the restored set.
  const skipNextChangeEffect = useRef(true)

  // On mount: read saved state, refetch enough products if needed, restore scroll.
  useEffect(() => {
    if (initialized) return

    let saved: SavedShopState | null = null
    if (typeof window !== "undefined") {
      const stored = sessionStorage.getItem(SHOP_STATE_KEY)
      if (stored) {
        try {
          saved = JSON.parse(stored) as SavedShopState
        } catch {
          saved = null
        }
      }
    }

    const restoreScroll = () => {
      if (!saved || saved.scrollY <= 0) return
      // Two rAFs let the browser lay out the newly rendered products before scrolling.
      const y = saved.scrollY
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          window.scrollTo(0, y)
        })
      })
    }

    const needsRefetch =
      saved !== null &&
      (saved.category !== "All" ||
        saved.sort !== "name_asc" ||
        saved.count > initialProducts.length)

    if (!needsRefetch) {
      setInitialized(true)
      restoreScroll()
      return
    }

    setActiveCategory(saved!.category)
    setSortBy(saved!.sort)

    const fetchCount = Math.min(Math.max(saved!.count, PRODUCTS_PER_PAGE), MAX_FETCH_LIMIT)
    ;(async () => {
      setLoading(true)
      try {
        const params = new URLSearchParams({
          limit: fetchCount.toString(),
          offset: "0",
          sortBy: saved!.sort,
        })
        if (saved!.category !== "All") {
          params.append("category", saved!.category)
        }
        const response = await fetch(`/api/products?${params.toString()}`)
        if (!response.ok) throw new Error("Failed to fetch products")
        const data = await response.json()
        const fetched: ProductDetail[] = data.products || []
        setProducts(fetched)
        setOffset(fetched.length)
        setHasMore(fetched.length >= fetchCount)
      } catch (err) {
        console.error("Error restoring shop state:", err)
      } finally {
        setLoading(false)
        setInitialized(true)
        restoreScroll()
      }
    })()
  }, [initialized, initialProducts.length])

  // Load products when category or sort changes (only after initialization).
  useEffect(() => {
    if (!initialized) return
    if (skipNextChangeEffect.current) {
      skipNextChangeEffect.current = false
      return
    }

    const loadProducts = async () => {
      setLoading(true)
      try {
        const params = new URLSearchParams({
          limit: PRODUCTS_PER_PAGE.toString(),
          offset: "0",
          sortBy,
        })

        if (activeCategory !== "All") {
          params.append("category", activeCategory)
        }

        const response = await fetch(`/api/products?${params.toString()}`)
        if (!response.ok) throw new Error("Failed to fetch products")

        const data = await response.json()
        const fetchedProducts = data.products || []

        setProducts(fetchedProducts)
        setOffset(fetchedProducts.length)
        setHasMore(fetchedProducts.length === PRODUCTS_PER_PAGE)
      } catch (error) {
        console.error("Error loading products:", error)
        setProducts([])
        setHasMore(false)
      } finally {
        setLoading(false)
      }
    }

    loadProducts()
  }, [activeCategory, sortBy, initialized])

  // Persist filter + scroll state for back-navigation restore.
  useEffect(() => {
    if (!initialized) return

    const save = () => {
      const state: SavedShopState = {
        category: activeCategory,
        sort: sortBy,
        count: products.length,
        scrollY: window.scrollY,
      }
      try {
        sessionStorage.setItem(SHOP_STATE_KEY, JSON.stringify(state))
      } catch {
        // sessionStorage may be unavailable (private mode, quota); ignore.
      }
    }

    window.addEventListener("scroll", save, { passive: true })
    window.addEventListener("beforeunload", save)

    return () => {
      save()
      window.removeEventListener("scroll", save)
      window.removeEventListener("beforeunload", save)
    }
  }, [initialized, activeCategory, sortBy, products.length])

  // Load more products
  const loadMoreProducts = useCallback(async () => {
    if (loading || !hasMore) return

    setLoading(true)
    try {
      const params = new URLSearchParams({
        limit: PRODUCTS_PER_PAGE.toString(),
        offset: offset.toString(),
        sortBy,
      })

      if (activeCategory !== "All") {
        params.append("category", activeCategory)
      }

      const response = await fetch(`/api/products?${params.toString()}`)
      if (!response.ok) throw new Error("Failed to fetch products")

      const data = await response.json()
      const newProducts = data.products || []

      if (newProducts.length > 0) {
        setProducts((prev) => [...prev, ...newProducts])
        setOffset((prev) => prev + newProducts.length)
        setHasMore(newProducts.length === PRODUCTS_PER_PAGE)
      } else {
        setHasMore(false)
      }
    } catch (error) {
      console.error("Error loading more products:", error)
      setHasMore(false)
    } finally {
      setLoading(false)
    }
  }, [loading, hasMore, offset, activeCategory, sortBy])


  // Intersection Observer for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          loadMoreProducts()
        }
      },
      { threshold: 0.1 }
    )

    const currentTarget = observerTarget.current
    if (currentTarget) {
      observer.observe(currentTarget)
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget)
      }
    }
  }, [hasMore, loading, loadMoreProducts])

  const sortOptions: { value: SortOption; label: string }[] = [
    { value: "name_asc", label: "Name: A-Z" },
    { value: "name_desc", label: "Name: Z-A" },
    { value: "price_asc", label: "Price: Low to High" },
    { value: "price_desc", label: "Price: High to Low" },
    { value: "date_desc", label: "Newest First" },
    { value: "date_asc", label: "Oldest First" },
  ]

  return (
    <div className="flex flex-col gap-10">
      {/* Category Filter */}
      <div className="flex justify-between">
        <div className="flex flex-1 flex-wrap items-center gap-2" role="tablist" aria-label="Filter by category">
          {initialCategories.map((category) => (
            <button
              key={category}
              role="tab"
              aria-selected={activeCategory === category}
              onClick={() => setActiveCategory(category)}
              className={`rounded-2xl px-4 py-2 text-sm font-medium transition-all duration-300 min-h-[48px] ${activeCategory === category
                  ? "bg-primary text-white shadow-[0_10px_30px_rgba(0,0,0,0.05)]"
                  : "bg-white text-muted-foreground shadow-[0_10px_30px_rgba(0,0,0,0.05)] hover:shadow-[0_20px_40px_rgba(0,0,0,0.08)] hover:text-foreground active:scale-95"
                }`}
            >
              {category}
            </button>
          ))}
        </div>
        {/* Sort Dropdown */}
        {/* <SelectBox
          options={sortOptions}
          value={sortBy}
          onChange={(value) => {
            setSortBy(value as SortOption)
            setCategoryChanged(true) // Trigger reload
          }}
          align="right"
        /> */}
      </div>

      {/* Results Count */}
      <p className="text-sm text-muted-foreground">
        {`Showing ${products.length} ${products.length === 1 ? "product" : "products"}`}
        {activeCategory !== "All" && (
          <span>{` in ${activeCategory}`}</span>
        )}
      </p>

      {/* Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>

      {/* Loading indicator and observer target */}
      {hasMore && (
        <div ref={observerTarget} className="flex justify-center py-8">
          {loading && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
              <span className="text-sm">Loading more products...</span>
            </div>
          )}
        </div>
      )}

      {products.length === 0 && !loading && (
        <div className="flex flex-col items-center gap-3 py-20">
          <p className="text-sm text-muted-foreground">
            No products found in this category.
          </p>
          <button
            onClick={() => setActiveCategory("All")}
            className="text-sm font-medium text-foreground underline underline-offset-4 transition-colors hover:text-muted-foreground"
          >
            View all products
          </button>
        </div>
      )}
    </div>
  )
}
