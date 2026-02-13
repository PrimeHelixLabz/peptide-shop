"use client"

import { cn } from "@/lib/utils"
import { ProductCard, type Product } from "@/components/product-card"

interface ProductGridProps {
  products: Product[]
  columns?: 1 | 2 | 3 | 4
  className?: string
  emptyMessage?: string
}

const gridClasses = {
  1: "grid-cols-1",
  2: "grid-cols-1 md:grid-cols-2",
  3: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
  4: "grid-cols-1 md:grid-cols-2 lg:grid-cols-4",
}

export function ProductGrid({
  products,
  columns = 3,
  className,
  emptyMessage = "No products found",
}: ProductGridProps) {
  if (products.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div
      className={cn(
        "grid gap-6",
        gridClasses[columns],
        className
      )}
    >
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  )
}
