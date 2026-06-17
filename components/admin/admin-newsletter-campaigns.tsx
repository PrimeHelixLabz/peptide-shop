"use client"

import { Mail } from "lucide-react"
import { AdminCard } from "@/components/common/admin-card"
import { StatusBadge, type StatusVariant } from "@/components/common/status-badge"
import { EmptyState } from "@/components/common/empty-state"
import type { EmailCampaign, CampaignStatus } from "@/lib/db/campaigns"

interface Props {
  campaigns: EmailCampaign[]
}

const STATUS_VARIANT: Record<CampaignStatus, StatusVariant> = {
  sending: "info",
  sent: "success",
  partial: "warning",
  failed: "error",
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

export function AdminNewsletterCampaigns({ campaigns }: Props) {
  if (campaigns.length === 0) {
    return (
      <AdminCard flush>
        <EmptyState
          icon={Mail}
          title="No campaigns sent yet"
          description="Compose and send a marketing email and it'll show up here with delivery stats."
        />
      </AdminCard>
    )
  }

  return (
    <AdminCard flush>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-border/50">
              <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Subject
              </th>
              <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Status
              </th>
              <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Recipients
              </th>
              <th className="hidden px-6 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground md:table-cell">
                Sent / Failed
              </th>
              <th className="hidden px-6 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground lg:table-cell">
                Sent by
              </th>
              <th className="hidden px-6 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground md:table-cell">
                Date
              </th>
            </tr>
          </thead>
          <tbody>
            {campaigns.map((c) => (
              <tr
                key={c.id}
                className="border-b border-border/50 transition-colors last:border-0 hover:bg-accent"
              >
                <td className="max-w-xs truncate px-6 py-4 text-sm font-medium text-foreground">
                  {c.subject}
                </td>
                <td className="px-6 py-4">
                  <StatusBadge variant={STATUS_VARIANT[c.status]}>
                    {c.status}
                  </StatusBadge>
                </td>
                <td className="px-6 py-4 text-sm text-muted-foreground">
                  {c.recipientCount}
                  {c.audience === "selected" && (
                    <span className="ml-1 text-xs">(selected)</span>
                  )}
                </td>
                <td className="hidden px-6 py-4 text-sm text-muted-foreground md:table-cell">
                  <span className="text-foreground">{c.sentCount}</span>
                  {c.failedCount > 0 && (
                    <span className="text-destructive"> / {c.failedCount}</span>
                  )}
                </td>
                <td className="hidden px-6 py-4 text-sm text-muted-foreground lg:table-cell">
                  {c.createdBy ?? "—"}
                </td>
                <td className="hidden px-6 py-4 text-sm text-muted-foreground md:table-cell">
                  {formatDateTime(c.sentAt ?? c.createdAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminCard>
  )
}
