"use client"

import { useState, useMemo, useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import { Search, Pencil, Plus, Trash2, ChevronDown, Archive, RefreshCcw } from "lucide-react"
import { toast } from "sonner"
import type { AdminProduct } from "@/lib/api/admin-utils"
import { getProductImageUrl } from "@/lib/storage/image-utils"
import { Pagination } from "./pagination"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/common/status-badge"
import { useScrollRestoration } from "@/hooks/useScrollRestoration"
import { usePersistentTableState } from "@/hooks/usePersistentTableState"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

// Re-export type for convenience
export type { AdminProduct } from "@/lib/api/admin-utils"

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

type StatusFilter = "all" | "Active" | "Inactive"
type ArchivedFilter = "all" | "active" | "archived"

export function AdminProductsTable({
  products: initialProducts,
}: {
  products: AdminProduct[]
}) {
  // Persist scroll position for this admin page
  useScrollRestoration("admin-products-scroll")

  const [tableState, setTableState] = usePersistentTableState("admin-products-table", {
    query: "",
    statusFilter: "all" as StatusFilter,
    categoryFilter: "all",
    archivedFilter: "active" as ArchivedFilter,
    currentPage: 1,
    itemsPerPage: 20,
  })

  const { query, statusFilter, categoryFilter, archivedFilter, currentPage, itemsPerPage } =
    tableState

  const [products, setProducts] = useState(initialProducts)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [productToDelete, setProductToDelete] = useState<AdminProduct | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [sortBy, setSortBy] = useState<"name_asc" | "name_desc" | "price_asc" | "price_desc" | "date_asc" | "date_desc">("name_asc")
  const [syncingStripe, setSyncingStripe] = useState(false)

  // Get unique categories from products
  const categories = useMemo(() => {
    const uniqueCategories = Array.from(new Set(products.map((p) => p.category)))
    return ["all", ...uniqueCategories.sort()]
  }, [products])

  const filtered = useMemo(() => {
    let result = products

    // Filter by archived status
    if (archivedFilter === "active") {
      result = result.filter((p) => !p.isArchived)
    } else if (archivedFilter === "archived") {
      result = result.filter((p) => p.isArchived)
    }

    // Filter by status
    if (statusFilter !== "all") {
      result = result.filter((p) => p.status === statusFilter)
    }

    // Filter by category
    if (categoryFilter !== "all") {
      result = result.filter((p) => p.category === categoryFilter)
    }

    // Filter by search query
    if (query.trim()) {
      const q = query.toLowerCase()
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          p.id.toLowerCase().includes(q)
      )
    }

    // Apply sorting
    const sorted = [...result]
    switch (sortBy) {
      case "name_asc":
        sorted.sort((a, b) => a.name.localeCompare(b.name))
        break
      case "name_desc":
        sorted.sort((a, b) => b.name.localeCompare(a.name))
        break
      case "price_asc":
        sorted.sort((a, b) => a.price - b.price)
        break
      case "price_desc":
        sorted.sort((a, b) => b.price - a.price)
        break
      case "date_asc":
        sorted.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
        break
      case "date_desc":
        sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        break
    }

    return sorted
  }, [products, query, statusFilter, categoryFilter, archivedFilter, sortBy])

  // Reset to page 1 when search or filters change
  useEffect(() => {
    setTableState((prev) => ({ ...prev, currentPage: 1 }))
  }, [query, statusFilter, categoryFilter, archivedFilter, sortBy, setTableState])

  // Sync products when initialProducts changes
  useEffect(() => {
    setProducts(initialProducts)
  }, [initialProducts])

  async function handleDelete(product: AdminProduct) {
    setProductToDelete(product)
    setDeleteDialogOpen(true)
  }

  async function confirmDelete() {
    if (!productToDelete) return

    setDeleting(true)
    try {
      const response = await fetch(`/api/products/${productToDelete.id}`, {
        method: "DELETE",
      })

      if (response.ok) {
        toast.success("Product archived successfully")
        // Update the product to show it's archived instead of removing it
        setProducts((prev) =>
          prev.map((p) =>
            p.id === productToDelete.id ? { ...p, isArchived: true, status: "Inactive" as const } : p
          )
        )
        setDeleteDialogOpen(false)
        setProductToDelete(null)
      } else {
        const error = await response.json()
        toast.error("Failed to archive product", {
          description: error.error || "An unexpected error occurred",
        })
      }
    } catch (error) {
      console.error("Error archiving product:", error)
      toast.error("Failed to archive product", {
        description: "An unexpected error occurred. Please try again.",
      })
    } finally {
      setDeleting(false)
    }
  }

  async function handleSyncAllToStripe() {
    setSyncingStripe(true)
    try {
      const response = await fetch("/api/stripe/sync-product/all", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Failed to sync products with Stripe")
      }

      const total = Array.isArray(result.results) ? result.results.length : 0
      const synced = Array.isArray(result.results)
        ? result.results.filter((r: any) => r.synced).length
        : 0

      toast.success("Stripe sync completed", {
        description:
          total > 0
            ? `${synced} of ${total} products synced to Stripe.`
            : "No products to sync.",
      })
    } catch (error) {
      console.error("Stripe bulk sync error:", error)
      toast.error("Failed to sync products with Stripe", {
        description:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred. Please check your Stripe configuration and try again.",
      })
    } finally {
      setSyncingStripe(false)
    }
  }

  // Paginate filtered results
  const paginated = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    const end = start + itemsPerPage
    return filtered.slice(start, end)
  }, [filtered, currentPage, itemsPerPage])

  const totalPages = Math.ceil(filtered.length / itemsPerPage)

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
            onChange={(e) =>
              setTableState((prev) => ({
                ...prev,
                query: e.target.value,
              }))
            }
            className="h-12 w-full rounded-xl bg-white dark:bg-gray-900 border-0 shadow-[0_10px_30px_rgba(0,0,0,0.05)] dark:shadow-[0_10px_30px_rgba(0,0,0,0.3)] pl-11 pr-4 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/20"
            aria-label="Search products"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={handleSyncAllToStripe}
            disabled={syncingStripe}
          >
            <RefreshCcw className="h-4 w-4 mr-1" />
            <span className="hidden sm:inline">
              {syncingStripe ? "Syncing…" : "Sync to Stripe"}
            </span>
            <span className="sm:hidden">
              {syncingStripe ? "Sync…" : "Stripe"}
            </span>
          </Button>
          <Button asChild>
            <Link href="/admin/products/new">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Add Product</span>
              <span className="sm:hidden">Add</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Archived Filter */}
        <div className="relative">
          <select
            value={archivedFilter}
            onChange={(e) =>
              setTableState((prev) => ({
                ...prev,
                archivedFilter: e.target.value as ArchivedFilter,
              }))
            }
            className="h-12 appearance-none rounded-xl bg-background border-0 shadow-[0_10px_30px_rgba(0,0,0,0.05)] dark:shadow-[0_10px_30px_rgba(0,0,0,0.3)] pl-4 pr-10 text-sm text-foreground outline-none focus:ring-2 focus:ring-brand-primary/20"
            aria-label="Filter by archived status"
          >
            <option value="active">Active Products</option>
            <option value="archived">Archived Products</option>
            <option value="all">All Products</option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        </div>

        {/* Status Filter */}
        <div className="relative">
          <select
            value={statusFilter}
            onChange={(e) =>
              setTableState((prev) => ({
                ...prev,
                statusFilter: e.target.value as StatusFilter,
              }))
            }
            className="h-12 appearance-none rounded-xl bg-background border-0 shadow-[0_10px_30px_rgba(0,0,0,0.05)] dark:shadow-[0_10px_30px_rgba(0,0,0,0.3)] pl-4 pr-10 text-sm text-foreground outline-none focus:ring-2 focus:ring-brand-primary/20"
            aria-label="Filter by status"
          >
            <option value="all">All Status</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        </div>

        {/* Category Filter */}
        <div className="relative">
          <select
            value={categoryFilter}
            onChange={(e) =>
              setTableState((prev) => ({
                ...prev,
                categoryFilter: e.target.value,
              }))
            }
            className="h-12 appearance-none rounded-xl bg-background border-0 shadow-[0_10px_30px_rgba(0,0,0,0.05)] dark:shadow-[0_10px_30px_rgba(0,0,0,0.3)] pl-4 pr-10 text-sm text-foreground outline-none focus:ring-2 focus:ring-brand-primary/20"
            aria-label="Filter by category"
          >
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat === "all" ? "All Categories" : cat}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        </div>

        {/* Sort */}
        {/* <div className="relative">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="h-12 appearance-none rounded-xl bg-background border-0 shadow-[0_10px_30px_rgba(0,0,0,0.05)] dark:shadow-[0_10px_30px_rgba(0,0,0,0.3)] pl-4 pr-10 text-sm text-foreground outline-none focus:ring-2 focus:ring-brand-primary/20"
            aria-label="Sort products"
          >
            <option value="name_asc">Name: A-Z</option>
            <option value="name_desc">Name: Z-A</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
            <option value="date_desc">Newest First</option>
            <option value="date_asc">Oldest First</option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        </div> */}
      </div>

      {/* Results count */}
      <div className="ml-auto text-sm text-muted-foreground">
        {filtered.length} {filtered.length === 1 ? "product" : "products"}
        {filtered.length !== products.length && ` of ${products.length}`}
      </div>

      {/* Table card */}
      <div className="rounded-3xl bg-card text-card-foreground shadow-[0_10px_30px_rgba(0,0,0,0.05)] dark:shadow-[0_10px_30px_rgba(0,0,0,0.3)] overflow-hidden">
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
              {paginated.map((product) => (
                <tr
                  key={product.id}
                  className="border-b border-border/50 transition-colors last:border-0 hover:bg-accent"
                >
                  {/* Product cell */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-gray-100 dark:bg-gray-800">
                        <Image
                          src={getProductImageUrl(product.image)}
                          alt={product.name}
                          fill
                          className="object-cover"
                          sizes="48px"
                          unoptimized={true}
                          onError={(e) => {
                            // Fallback to placeholder if image fails to load
                            const target = e.target as HTMLImageElement
                            if (!target.src.startsWith("data:")) {
                              target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400' viewBox='0 0 400 400'%3E%3Crect fill='%23f3f4f6' width='400' height='400'/%3E%3Ctext fill='%239ca3af' font-family='sans-serif' font-size='18' x='50%25' y='50%25' text-anchor='middle' dominant-baseline='middle'%3ENo Image%3C/text%3E%3C/svg%3E"
                            }
                          }}
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
                      className={`text-sm font-medium ${product.stock === 0
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
                    <div className="flex items-center justify-end gap-2">
                      {product.isArchived && (
                        <StatusBadge variant="neutral" className="inline-flex items-center gap-1">
                          <Archive className="h-3 w-3" />
                          Archived
                        </StatusBadge>
                      )}
                      <StatusBadge variant={product.status === "Active" ? "success" : "neutral"}>
                        {product.status}
                      </StatusBadge>
                    </div>
                  </td>

                  {/* Actions */}
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/admin/products/${product.id}/edit`}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-foreground"
                        aria-label={`Edit ${product.name}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </Link>
                      <button
                        onClick={() => handleDelete(product)}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400"
                        aria-label={`Delete ${product.name}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {filtered.length > 0 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={(page) =>
              setTableState((prev) => ({
                ...prev,
                currentPage: page,
              }))
            }
            itemsPerPage={itemsPerPage}
            totalItems={filtered.length}
            onItemsPerPageChange={(newItemsPerPage) =>
              setTableState((prev) => ({
                ...prev,
                itemsPerPage: newItemsPerPage,
                currentPage: 1,
              }))
            }
          />
        )}

        {/* Empty state */}
        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-3 px-6 py-16">
            <Search className="h-8 w-8 text-muted-foreground/60" />
            <p className="text-sm text-muted-foreground">
              {query.trim()
                ? <>No products match &ldquo;{query}&rdquo;</>
                : "No products found"}
            </p>
            {(query.trim() || statusFilter !== "all" || categoryFilter !== "all" || archivedFilter !== "active") && (
              <button
                onClick={() => {
                  setTableState((prev) => ({
                    ...prev,
                    query: "",
                    statusFilter: "all",
                    categoryFilter: "all",
                    archivedFilter: "active",
                    currentPage: 1,
                  }))
                }}
                className="text-sm font-medium text-foreground underline underline-offset-4 hover:text-muted-foreground transition-colors"
              >
                Clear filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="rounded-3xl bg-white dark:bg-gray-900 shadow-[0_10px_30px_rgba(0,0,0,0.05)] dark:shadow-[0_10px_30px_rgba(0,0,0,0.3)] border-0">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-bold text-foreground">
              Archive Product
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-muted-foreground">
              Are you sure you want to archive <strong>{productToDelete?.name}</strong>? The product will be hidden from the store but will remain in the database to preserve order history. You can restore it later if needed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <AlertDialogCancel
              disabled={deleting}
              className="rounded-2xl border border-gray-300 dark:border-gray-700 px-5 py-2.5 text-sm font-semibold text-muted-foreground transition-all duration-200 hover:border-foreground hover:text-foreground hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deleting}
              className="rounded-2xl bg-destructive text-destructive-foreground hover:bg-destructive/90 px-5 py-2.5 text-sm font-semibold shadow-[0_10px_30px_rgba(0,0,0,0.1)] transition-all duration-200 hover:shadow-[0_20px_40px_rgba(0,0,0,0.15)] hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {deleting ? "Archiving..." : "Archive Product"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
