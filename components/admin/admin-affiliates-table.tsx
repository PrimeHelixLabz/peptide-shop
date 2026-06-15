"use client"

import { useState, useMemo, useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { toast } from "sonner"
import { Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Select } from "@/components/common/select"
import { StatusBadge, type StatusVariant } from "@/components/common/status-badge"
import { AdminCard } from "@/components/common/admin-card"
import { EmptyState } from "@/components/common/empty-state"
import type { AffiliateStatus, AffiliateWithStats } from "@/lib/affiliates"

interface Props {
  affiliates: AffiliateWithStats[]
}

const STATUS_VARIANT: Record<AffiliateStatus, StatusVariant> = {
  pending: "warning",
  approved: "success",
  suspended: "neutral",
}

type StatusFilter = "all" | AffiliateStatus

const FILTER_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "suspended", label: "Suspended" },
]

function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`
}

function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

export function AdminAffiliatesTable({ affiliates }: Props) {
  const router = useRouter()
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")
  const [busy, setBusy] = useState<Set<string>>(new Set())

  // Inline triage from the list: approve/reject a pending applicant without
  // opening the detail page. Everything else (rate, payout, etc.) lives there.
  const setStatus = useCallback(
    async (id: string, status: AffiliateStatus, label: string) => {
      setBusy((prev) => new Set(prev).add(id))
      try {
        const res = await fetch(`/api/admin/affiliates/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        })
        const data = (await res.json().catch(() => ({}))) as { error?: string }
        if (!res.ok) {
          toast.error(data.error || "Could not update")
          return
        }
        toast.success(label)
        router.refresh()
      } catch (err) {
        console.error(err)
        toast.error("Network error")
      } finally {
        setBusy((prev) => {
          const next = new Set(prev)
          next.delete(id)
          return next
        })
      }
    },
    [router]
  )

  const counts = useMemo(() => {
    const c = { pending: 0, approved: 0, suspended: 0 }
    for (const a of affiliates) c[a.status] += 1
    return c
  }, [affiliates])

  const filtered = useMemo(() => {
    if (statusFilter === "all") return affiliates
    return affiliates.filter((a) => a.status === statusFilter)
  }, [affiliates, statusFilter])

  if (affiliates.length === 0) {
    return (
      <AdminCard flush>
        <EmptyState
          icon={Users}
          title="No applications yet"
          description="Share your affiliate program page to attract creators and community members. Applications will appear here as people apply."
          action={{ label: "View program page", href: "/affiliates" }}
        />
      </AdminCard>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Toolbar */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span>
            <strong className="text-foreground">{counts.pending}</strong> pending
          </span>
          <span aria-hidden="true">·</span>
          <span>
            <strong className="text-foreground">{counts.approved}</strong> approved
          </span>
          <span aria-hidden="true">·</span>
          <span>
            <strong className="text-foreground">{counts.suspended}</strong> suspended
          </span>
        </div>
        <Select
          options={FILTER_OPTIONS}
          value={statusFilter}
          onChange={(value) => setStatusFilter(value as StatusFilter)}
          aria-label="Filter affiliates by status"
        />
      </div>

      {filtered.length === 0 ? (
        <AdminCard flush>
          <div className="p-12 text-center text-sm text-muted-foreground">
            No affiliates match this filter.
          </div>
        </AdminCard>
      ) : (
        <AdminCard flush>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-border/50">
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Affiliate
                  </th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Status
                  </th>
                  <th className="hidden px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground md:table-cell">
                    Conversions
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Owed
                  </th>
                  <th className="hidden px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground sm:table-cell">
                    Paid
                  </th>
                  <th className="hidden px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground lg:table-cell">
                    Rate
                  </th>
                  <th className="hidden px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground lg:table-cell">
                    Applied
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((a) => {
                  const owed = roundCurrency(a.pendingEarnings + a.payableEarnings)
                  const href = `/admin/affiliates/${a.id}`
                  return (
                    <tr
                      key={a.id}
                      onClick={() => router.push(href)}
                      className="cursor-pointer border-b border-border/50 transition-colors last:border-b-0 hover:bg-accent"
                    >
                      <td className="px-6 py-4 align-middle">
                        <div className="flex flex-col">
                          <Link
                            href={href}
                            onClick={(e) => e.stopPropagation()}
                            className="text-sm font-medium text-foreground hover:underline"
                          >
                            {a.name}
                          </Link>
                          <span className="text-xs text-muted-foreground">{a.email}</span>
                          {a.code && (
                            <span className="mt-1 font-mono text-[11px] font-semibold uppercase tracking-wider text-primary">
                              {a.code}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 align-middle">
                        <div className="flex flex-col items-start gap-2">
                          <StatusBadge variant={STATUS_VARIANT[a.status]}>
                            {a.status}
                          </StatusBadge>
                          {a.status === "pending" && (
                            <div className="flex gap-1.5">
                              <Button
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setStatus(a.id, "approved", "Affiliate approved")
                                }}
                                disabled={busy.has(a.id)}
                              >
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setStatus(a.id, "suspended", "Application rejected")
                                }}
                                disabled={busy.has(a.id)}
                              >
                                Reject
                              </Button>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="hidden px-6 py-4 text-right align-middle text-sm md:table-cell">
                        {a.conversionsCount}
                      </td>
                      <td
                        className={`px-6 py-4 text-right align-middle text-sm font-semibold ${
                          owed > 0 ? "text-amber-600" : "text-muted-foreground"
                        }`}
                      >
                        {formatCurrency(owed)}
                      </td>
                      <td className="hidden px-6 py-4 text-right align-middle text-sm sm:table-cell">
                        {formatCurrency(a.paidEarnings)}
                      </td>
                      <td className="hidden px-6 py-4 text-right align-middle text-sm text-muted-foreground lg:table-cell">
                        {(a.commissionRate * 100).toFixed(1)}%
                      </td>
                      <td className="hidden px-6 py-4 text-right align-middle text-sm text-muted-foreground lg:table-cell">
                        {formatDate(a.createdAt)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </AdminCard>
      )}
    </div>
  )
}
