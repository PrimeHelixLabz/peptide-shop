"use client"

import { useState, useMemo, useEffect } from "react"
import {
  Search,
  Users,
  UserCheck,
  UserPlus,
  Repeat,
  DollarSign,
  ShoppingCart,
  TrendingUp,
  ChevronDown,
} from "lucide-react"
import { Pagination } from "./pagination"
import { StatCard, type StatCardData } from "./stat-card"
import { useScrollRestoration } from "@/hooks/useScrollRestoration"
import { usePersistentTableState } from "@/hooks/usePersistentTableState"

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface CustomerRow {
  id: string
  name: string
  email: string
  phone: string | null
  role: string
  avatar: string | null
  ageVerified: boolean | null
  createdAt: string
  totalOrders: number
  paidOrders: number
  totalSpent: number
  totalItems: number
  firstOrderDate: string | null
  lastOrderDate: string | null
}

interface CustomerSummary {
  totalCustomers: number
  activeCustomers: number
  newCustomers: number
  repeatCustomers: number
  totalRevenue: number
  avgOrderValue: number
  avgOrdersPerCustomer: number
}

/* ------------------------------------------------------------------ */
/*  Filter options                                                     */
/* ------------------------------------------------------------------ */

type ActivityFilter = "all" | "active" | "inactive" | "repeat" | "one-time" | "no-orders"

const activityFilterOptions: { value: ActivityFilter; label: string }[] = [
  { value: "all", label: "All Customers" },
  { value: "active", label: "Active (30d)" },
  { value: "inactive", label: "Inactive (30d+)" },
  { value: "repeat", label: "Repeat Buyers" },
  { value: "one-time", label: "One-Time Buyers" },
  { value: "no-orders", label: "No Orders" },
]

type SortField = "name" | "createdAt" | "totalOrders" | "totalSpent" | "lastOrderDate"
type SortDir = "asc" | "desc"

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatCurrency(value: number): string {
  return `$${value.toFixed(2)}`
}

