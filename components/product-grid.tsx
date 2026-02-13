"use client"

import { useState } from "react"
import { ProductCard } from "@/components/product-card"
import type { ProductDetail } from "@/lib/products"

interface ProductGridProps {
  initialProducts: ProductDetail[]
  initialCategories: string[]
}

export function ProductGrid({ initialProducts, initialCategories }: ProductGridProps) {
  const [activeCategory, setActiveCategory] = useState("All")

  const filtered =
    activeCategory === "All"
      ? initialProducts
      : initialProducts.filter((p) => p.category === activeCategory)

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
        {`Showing ${filtered.length} ${filtered.length === 1 ? "product" : "products"}`}
        {activeCategory !== "All" && (
          <span>{` in ${activeCategory}`}</span>
        )}
      </p>

      {/* Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>

      {filtered.length === 0 && (
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
