"use client"

import { useWishlist } from "@/lib/wishlist-context"
import { Heart } from "lucide-react"
import { ProductGridList } from "@/components/products/product-grid-list"
import { EmptyState } from "@/components/common/empty-state"

export function WishlistView() {
  const { items } = useWishlist()

  if (items.length === 0) {
    return (
      <EmptyState
        icon={Heart}
        title="Your wishlist is empty"
        description="Start adding products you love to your wishlist."
        action={{
          label: "Browse Products",
          href: "/shop",
        }}
      />
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {items.length} {items.length === 1 ? "item" : "items"} in your wishlist
        </p>
      </div>

      <ProductGridList products={items} columns={3} />
    </div>
  )
}
