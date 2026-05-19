"use client"

import { useState, useMemo, useCallback } from "react"
import { toast } from "sonner"
import { ChevronDown, ChevronRight, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { FormInput } from "@/components/common/form-input"
import { FormSelect } from "@/components/common/form-select"
import { StatusBadge, type StatusVariant } from "@/components/common/status-badge"
import { AdminCard } from "@/components/common/admin-card"
import { EmptyState } from "@/components/common/empty-state"
import { Users } from "lucide-react"
import type {
  AffiliateStatus,
  AffiliateWithStats,
} from "@/lib/affiliates"

interface Props {
  affiliates: AffiliateWithStats[]
}

const STATUS_VARIANT: Record<AffiliateStatus, StatusVariant> = {
  pending: "warning",
  approved: "success",
  suspended: "neutral",
}

const STATUS_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "suspended", label: "Suspended" },
]

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

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

export function AdminAffiliatesTable({ affiliates: initial }: Props) {
  const [affiliates, setAffiliates] = useState(initial)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [updating, setUpdating] = useState<Set<string>>(new Set())

  const counts = useMemo(() => {
    const c = { pending: 0, approved: 0, suspended: 0 }
    for (const a of affiliates) c[a.status] += 1
    return c
  }, [affiliates])

  const filtered = useMemo(() => {
    if (statusFilter === "all") return affiliates
    return affiliates.filter((a) => a.status === statusFilter)
  }, [affiliates, statusFilter])

  const toggleExpand = useCallback((id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const patch = useCallback(
    async (id: string, body: Record<string, unknown>, successMessage: string) => {
      setUpdating((prev) => new Set(prev).add(id))
      try {
        const res = await fetch(`/api/admin/affiliates/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        })
        const data = (await res.json().catch(() => ({}))) as {
          error?: string
          affiliate?: AffiliateWithStats
        }
        if (!res.ok) {
          toast.error(data.error || "Could not update")
          return
        }
        if (data.affiliate) {
          setAffiliates((prev) =>
            prev.map((a) =>
              a.id === id
                ? {
                    // Keep stats from prev (PATCH response doesn't include them);
                    // server-side stats won't change as a side-effect of status edits.
                    ...a,
                    ...data.affiliate!,
                  }
                : a
            )
          )
        }
        toast.success(successMessage)
      } catch (err) {
        console.error(err)
        toast.error("Network error")
      } finally {
        setUpdating((prev) => {
          const next = new Set(prev)
          next.delete(id)
          return next
        })
      }
    },
    []
  )

  const handleStatusChange = useCallback(
    (id: string, status: AffiliateStatus) => {
      patch(id, { status }, `Status set to ${status}`)
    },
    [patch]
  )

  const handleRateBlur = useCallback(
    (id: string, currentRate: number, raw: string) => {
      const next = Number(raw)
      if (!Number.isFinite(next) || next < 0 || next > 100) {
        toast.error("Commission rate must be between 0 and 100")
        return
      }
      const asFraction = Math.round((next / 100) * 1000) / 1000
      if (asFraction === currentRate) return
      patch(
        id,
        { commissionRate: asFraction },
        `Commission rate updated to ${next}%`
      )
    },
    [patch]
  )

  const handleLinkUser = useCallback(
    (id: string, email: string) => {
      const trimmed = email.trim()
      if (!trimmed) {
        toast.error("Enter the partner's login email")
        return
      }
      patch(id, { linkToUserEmail: trimmed }, "Linked to user account")
    },
    [patch]
  )

  const handleUnlinkUser = useCallback(
    (id: string) => {
      if (
        !confirm(
          "Unlink this affiliate from the current login? You can re-link to a different account afterwards. Conversions stay attached."
        )
      ) {
        return
      }
      patch(id, { unlinkUser: true }, "Unlinked from user account")
    },
    [patch]
  )

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
        <FormSelect
          options={FILTER_OPTIONS}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
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
                  <th className="w-10 px-6 py-4"></th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Affiliate
                  </th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Status
                  </th>
                  <th className="hidden px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground md:table-cell">
                    Conversions
                  </th>
                  <th className="hidden px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground md:table-cell">
                    Earned
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
                  const isOpen = expanded.has(a.id)
                  const isUpdating = updating.has(a.id)
                  return (
                    <Row
                      key={a.id}
                      affiliate={a}
                      isOpen={isOpen}
                      isUpdating={isUpdating}
                      onToggle={() => toggleExpand(a.id)}
                      onStatusChange={(s) => handleStatusChange(a.id, s)}
                      onRateBlur={(raw) =>
                        handleRateBlur(a.id, a.commissionRate, raw)
                      }
                      onLinkUser={(email) => handleLinkUser(a.id, email)}
                      onUnlinkUser={() => handleUnlinkUser(a.id)}
                    />
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

interface RowProps {
  affiliate: AffiliateWithStats
  isOpen: boolean
  isUpdating: boolean
  onToggle: () => void
  onStatusChange: (status: AffiliateStatus) => void
  onRateBlur: (raw: string) => void
  onLinkUser: (email: string) => void
  onUnlinkUser: () => void
}

function Row({
  affiliate: a,
  isOpen,
  isUpdating,
  onToggle,
  onStatusChange,
  onRateBlur,
  onLinkUser,
  onUnlinkUser,
}: RowProps) {
  const [rateDraft, setRateDraft] = useState(
    (a.commissionRate * 100).toString()
  )
  const [linkEmail, setLinkEmail] = useState(a.email ?? "")

  return (
    <>
      <tr className="border-b border-border/50 transition-colors hover:bg-accent">
        <td className="px-6 py-4 align-top">
          <button
            type="button"
            onClick={onToggle}
            className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label={isOpen ? "Collapse details" : "Expand details"}
            aria-expanded={isOpen}
          >
            {isOpen ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>
        </td>
        <td className="px-6 py-4 align-top">
          <div className="flex flex-col">
            <span className="text-sm font-medium text-foreground">{a.name}</span>
            <span className="text-xs text-muted-foreground">{a.email}</span>
          </div>
        </td>
        <td className="px-6 py-4 align-top">
          <div className="flex flex-col gap-2">
            <StatusBadge variant={STATUS_VARIANT[a.status]}>
              {a.status}
            </StatusBadge>
            <FormSelect
              options={STATUS_OPTIONS}
              value={a.status}
              onChange={(e) => onStatusChange(e.target.value as AffiliateStatus)}
              disabled={isUpdating}
              wrapperClassName="w-32"
              aria-label={`Change status for ${a.name}`}
            />
          </div>
        </td>
        <td className="hidden px-6 py-4 text-right align-top text-sm md:table-cell">
          {a.conversionsCount}
        </td>
        <td className="hidden px-6 py-4 text-right align-top text-sm font-medium md:table-cell">
          {formatCurrency(a.totalEarnings)}
        </td>
        <td className="hidden px-6 py-4 text-right align-top lg:table-cell">
          <div className="ml-auto w-24">
            <FormInput
              type="number"
              min={0}
              max={100}
              step={0.5}
              value={rateDraft}
              onChange={(e) => setRateDraft(e.target.value)}
              onBlur={() => onRateBlur(rateDraft)}
              disabled={isUpdating}
              suffix={<span className="text-xs">%</span>}
              interactiveSuffix={false}
              aria-label={`Commission rate for ${a.name}`}
            />
          </div>
        </td>
        <td className="hidden px-6 py-4 text-right align-top text-sm text-muted-foreground lg:table-cell">
          {formatDate(a.createdAt)}
        </td>
      </tr>
      {isOpen && (
        <tr className="border-b border-border/50 bg-muted/40">
          <td className="px-6 py-4"></td>
          <td colSpan={6} className="px-6 py-4">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              <DetailField label="Website / channel">
                {a.website ? (
                  <a
                    href={a.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-foreground hover:underline"
                  >
                    {a.website}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                ) : (
                  <span className="text-muted-foreground">Not provided</span>
                )}
              </DetailField>
              <DetailField label="Audience">
                {a.audience ? (
                  <span className="whitespace-pre-line text-sm">{a.audience}</span>
                ) : (
                  <span className="text-muted-foreground">Not provided</span>
                )}
              </DetailField>
              <DetailField label="Payout">
                <div className="flex flex-col gap-0.5">
                  <span>{a.payoutMethod || "—"}</span>
                  <span className="text-xs text-muted-foreground">
                    {a.payoutDetails || "Not set"}
                  </span>
                </div>
              </DetailField>
              <DetailField label="Pending earnings">
                {formatCurrency(a.pendingEarnings)}
              </DetailField>
              <DetailField label="Payable earnings">
                {formatCurrency(a.payableEarnings)}
              </DetailField>
              <DetailField label="Paid out">
                {formatCurrency(a.paidEarnings)}
              </DetailField>
              {a.approvedAt && (
                <DetailField label="Approved">
                  {formatDate(a.approvedAt)}
                </DetailField>
              )}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {a.status === "pending" && (
                <>
                  <Button
                    size="sm"
                    onClick={() => onStatusChange("approved")}
                    disabled={isUpdating}
                  >
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onStatusChange("suspended")}
                    disabled={isUpdating}
                  >
                    Reject
                  </Button>
                </>
              )}
              {a.status === "approved" && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onStatusChange("suspended")}
                  disabled={isUpdating}
                >
                  Suspend
                </Button>
              )}
              {a.status === "suspended" && (
                <Button
                  size="sm"
                  onClick={() => onStatusChange("approved")}
                  disabled={isUpdating}
                >
                  Reactivate
                </Button>
              )}
            </div>

            {/* Account link — escape hatch when an affiliate row exists
                without user_id (e.g. created manually in Supabase). Partner
                gets stuck on "Not an affiliate yet" until this is set. */}
            <div className="mt-6 flex flex-col gap-2 rounded-2xl border border-border/50 bg-background p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Login account link
                </p>
                {a.userId ? (
                  <StatusBadge variant="success">Linked</StatusBadge>
                ) : (
                  <StatusBadge variant="warning">Not linked</StatusBadge>
                )}
              </div>
              {a.userId ? (
                <>
                  <p className="text-xs text-muted-foreground">
                    Linked to{" "}
                    <strong className="text-foreground">{a.email}</strong>.
                    That partner can sign in and see this dashboard. If the
                    wrong account ended up on this row, unlink it and re-link
                    to the correct email. Conversions stay attached either way.
                  </p>
                  <div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={onUnlinkUser}
                      disabled={isUpdating}
                    >
                      Unlink account
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-xs text-muted-foreground">
                    This affiliate has no login linked, so the partner sees
                    &ldquo;Not an affiliate yet&rdquo; on their dashboard.
                    Enter the email of their registered user account to link.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <div className="flex-1 min-w-[200px]">
                      <FormInput
                        type="email"
                        placeholder="partner@example.com"
                        value={linkEmail}
                        onChange={(e) => setLinkEmail(e.target.value)}
                        disabled={isUpdating}
                        aria-label={`Login email for ${a.name}`}
                      />
                    </div>
                    <Button
                      size="sm"
                      onClick={() => onLinkUser(linkEmail)}
                      disabled={isUpdating || !linkEmail.trim()}
                    >
                      Link account
                    </Button>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    The partner must have already registered at{" "}
                    <code className="font-mono">/signup</code> with this email.
                  </p>
                </>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

function DetailField({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1 text-sm text-foreground">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <div className="break-words">{children}</div>
    </div>
  )
}
