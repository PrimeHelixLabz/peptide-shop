import Link from "next/link"
import { Plus, Tag, Pencil } from "lucide-react"
import { getAllDiscountCodesAsAdmin } from "@/lib/discounts/db"
import { AdminCard } from "@/components/common/admin-card"
import { Button } from "@/components/ui/button"
import { StatusBadge, type StatusVariant } from "@/components/common/status-badge"
import { EmptyState } from "@/components/common/empty-state"
import type { DiscountCode } from "@/lib/discounts/types"

export const dynamic = "force-dynamic"

function formatDate(iso: string | null) {
  if (!iso) return "—"
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

function formatDiscount(code: DiscountCode): string {
  if (code.discountType === "percent" && code.percentOff != null) {
    // Drop trailing .00 for round numbers
    const pretty = code.percentOff % 1 === 0
      ? code.percentOff.toFixed(0)
      : code.percentOff.toFixed(2)
    return `${pretty}% off`
  }
  if (code.discountType === "amount" && code.amountOff != null) {
    return `$${code.amountOff.toFixed(2)} off`
  }
  return "—"
}

function statusFor(code: DiscountCode): {
  label: string
  variant: StatusVariant
} {
  if (!code.isActive) return { label: "inactive", variant: "neutral" }
  if (code.expiresAt && new Date(code.expiresAt) <= new Date()) {
    return { label: "expired", variant: "neutral" }
  }
  if (
    code.maxRedemptions != null &&
    code.confirmedRedemptions >= code.maxRedemptions
  ) {
    return { label: "exhausted", variant: "warning" }
  }
  return { label: "active", variant: "success" }
}

// "Used" reflects confirmed (paid) redemptions, not the reservation
// counter — an abandoned checkout shouldn't read as a use here.
function redemptionLabel(code: DiscountCode): string {
  if (code.maxRedemptions == null) return `${code.confirmedRedemptions} used`
  return `${code.confirmedRedemptions} / ${code.maxRedemptions}`
}

export default async function AdminDiscountsListPage() {
  const codes = await getAllDiscountCodesAsAdmin()

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 lg:p-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
            Discount Codes
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Create percent-off or fixed-amount codes. Set global or
            per-user redemption limits for one-time keys and welcome
            offers.
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/discounts/new">
            <Plus />
            New code
          </Link>
        </Button>
      </div>

      {codes.length === 0 ? (
        <AdminCard flush>
          <EmptyState
            icon={Tag}
            title="No discount codes yet"
            description="Create your first code to offer percent-off, fixed-amount, or one-time discounts to customers."
            action={{ label: "Create discount code", href: "/admin/discounts/new" }}
          />
        </AdminCard>
      ) : (
        <AdminCard flush>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-border/50">
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Code
                  </th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Discount
                  </th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Status
                  </th>
                  <th className="hidden px-6 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground md:table-cell">
                    Redemptions
                  </th>
                  <th className="hidden px-6 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground md:table-cell">
                    Expires
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {codes.map((code) => {
                  const status = statusFor(code)
                  return (
                    <tr
                      key={code.id}
                      className="border-b border-border/50 transition-colors last:border-0 hover:bg-accent"
                    >
                      <td className="px-6 py-4">
                        <Link
                          href={`/admin/discounts/${code.id}/edit`}
                          className="font-mono text-sm font-semibold text-foreground hover:text-primary"
                        >
                          {code.code}
                        </Link>
                      </td>
                      <td className="px-6 py-4 text-sm text-foreground">
                        {formatDiscount(code)}
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge variant={status.variant}>
                          {status.label}
                        </StatusBadge>
                      </td>
                      <td className="hidden px-6 py-4 text-sm text-muted-foreground md:table-cell">
                        {redemptionLabel(code)}
                      </td>
                      <td className="hidden px-6 py-4 text-sm text-muted-foreground md:table-cell">
                        {formatDate(code.expiresAt)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Button asChild variant="outline" size="sm">
                          <Link href={`/admin/discounts/${code.id}/edit`}>
                            <Pencil />
                            Edit
                          </Link>
                        </Button>
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