function formatDate(iso: string | null): string {
  if (!iso) return "—"
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

/** Active = has at least 1 order in the past 30 days */
function isActiveCustomer(c: CustomerRow): boolean {
  if (!c.lastOrderDate) return false
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000
  return new Date(c.lastOrderDate).getTime() >= thirtyDaysAgo
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

interface AdminCustomersTableProps {
  onSelectCustomer: (id: string) => void
}

export function AdminCustomersTable({ onSelectCustomer }: AdminCustomersTableProps) {
  useScrollRestoration("admin-customers-scroll")

  const [tableState, setTableState] = usePersistentTableState("admin-customers-table", {
    query: "",
    activityFilter: "all" as ActivityFilter,
    sortField: "createdAt" as SortField,
    sortDir: "desc" as SortDir,
    currentPage: 1,
    itemsPerPage: 20,
  })

  const { query, activityFilter, sortField, sortDir, currentPage, itemsPerPage } = tableState

  const [customers, setCustomers] = useState<CustomerRow[]>([])
  const [summary, setSummary] = useState<CustomerSummary | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchCustomers() {
      try {
        const response = await fetch("/api/admin/customers")
        if (response.ok) {
          const data = await response.json()
          setCustomers(data.customers || [])
          setSummary(data.summary || null)
        }
      } catch (error) {
        console.error("Error fetching customers:", error)
      } finally {
        setLoading(false)
      }
    }
    fetchCustomers()
  }, [])

  /* Filtering */
  const filtered = useMemo(() => {
    let result = customers

    // Activity filter
    if (activityFilter === "active") {
      result = result.filter(isActiveCustomer)
    } else if (activityFilter === "inactive") {
      result = result.filter((c) => c.totalOrders > 0 && !isActiveCustomer(c))
    } else if (activityFilter === "repeat") {
      result = result.filter((c) => c.paidOrders > 1)
    } else if (activityFilter === "one-time") {
      result = result.filter((c) => c.paidOrders === 1)
    } else if (activityFilter === "no-orders") {
      result = result.filter((c) => c.totalOrders === 0)
    }

    // Search
    if (query.trim()) {
      const q = query.toLowerCase()
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q) ||
          (c.phone && c.phone.toLowerCase().includes(q)) ||
          c.id.toLowerCase().includes(q)
      )
    }

    // Sorting
    result = [...result].sort((a, b) => {
      let cmp = 0
      switch (sortField) {
        case "name":
          cmp = a.name.localeCompare(b.name)
          break
        case "createdAt":
          cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          break
        case "totalOrders":
          cmp = a.totalOrders - b.totalOrders
          break
        case "totalSpent":
          cmp = a.totalSpent - b.totalSpent
          break
        case "lastOrderDate":
          cmp =
            (a.lastOrderDate ? new Date(a.lastOrderDate).getTime() : 0) -
            (b.lastOrderDate ? new Date(b.lastOrderDate).getTime() : 0)
          break
      }
      return sortDir === "asc" ? cmp : -cmp
    })

    return result
  }, [customers, query, activityFilter, sortField, sortDir])

  // Reset to page 1 when filters change
  useEffect(() => {
    setTableState((prev) => ({ ...prev, currentPage: 1 }))
  }, [query, activityFilter, sortField, sortDir, setTableState])

  // Paginate
  const paginated = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return filtered.slice(start, start + itemsPerPage)
  }, [filtered, currentPage, itemsPerPage])

  const totalPages = Math.ceil(filtered.length / itemsPerPage)

  function toggleSort(field: SortField) {
    setTableState((prev) => ({
      ...prev,
      sortField: field,
      sortDir: prev.sortField === field && prev.sortDir === "desc" ? "asc" : "desc",
    }))
  }

  function SortIndicator({ field }: { field: SortField }) {
    if (sortField !== field) return null
    return <span className="ml-1 text-primary">{sortDir === "asc" ? "↑" : "↓"}</span>
  }

  /* KPI Cards */
  const kpiCards: StatCardData[] = summary
    ? [
        {
          label: "Total Customers",
          value: summary.totalCustomers.toLocaleString(),
          icon: Users,
        },
        {
          label: "Active (30d)",
          value: summary.activeCustomers.toLocaleString(),
          change: summary.totalCustomers > 0
            ? `${((summary.activeCustomers / summary.totalCustomers) * 100).toFixed(0)}% of total`
            : undefined,
          icon: UserCheck,
        },
        {
          label: "New (30d)",
          value: summary.newCustomers.toLocaleString(),
          icon: UserPlus,
        },
        {
          label: "Repeat Buyers",
          value: summary.repeatCustomers.toLocaleString(),
          icon: Repeat,
        },
        {
          label: "Total Revenue",
          value: formatCurrency(summary.totalRevenue),
          icon: DollarSign,
        },
        {
          label: "Avg Order Value",
          value: formatCurrency(summary.avgOrderValue),
          icon: ShoppingCart,
        },
        {
          label: "Avg Orders / Customer",
          value: summary.avgOrdersPerCustomer.toFixed(1),
          icon: TrendingUp,
        },
      ]
    : []

  return (
    <div className="flex flex-col gap-8">
      {/* KPI Cards */}
      {!loading && summary && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
          {kpiCards.map((stat) => (
            <StatCard key={stat.label} stat={stat} />
          ))}
        </div>
      )}

      {/* Loading skeleton for KPI cards */}
      {loading && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
          {Array.from({ length: 7 }).map((_, i) => (
            <div
              key={i}
              className="h-[120px] animate-pulse rounded-3xl bg-white dark:bg-gray-900 shadow-[0_10px_30px_rgba(0,0,0,0.05)] dark:shadow-[0_10px_30px_rgba(0,0,0,0.3)]"
            />
          ))}
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Search */}
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search customers..."
            value={query}
            onChange={(e) =>
              setTableState((prev) => ({ ...prev, query: e.target.value }))
            }
            className="h-12 w-full rounded-xl bg-background border-0 shadow-[0_10px_30px_rgba(0,0,0,0.05)] dark:shadow-[0_10px_30px_rgba(0,0,0,0.3)] pl-11 pr-4 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-brand-primary/20"
            aria-label="Search customers"
          />
        </div>

        {/* Filter + count */}
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">
            {filtered.length} {filtered.length === 1 ? "customer" : "customers"}
            {filtered.length !== customers.length && ` of ${customers.length}`}
          </span>
          <div className="relative">
            <select
              value={activityFilter}
              onChange={(e) =>
                setTableState((prev) => ({
                  ...prev,
                  activityFilter: e.target.value as ActivityFilter,
                }))
              }
              className="h-12 appearance-none rounded-xl bg-background border-0 shadow-[0_10px_30px_rgba(0,0,0,0.05)] dark:shadow-[0_10px_30px_rgba(0,0,0,0.3)] pl-4 pr-10 text-sm text-foreground outline-none focus:ring-2 focus:ring-brand-primary/20"
              aria-label="Filter by activity"
            >
              {activityFilterOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          </div>
        </div>
      </div>

      {/* Table card */}
      <div className="rounded-3xl bg-card text-card-foreground shadow-[0_10px_30px_rgba(0,0,0,0.05)] dark:shadow-[0_10px_30px_rgba(0,0,0,0.3)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-border/50">
                <th
                  className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground cursor-pointer select-none hover:text-foreground transition-colors"
                  onClick={() => toggleSort("name")}
                >
                  Customer
                  <SortIndicator field="name" />
                </th>
                <th
                  className="hidden px-6 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground md:table-cell cursor-pointer select-none hover:text-foreground transition-colors"
                  onClick={() => toggleSort("createdAt")}
                >
                  Joined
                  <SortIndicator field="createdAt" />
                </th>
                <th
                  className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground cursor-pointer select-none hover:text-foreground transition-colors"
                  onClick={() => toggleSort("totalOrders")}
                >
                  Orders
                  <SortIndicator field="totalOrders" />
                </th>
                <th className="hidden px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground sm:table-cell">
                  Items
                </th>
                <th
                  className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground cursor-pointer select-none hover:text-foreground transition-colors"
                  onClick={() => toggleSort("totalSpent")}
                >
                  Spent
                  <SortIndicator field="totalSpent" />
                </th>
                <th
                  className="hidden px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground lg:table-cell cursor-pointer select-none hover:text-foreground transition-colors"
                  onClick={() => toggleSort("lastOrderDate")}
                >
                  Last Order
                  <SortIndicator field="lastOrderDate" />
                </th>
                <th className="hidden px-6 py-4 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground xl:table-cell">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((customer) => {
                const active = isActiveCustomer(customer)
                return (
                  <tr
                    key={customer.id}
                    onClick={() => onSelectCustomer(customer.id)}
                    className="border-b border-border/50 transition-colors last:border-0 hover:bg-accent cursor-pointer"
                  >
                    {/* Customer name + email */}
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-foreground">
                        {customer.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {customer.email}
                      </p>
                      {customer.phone && (
                        <p className="text-xs text-muted-foreground">
                          {customer.phone}
                        </p>
                      )}
                    </td>

                    {/* Joined */}
                    <td className="hidden px-6 py-4 text-sm text-muted-foreground md:table-cell">
                      {formatDate(customer.createdAt)}
                    </td>

                    {/* Orders */}
                    <td className="px-6 py-4 text-right text-sm font-medium text-foreground">
                      {customer.totalOrders}
                    </td>

                    {/* Items */}
                    <td className="hidden px-6 py-4 text-right text-sm text-muted-foreground sm:table-cell">
                      {customer.totalItems}
                    </td>

                    {/* Spent */}
                    <td className="px-6 py-4 text-right text-sm font-semibold text-foreground">
                      {formatCurrency(customer.totalSpent)}
                    </td>

                    {/* Last Order */}
                    <td className="hidden px-6 py-4 text-right text-sm text-muted-foreground lg:table-cell">
                      {formatDate(customer.lastOrderDate)}
                    </td>

                    {/* Status */}
                    <td className="hidden px-6 py-4 text-center xl:table-cell">
                      {customer.totalOrders === 0 ? (
                        <span className="inline-block rounded-xl bg-muted px-3 py-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          No Orders
                        </span>
                      ) : active ? (
                        <span className="inline-block rounded-xl bg-gradient-to-r from-brand-primary to-brand-secondary px-3 py-1 text-xs font-semibold uppercase tracking-wider text-brand-primary-foreground">
                          Active
                        </span>
                      ) : (
                        <span className="inline-block rounded-xl bg-warning/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-warning border border-warning/20">
                          Inactive
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!loading && filtered.length > 0 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={(page) =>
              setTableState((prev) => ({ ...prev, currentPage: page }))
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

        {/* Loading state */}
        {loading && (
          <div className="flex flex-col items-center justify-center gap-3 px-6 py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-muted-foreground" />
            <p className="text-sm text-muted-foreground">Loading customers...</p>
          </div>
        )}

        {/* Empty state */}
        {!loading && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-3 px-6 py-16">
            <Users className="h-8 w-8 text-muted-foreground/60" />
            <p className="text-sm text-muted-foreground">
              {query.trim()
                ? <>No customers match &ldquo;{query}&rdquo;</>
                : customers.length === 0
                  ? "No customers found"
                  : "No customers found for this filter"}
            </p>
            {(query.trim() || activityFilter !== "all") && (
              <button
                onClick={() => {
                  setTableState((prev) => ({
                    ...prev,
                    query: "",
                    activityFilter: "all" as ActivityFilter,
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
    </div>
  )
}
