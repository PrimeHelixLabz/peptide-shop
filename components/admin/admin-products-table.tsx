"use client"

import { useState, useMemo } from "react"
import Image from "next/image"
import Link from "next/link"
import { Search, Pencil, Plus } from "lucide-react"
import type { AdminProduct } from "@/lib/api/admin-utils"
import { getProductImageUrl } from "@/lib/storage/image-utils"

// Re-export type for convenience
export type { AdminProduct } from "@/lib/api/admin-utils"

/* ------------------------------------------------------------------ */
/*  Status badge                                                       */
/* ------------------------------------------------------------------ */

const statusStyles: Record<AdminProduct["status"], string> = {
  Active: "bg-gradient-to-r from-emerald-500 to-green-600 text-white",
  Inactive: "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300",
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function AdminProductsTable({
  products,
}: {
  products: AdminProduct[]
}) {
  const [query, setQuery] = useState("")

  const filtered = useMemo(() => {
    if (!query.trim()) return products
    const q = query.toLowerCase()
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q)
    )
  }, [products, query])

  return (
    <div className="flex flex-col gap-6">
      {/* Toolbar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Search */}
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search products..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-12 w-full rounded-xl bg-white dark:bg-gray-900 border-0 shadow-[0_10px_30px_rgba(0,0,0,0.05)] dark:shadow-[0_10px_30px_rgba(0,0,0,0.3)] pl-11 pr-4 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-emerald-500/20"
            aria-label="Search products"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">
            {filtered.length} of {products.length} products
          </span>
          <Link
            href="/admin/products/new"
            className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-green-600 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_10px_30px_rgba(0,0,0,0.1)] transition-all duration-200 hover:shadow-[0_20px_40px_rgba(0,0,0,0.15)] hover:scale-105"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Add Product</span>
            <span className="sm:hidden">Add</span>
          </Link>
        </div>
      </div>

      {/* Table card */}
      <div className="rounded-3xl bg-white dark:bg-gray-900 shadow-[0_10px_30px_rgba(0,0,0,0.05)] dark:shadow-[0_10px_30px_rgba(0,0,0,0.3)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-border/50">
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Product
                </th>
                <th className="hidden px-6 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground md:table-cell">
                  Category
                </th>
                <th className="hidden px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground lg:table-cell">
                  Purity
                </th>
                <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Price
                </th>
                <th className="hidden px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground sm:table-cell">
                  Stock
                </th>
                <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Status
                </th>
                <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((product) => (
                <tr
                  key={product.id}
                  className="border-b border-border/50 transition-colors last:border-0 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                >
                  {/* Product cell */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-gray-100 dark:bg-gray-800">
                        <Image
                          src={getProductImageUrl(product.image, product.images)}
                          alt={product.name}
                          fill
                          className="object-cover"
                          sizes="48px"
                          unoptimized={getProductImageUrl(product.image, product.images).includes("supabase")}
                        />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">
                          {product.name}
                        </p>
                        <p className="truncate text-xs text-muted-foreground md:hidden">
                          {product.category}
                        </p>
                      </div>
                    </div>
                  </td>

                  {/* Category */}
                  <td className="hidden px-6 py-4 text-sm text-muted-foreground md:table-cell">
                    {product.category}
                  </td>

                  {/* Purity */}
                  <td className="hidden px-6 py-4 text-right text-sm text-muted-foreground lg:table-cell">
                    {product.purity}
                  </td>

                  {/* Price */}
                  <td className="px-6 py-4 text-right text-sm font-semibold text-foreground">
                    ${product.price.toFixed(2)}
                  </td>

                  {/* Stock */}
                  <td className="hidden px-6 py-4 text-right sm:table-cell">
                    <span
                      className={`text-sm font-medium ${
                        product.stock === 0
                          ? "text-destructive"
                          : product.stock < 20
                            ? "text-amber-600 dark:text-amber-400"
                            : "text-foreground"
                      }`}
                    >
                      {product.stock}
                    </span>
                  </td>

                  {/* Status */}
                  <td className="px-6 py-4 text-right">
                    <span
                      className={`inline-block rounded-xl px-3 py-1 text-xs font-semibold uppercase tracking-wider ${statusStyles[product.status]}`}
                    >
                      {product.status}
                    </span>
                  </td>

                  {/* Edit */}
                  <td className="px-6 py-4 text-right">
                    <Link
                      href={`/admin/products/${product.id}/edit`}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-foreground"
                      aria-label={`Edit ${product.name}`}
                    >
                      <Pencil className="h-4 w-4" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Empty state */}
        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-3 px-6 py-16">
            <Search className="h-8 w-8 text-muted-foreground/60" />
            <p className="text-sm text-muted-foreground">
              {query.trim()
                ? <>No products match &ldquo;{query}&rdquo;</>
                : "No products found"}
            </p>
            {query.trim() && (
              <button
                onClick={() => setQuery("")}
                className="text-sm font-medium text-foreground underline underline-offset-4 hover:text-muted-foreground transition-colors"
              >
                Clear search
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
