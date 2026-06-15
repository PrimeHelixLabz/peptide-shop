"use client"

import { useState, useMemo, useCallback, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { toast } from "sonner"
import { ArrowLeft, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { FormInput } from "@/components/common/form-input"
import { StatusBadge, type StatusVariant } from "@/components/common/status-badge"
import { AdminCard } from "@/components/common/admin-card"
import { CopyLinkButton } from "@/components/affiliates/copy-link-button"
import { ReferralQrCode } from "@/components/affiliates/referral-qr-code"
import type {
  Affiliate,
  AffiliateStatus,
  AffiliateConversionWithOrder,
  ConversionStatus,
  OrderPreview,
} from "@/lib/affiliates"

// Kept in sync with the affiliate dashboard so the link an admin sees here
// matches what the partner copies from their own page.
const SITE_ORIGIN = "https://www.primehelixlabz.com"

const STATUS_VARIANT: Record<AffiliateStatus, StatusVariant> = {
  pending: "warning",
  approved: "success",
  suspended: "neutral",
}

const CONVERSION_STATUS_VARIANT: Record<ConversionStatus, StatusVariant> = {
  pending: "warning",
  payable: "info",
  paid: "success",
  reversed: "neutral",
}

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

interface Props {
  affiliate: Affiliate
  code: string | null
  conversions: AffiliateConversionWithOrder[]
}

export function AffiliateDetail({ affiliate, code, conversions }: Props) {
  const router = useRouter()
  const [aff, setAff] = useState(affiliate)
  const [busy, setBusy] = useState(false)

  // Profile / payout edit state
  const [rateDraft, setRateDraft] = useState((aff.commissionRate * 100).toString())
  const [linkEmail, setLinkEmail] = useState(aff.email ?? "")

  // Mark-as-paid state
  const [payoutReference, setPayoutReference] = useState("")
  const [markingPaid, setMarkingPaid] = useState(false)

  // Manual commission entry state
  const [manualOrderRef, setManualOrderRef] = useState("")
  const [manualPreview, setManualPreview] = useState<OrderPreview | null>(null)
  const [manualLookingUp, setManualLookingUp] = useState(false)
  const [manualRateOverride, setManualRateOverride] = useState("")
  const [manualNotes, setManualNotes] = useState("")
  const [manualSubmitting, setManualSubmitting] = useState(false)

  const totals = useMemo(() => {
    let pending = 0
    let payable = 0
    let paid = 0
    for (const c of conversions) {
      if (c.status === "pending") pending += c.commissionAmount
      else if (c.status === "payable") payable += c.commissionAmount
      else if (c.status === "paid") paid += c.commissionAmount
    }
    const round = (n: number) => Math.round(n * 100) / 100
    return {
      owed: round(pending + payable),
      paid: round(paid),
      pending: round(pending),
      payable: round(payable),
      count: conversions.length,
    }
  }, [conversions])

  const unpaid = useMemo(
    () => conversions.filter((c) => c.status === "pending" || c.status === "payable"),
    [conversions]
  )

  const patch = useCallback(
    async (body: Record<string, unknown>, successMessage: string) => {
      setBusy(true)
      try {
        const res = await fetch(`/api/admin/affiliates/${aff.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        })
        const data = (await res.json().catch(() => ({}))) as {
          error?: string
          affiliate?: Partial<Affiliate>
        }
        if (!res.ok) {
          toast.error(data.error || "Could not update")
          return
        }
        if (data.affiliate) {
          setAff((prev) => ({ ...prev, ...data.affiliate! }))
        }
        toast.success(successMessage)
        router.refresh()
      } catch (err) {
        console.error(err)
        toast.error("Network error")
      } finally {
        setBusy(false)
      }
    },
    [aff.id, router]
  )

  const handleRateBlur = useCallback(() => {
    const next = Number(rateDraft)
    if (!Number.isFinite(next) || next < 0 || next > 100) {
      toast.error("Commission rate must be between 0 and 100")
      return
    }
    const asFraction = Math.round((next / 100) * 1000) / 1000
    if (asFraction === aff.commissionRate) return
    patch({ commissionRate: asFraction }, `Commission rate updated to ${next}%`)
  }, [rateDraft, aff.commissionRate, patch])

  const handleMarkPaid = useCallback(async () => {
    if (unpaid.length === 0 || markingPaid) return
    const ids = unpaid.map((c) => c.id)
    setMarkingPaid(true)
    try {
      const res = await fetch(`/api/admin/affiliates/${aff.id}/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversionIds: ids,
          reference: payoutReference.trim() || undefined,
        }),
      })
      const data = (await res.json().catch(() => ({}))) as {
        paidCount?: number
        error?: string
      }
      if (!res.ok) {
        toast.error(data.error || "Could not mark as paid")
        return
      }
      const n = data.paidCount ?? ids.length
      toast.success(`Marked ${n} ${n === 1 ? "conversion" : "conversions"} as paid`)
      setPayoutReference("")
      router.refresh()
    } catch (err) {
      console.error(err)
      toast.error("Network error")
    } finally {
      setMarkingPaid(false)
    }
  }, [aff.id, unpaid, payoutReference, markingPaid, router])

  const handleManualLookup = useCallback(async () => {
    const ref = manualOrderRef.trim()
    if (!ref) return
    setManualLookingUp(true)
    setManualPreview(null)
    try {
      const res = await fetch(
        `/api/admin/affiliates/${aff.id}/conversions?lookup=${encodeURIComponent(ref)}`,
        { cache: "no-store" }
      )
      const data = (await res.json().catch(() => ({}))) as {
        order?: OrderPreview
        error?: string
      }
      if (!res.ok) {
        toast.error(data.error || "Order not found")
        return
      }
      setManualPreview(data.order ?? null)
      setManualRateOverride((aff.commissionRate * 100).toFixed(2))
    } catch {
      toast.error("Network error")
    } finally {
      setManualLookingUp(false)
    }
  }, [aff.id, aff.commissionRate, manualOrderRef])

  const handleManualCreate = useCallback(async () => {
    if (!manualPreview || manualSubmitting) return
    const rate = Number(manualRateOverride)
    if (!Number.isFinite(rate) || rate < 0 || rate > 100) {
      toast.error("Commission rate must be between 0 and 100")
      return
    }
    setManualSubmitting(true)
    try {
      const res = await fetch(`/api/admin/affiliates/${aff.id}/conversions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: manualPreview.id,
          commissionRateOverride: rate / 100,
          adminNotes: manualNotes.trim() || undefined,
        }),
      })
      const data = (await res.json().catch(() => ({}))) as {
        error?: string
      }
      if (!res.ok) {
        toast.error(data.error || "Could not add commission")
        return
      }
      toast.success("Commission added successfully")
      setManualOrderRef("")
      setManualPreview(null)
      setManualNotes("")
      setManualRateOverride("")
      router.refresh()
    } catch {
      toast.error("Network error")
    } finally {
      setManualSubmitting(false)
    }
  }, [aff.id, manualPreview, manualRateOverride, manualNotes, manualSubmitting, router])

  const manualCommissionPreview = manualPreview
    ? Math.round(
        manualPreview.commissionBase * (Number(manualRateOverride) / 100) * 100
      ) / 100
    : 0

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 lg:p-8">
      <Link
        href="/admin/affiliates"
        className="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to affiliates
      </Link>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
              {aff.name}
            </h1>
            <StatusBadge variant={STATUS_VARIANT[aff.status]}>
              {aff.status}
            </StatusBadge>
          </div>
          <p className="text-sm text-muted-foreground">{aff.email}</p>
          {code && (
            <span className="mt-1 w-fit font-mono text-xs font-semibold uppercase tracking-wider text-primary">
              {code}
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {aff.status === "pending" && (
            <>
              <Button size="sm" onClick={() => patch({ status: "approved" }, "Status set to approved")} disabled={busy}>
                Approve
              </Button>
              <Button size="sm" variant="outline" onClick={() => patch({ status: "suspended" }, "Status set to suspended")} disabled={busy}>
                Reject
              </Button>
            </>
          )}
          {aff.status === "approved" && (
            <Button size="sm" variant="outline" onClick={() => patch({ status: "suspended" }, "Status set to suspended")} disabled={busy}>
              Suspend
            </Button>
          )}
          {aff.status === "suspended" && (
            <Button size="sm" onClick={() => patch({ status: "approved" }, "Status set to approved")} disabled={busy}>
              Reactivate
            </Button>
          )}
        </div>
      </div>

      {/* Earnings summary */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <SummaryCard label="Owed" value={formatCurrency(totals.owed)} hint="Pending + payable, not yet sent" emphasis={totals.owed > 0} />
        <SummaryCard label="Paid out" value={formatCurrency(totals.paid)} hint="Settled payouts" />
        <SummaryCard label="Conversions" value={String(totals.count)} hint="Lifetime attributed orders" />
        <SummaryCard label="Commission rate" value={`${(aff.commissionRate * 100).toFixed(1)}%`} hint="Of net product sales" />
      </div>

      {/* Referral link + QR */}
      {code ? (
        <AdminCard>
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:gap-6">
            <div className="flex flex-1 flex-col gap-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Referral link &amp; code
                </p>
                <span className="font-mono text-xs font-semibold uppercase tracking-wider text-primary">
                  {code}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2 rounded-xl bg-muted p-3">
                <code className="flex-1 break-all text-xs text-foreground">
                  {`${SITE_ORIGIN}/?ref=${code}`}
                </code>
                <CopyLinkButton value={`${SITE_ORIGIN}/?ref=${code}`} />
              </div>
              <div className="flex flex-wrap items-center gap-2 rounded-xl bg-muted p-3">
                <code className="flex-1 break-all text-xs text-foreground">
                  {`${SITE_ORIGIN}/shop?ref=${code}`}
                </code>
                <CopyLinkButton value={`${SITE_ORIGIN}/shop?ref=${code}`} label="Copy shop link" />
              </div>
              <p className="text-[11px] text-muted-foreground">
                Append <code className="font-mono">?ref={code}</code> to any page on
                the site (including individual products) to attribute the visit to
                this partner.
              </p>
            </div>
            <div className="flex flex-col items-center gap-2 md:shrink-0">
              <ReferralQrCode url={`${SITE_ORIGIN}/?ref=${code}`} code={code} displaySize={160} />
              <p className="max-w-[10rem] text-center text-[11px] text-muted-foreground">
                Print-ready QR. Share with the partner for ads &amp; flyers.
              </p>
            </div>
          </div>
        </AdminCard>
      ) : (
        <AdminCard>
          <p className="text-xs text-muted-foreground">
            No referral code yet — codes are minted when the affiliate is approved.
          </p>
        </AdminCard>
      )}

      {/* Profile + payout + rate */}
      <AdminCard>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <DetailField label="Website / channel">
            {aff.website ? (
              <a href={aff.website} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-foreground hover:underline">
                {aff.website}
                <ExternalLink className="h-3 w-3" />
              </a>
            ) : (
              <span className="text-muted-foreground">Not provided</span>
            )}
          </DetailField>
          <DetailField label="Audience">
            {aff.audience ? (
              <span className="whitespace-pre-line text-sm">{aff.audience}</span>
            ) : (
              <span className="text-muted-foreground">Not provided</span>
            )}
          </DetailField>
          <DetailField label="Payout">
            <div className="flex flex-col gap-0.5">
              <span>{aff.payoutMethod || "—"}</span>
              <span className="text-xs text-muted-foreground">{aff.payoutDetails || "Not set"}</span>
            </div>
          </DetailField>
          <DetailField label="Applied">{formatDate(aff.createdAt)}</DetailField>
          {aff.approvedAt && <DetailField label="Approved">{formatDate(aff.approvedAt)}</DetailField>}
          <DetailField label="Commission rate">
            <div className="w-28">
              <FormInput
                type="number"
                min={0}
                max={100}
                step={0.5}
                value={rateDraft}
                onChange={(e) => setRateDraft(e.target.value)}
                onBlur={handleRateBlur}
                disabled={busy}
                suffix={<span className="text-xs">%</span>}
                interactiveSuffix={false}
                aria-label={`Commission rate for ${aff.name}`}
              />
            </div>
          </DetailField>
        </div>
      </AdminCard>

      {/* Account link */}
      <AdminCard>
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Login account link
            </p>
            {aff.userId ? (
              <StatusBadge variant="success">Linked</StatusBadge>
            ) : (
              <StatusBadge variant="warning">Not linked</StatusBadge>
            )}
          </div>
          {aff.userId ? (
            <>
              <p className="text-xs text-muted-foreground">
                Linked to <strong className="text-foreground">{aff.email}</strong>.
                That partner can sign in and see their dashboard. If the wrong
                account ended up here, unlink it and re-link to the correct email.
                Conversions stay attached either way.
              </p>
              <div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    if (
                      confirm(
                        "Unlink this affiliate from the current login? You can re-link to a different account afterwards. Conversions stay attached."
                      )
                    ) {
                      patch({ unlinkUser: true }, "Unlinked from user account")
                    }
                  }}
                  disabled={busy}
                >
                  Unlink account
                </Button>
              </div>
            </>
          ) : (
            <>
              <p className="text-xs text-muted-foreground">
                This affiliate has no login linked, so the partner sees &ldquo;Not
                an affiliate yet&rdquo; on their dashboard. Enter the email of their
                registered user account to link.
              </p>
              <div className="flex flex-wrap gap-2">
                <div className="min-w-[200px] flex-1">
                  <FormInput
                    type="email"
                    placeholder="partner@example.com"
                    value={linkEmail}
                    onChange={(e) => setLinkEmail(e.target.value)}
                    disabled={busy}
                    aria-label={`Login email for ${aff.name}`}
                  />
                </div>
                <Button
                  size="sm"
                  onClick={() => {
                    const trimmed = linkEmail.trim()
                    if (!trimmed) {
                      toast.error("Enter the partner's login email")
                      return
                    }
                    patch({ linkToUserEmail: trimmed }, "Linked to user account")
                  }}
                  disabled={busy || !linkEmail.trim()}
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
      </AdminCard>

      {/* Mark as paid */}
      <AdminCard>
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Mark conversions as paid
            </p>
            {unpaid.length > 0 && (
              <span className="text-xs text-muted-foreground">
                {unpaid.length} {unpaid.length === 1 ? "conversion" : "conversions"}
                {" · "}
                <strong className="text-foreground">{formatCurrency(totals.owed)}</strong>{" "}
                owed
              </span>
            )}
          </div>
          {unpaid.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              Nothing to settle. All conversions are paid or reversed.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              <FormInput
                label="Payout reference (optional)"
                placeholder="Tx hash, PayPal ID, Wise ID…"
                value={payoutReference}
                onChange={(e) => setPayoutReference(e.target.value)}
                disabled={markingPaid}
                maxLength={200}
                helperText="Partner sees the last few characters so they can match it against their wallet."
              />
              <div className="flex flex-wrap items-center gap-2">
                <Button size="sm" onClick={handleMarkPaid} disabled={markingPaid || unpaid.length === 0}>
                  {markingPaid ? "Recording…" : `Mark ${unpaid.length === 1 ? "conversion" : "all"} as paid`}
                </Button>
                <span className="text-[11px] text-muted-foreground">
                  Send the {formatCurrency(totals.owed)} payout first, then click to
                  record it. This can&rsquo;t be undone from the UI &mdash; only fix
                  manually in Supabase.
                </span>
              </div>
            </div>
          )}
        </div>
      </AdminCard>

      {/* Manual commission entry */}
      <AdminCard>
        <div className="flex flex-col gap-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Add manual commission
          </p>
          <p className="text-xs text-muted-foreground">
            Use this when a customer forgot to enter the affiliate code but the sale
            was genuinely driven by this partner. Enter the order number or ID.
          </p>
          <div className="flex flex-wrap gap-2">
            <div className="min-w-[200px] flex-1">
              <FormInput
                placeholder="Order # or UUID"
                value={manualOrderRef}
                onChange={(e) => setManualOrderRef(e.target.value)}
                disabled={manualLookingUp || manualSubmitting}
                aria-label="Order number or ID for manual commission"
              />
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={handleManualLookup}
              disabled={!manualOrderRef.trim() || manualLookingUp || manualSubmitting}
            >
              {manualLookingUp ? "Looking up…" : "Look up"}
            </Button>
          </div>

          {manualPreview && (
            <div className="flex flex-col gap-3 rounded-xl border border-border/50 bg-muted/30 p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs font-semibold text-foreground">
                    {manualPreview.orderNumber}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {manualPreview.customerName} &middot; {formatDate(manualPreview.createdAt)}
                  </span>
                </div>
                <span className="text-sm font-semibold text-foreground">
                  {formatCurrency(manualPreview.orderTotal)}
                </span>
              </div>

              {manualPreview.alreadyAttributed ? (
                <div className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
                  {manualPreview.attributedToCurrentAffiliate
                    ? "This order is already credited to this affiliate."
                    : `This order is already credited to ${manualPreview.attributedToOtherAffiliate}. To reassign it you must delete the existing conversion in Supabase first.`}
                </div>
              ) : (
                <>
                  <div className="flex flex-wrap items-end gap-3">
                    <div className="w-28">
                      <FormInput
                        label="Commission rate"
                        type="number"
                        min={0}
                        max={100}
                        step={0.5}
                        value={manualRateOverride}
                        onChange={(e) => setManualRateOverride(e.target.value)}
                        disabled={manualSubmitting}
                        suffix={<span className="text-xs">%</span>}
                        interactiveSuffix={false}
                        aria-label="Commission rate override"
                      />
                    </div>
                    <div className="pb-1 text-xs text-muted-foreground">
                      Commission:{" "}
                      <strong className="text-foreground">
                        {formatCurrency(manualCommissionPreview)}
                      </strong>{" "}
                      <span className="text-[10px]">
                        on {formatCurrency(manualPreview.commissionBase)} net sales
                      </span>
                    </div>
                  </div>

                  <FormInput
                    label="Reason / notes (optional)"
                    placeholder="e.g. Customer forgot code — confirmed via DM with affiliate"
                    value={manualNotes}
                    onChange={(e) => setManualNotes(e.target.value)}
                    disabled={manualSubmitting}
                    maxLength={500}
                    helperText="Stored for audit. Shown as a tooltip on the conversion."
                  />

                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      size="sm"
                      onClick={handleManualCreate}
                      disabled={manualSubmitting || !manualRateOverride || Number(manualRateOverride) < 0}
                    >
                      {manualSubmitting ? "Adding…" : "Add commission"}
                    </Button>
                    <span className="text-[11px] text-muted-foreground">
                      Creates a pending commission of {formatCurrency(manualCommissionPreview)} for {aff.name}.
                    </span>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </AdminCard>

      {/* All conversions */}
      <AdminCard flush>
        <div className="border-b border-border/50 px-6 py-4">
          <p className="text-sm font-semibold text-foreground">Conversions</p>
        </div>
        {conversions.length === 0 ? (
          <p className="px-6 py-8 text-center text-sm text-muted-foreground">
            No conversions yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/40 text-[10px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-6 py-3">Order</th>
                  <th className="px-6 py-3">Date</th>
                  <th className="px-6 py-3 text-right">Net sales</th>
                  <th className="px-6 py-3 text-right">Commission</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Source</th>
                </tr>
              </thead>
              <tbody>
                {conversions.map((c) => (
                  <tr key={c.id} className="border-t border-border/40">
                    <td className="px-6 py-3">
                      <Link
                        href={`/admin/orders/${c.orderId}`}
                        className="inline-flex items-center gap-1 font-medium text-foreground hover:underline"
                      >
                        {c.orderNumber ? `#${c.orderNumber}` : "View order"}
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    </td>
                    <td className="px-6 py-3 text-muted-foreground">{formatDate(c.createdAt)}</td>
                    <td className="px-6 py-3 text-right">{formatCurrency(c.commissionBase)}</td>
                    <td className="px-6 py-3 text-right font-medium">{formatCurrency(c.commissionAmount)}</td>
                    <td className="px-6 py-3">
                      <StatusBadge variant={CONVERSION_STATUS_VARIANT[c.status]}>
                        {c.status}
                      </StatusBadge>
                    </td>
                    <td className="px-6 py-3 text-xs text-muted-foreground">
                      {c.source === "manual" ? (
                        <span title={c.adminNotes ?? "Manually added by admin"}>Manual</span>
                      ) : (
                        "Auto"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminCard>
    </div>
  )
}

function SummaryCard({
  label,
  value,
  hint,
  emphasis,
}: {
  label: string
  value: string
  hint: string
  emphasis?: boolean
}) {
  return (
    <AdminCard>
      <div className="flex flex-col gap-1">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        <span className={`text-2xl font-bold ${emphasis ? "text-amber-600" : "text-foreground"}`}>
          {value}
        </span>
        <span className="text-[11px] text-muted-foreground">{hint}</span>
      </div>
    </AdminCard>
  )
}

function DetailField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <div className="text-sm text-foreground">{children}</div>
    </div>
  )
}
