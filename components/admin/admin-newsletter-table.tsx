"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { Download, Mail } from "lucide-react"
import { AdminCard } from "@/components/common/admin-card"
import { Button } from "@/components/ui/button"
import { Select } from "@/components/common/select"
import { StatusBadge, type StatusVariant } from "@/components/common/status-badge"
import { EmptyState } from "@/components/common/empty-state"
import type { NewsletterSubscriber, SubscriberStatus } from "@/lib/db/newsletter"

interface Props {
  subscribers: NewsletterSubscriber[]
}

type StatusFilter = "all" | SubscriberStatus

const FILTER_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "active", label: "Active" },
  { value: "unsubscribed", label: "Unsubscribed" },
]

const STATUS_VARIANT: Record<SubscriberStatus, StatusVariant> = {
  active: "success",
  unsubscribed: "neutral",
}

function formatDateTime(iso: string | null): string {
  if (!iso) return "—"
  return new Date(iso).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

export function AdminNewsletterTable({ subscribers }: Props) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")

  const counts = useMemo(() => {
    let active = 0
    let unsubscribed = 0
    for (const s of subscribers) {
      if (s.unsubscribedAt) unsubscribed += 1
      else active += 1
    }
    return { active, unsubscribed }
  }, [subscribers])

  const filtered = useMemo(() => {
    if (statusFilter === "all") return subscribers
    if (statusFilter === "active") {
      return subscribers.filter((s) => !s.unsubscribedAt)
    }
    return subscribers.filter((s) => !!s.unsubscribedAt)
  }, [subscribers, statusFilter])

  const exportHref =
    statusFilter === "all"
      ? "/api/admin/newsletter/export"
      : `/api/admin/newsletter/export?status=${statusFilter}`

  if (subscribers.length === 0) {
    return (
      <AdminCard flush>
        <EmptyState
          icon={Mail}
          title="No subscribers yet"
          description="The exit-intent popup captures emails from new visitors. Once people start signing up they'll show up here."
          action={{ label: "View homepage", href: "/" }}
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
            <strong className="text-foreground">{counts.active}</strong> active
          </span>
          <span aria-hidden="true">·</span>
          <span>
            <strong className="text-foreground">{counts.unsubscribed}</strong> unsubscribed
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select
            options={FILTER_OPTIONS}
            value={statusFilter}
            onChange={(value) => setStatusFilter(value as StatusFilter)}
            aria-label="Filter subscribers by status"
          />
          <Button asChild variant="outline" size="sm">
            <Link href={exportHref} prefetch={false}>
              <Download />
              Export CSV
            </Link>
          </Button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <AdminCard flush>
          <div className="p-12 text-center text-sm text-muted-foreground">
            No subscribers match this filter.
          </div>
        </AdminCard>
      ) : (
        <AdminCard flush>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-border/50">
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Email
                  </th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Status
                  </th>
                  <th className="hidden px-6 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground md:table-cell">
                    Source
                  </th>
                  <th className="hidden px-6 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground md:table-cell">
                    Subscribed
                  </th>
                  <th className="hidden px-6 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground lg:table-cell">
                    Unsubscribed
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((sub) => {
                  const status: SubscriberStatus = sub.unsubscribedAt
                    ? "unsubscribed"
                    : "active"
                  return (
                    <tr
                      key={sub.id}
                      className="border-b border-border/50 transition-colors last:border-0 hover:bg-accent"
                    >
                      <td className="px-6 py-4 text-sm text-foreground">
                        {sub.email}
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge variant={STATUS_VARIANT[status]}>
                          {status}
                        </StatusBadge>
                      </td>
                      <td className="hidden px-6 py-4 text-sm text-muted-foreground md:table-cell">
                        {sub.source}
                      </td>
                      <td className="hidden px-6 py-4 text-sm text-muted-foreground md:table-cell">
                        {formatDateTime(sub.subscribedAt)}
                      </td>
                      <td className="hidden px-6 py-4 text-sm text-muted-foreground lg:table-cell">
                        {formatDateTime(sub.unsubscribedAt)}
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
