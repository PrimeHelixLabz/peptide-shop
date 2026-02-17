"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { ProductCard } from "@/components/product-card"
import type { ProductDetail } from "@/lib/products"

interface ProductGridProps {
  initialProducts: ProductDetail[]
  initialCategories: string[]
}

const PRODUCTS_PER_PAGE = 12

export function ProductGrid({ initialProducts, initialCategories }: ProductGridProps) {
  const [activeCategory, setActiveCategory] = useState("All")
  const [products, setProducts] = useState<ProductDetail[]>(initialProducts)
  const [loading, setLoading] = useState(false)
  const [hasMore, setHasMore] = useState(initialProducts.length === PRODUCTS_PER_PAGE)
  const [offset, setOffset] = useState(initialProducts.length)
  const [categoryChanged, setCategoryChanged] = useState(false)
  const observerTarget = useRef<HTMLDivElement>(null)

  // Reset pagination when category changes
  useEffect(() => {
    // Skip on initial mount
    if (!categoryChanged) {
      setCategoryChanged(true)
      return
    }

    const loadCategoryProducts = async () => {
      setLoading(true)
      try {
        const params = new URLSearchParams({
          limit: PRODUCTS_PER_PAGE.toString(),
          offset: "0",
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
        console.error("Error loading category products:", error)
        setProducts([])
        setHasMore(false)
      } finally {
        setLoading(false)
      }
    }

    loadCategoryProducts()
  }, [activeCategory, categoryChanged])

  // Load more products
  const loadMoreProducts = useCallback(async () => {
    if (loading || !hasMore) return

    setLoading(true)
    try {
      const params = new URLSearchParams({
        limit: PRODUCTS_PER_PAGE.toString(),
        offset: offset.toString(),
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
  }, [loading, hasMore, offset, activeCategory])

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

  return (
    <div className="flex flex-col gap-10">
      {/* Category Filter */}
      <div className="flex flex-wrap items-center gap-2" role="tablist" aria-label="Filter by category">
        {initialCategories.map((category) => (
          <button
            key={category}
            role="tab"
            aria-selected={activeCategory === category}
            onClick={() => setActiveCategory(category)}
            className={`rounded-2xl px-4 py-2 text-sm font-medium transition-all duration-300 min-h-[48px] ${
              activeCategory === category
                ? "bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-[0_10px_30px_rgba(0,0,0,0.05)]"
                : "bg-white text-muted-foreground shadow-[0_10px_30px_rgba(0,0,0,0.05)] hover:shadow-[0_20px_40px_rgba(0,0,0,0.08)] hover:text-foreground active:scale-95"
            }`}
          >
            {category}
          </button>
        ))}
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
