"use client"

import { useState, useCallback, useMemo } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { toast } from "sonner"
import { ArrowLeft, Trash2, Save } from "lucide-react"
import type {
  DiscountCode,
  DiscountCodeInput,
  DiscountType,
} from "@/lib/discounts/types"
import { normalizeCode } from "@/lib/discounts/normalize"
import type { DiscountRedemptionRecord } from "@/lib/discounts/db"
import { AdminCard } from "@/components/common/admin-card"
import { FormInput } from "@/components/common/form-input"
import { Select } from "@/components/common/select"
import { StatusBadge } from "@/components/common/status-badge"
import { UserPicker } from "@/components/common/user-picker"
import { Button } from "@/components/ui/button"

interface AdminDiscountFormProps {
  initial?: DiscountCode
  redemptions?: DiscountRedemptionRecord[]
}

interface FormState {
  code: string
  discountType: DiscountType
  percentOff: string
  amountOff: string
  maxRedemptions: string
  perUserMaxRedemptions: string
  minSubtotal: string
  restrictedToUserId: string
  isActive: boolean
  expiresAt: string
}

function initialState(p?: DiscountCode): FormState {
  return {
    code: p?.code ?? "",
    discountType: p?.discountType ?? "percent",
    percentOff: p?.percentOff?.toString() ?? "",
    amountOff: p?.amountOff?.toString() ?? "",
    maxRedemptions: p?.maxRedemptions?.toString() ?? "",
    perUserMaxRedemptions: p?.perUserMaxRedemptions?.toString() ?? "",
    minSubtotal: p?.minSubtotal?.toString() ?? "",
    restrictedToUserId: p?.restrictedToUserId ?? "",
    isActive: p?.isActive ?? true,
    // datetime-local needs YYYY-MM-DDTHH:mm (no timezone, no seconds)
    expiresAt: p?.expiresAt ? toLocalDateTimeInput(p.expiresAt) : "",
  }
}

function toLocalDateTimeInput(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number) => n.toString().padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function parseOptionalInt(s: string): number | null {
  const t = s.trim()
  if (!t) return null
  const n = Number.parseInt(t, 10)
  return Number.isFinite(n) && n > 0 ? n : null
}

function parseOptionalFloat(s: string, min = 0): number | null {
  const t = s.trim()
  if (!t) return null
  const n = Number.parseFloat(t)
  return Number.isFinite(n) && n >= min ? n : null
}

export function AdminDiscountForm({
  initial,
  redemptions = [],
}: AdminDiscountFormProps) {
  const router = useRouter()
  const [form, setForm] = useState<FormState>(initialState(initial))
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const isEdit = !!initial

  const discountTypeOptions = useMemo(
    () => [
      { value: "percent", label: "Percent off (e.g. 10%)" },
      { value: "amount", label: "Fixed amount off (e.g. $25)" },
    ],
    []
  )

  const buildPayload = useCallback((): DiscountCodeInput | { error: string } => {
    const code = normalizeCode(form.code)
    if (code.length < 3) return { error: "Code must be at least 3 characters" }

    const payload: DiscountCodeInput = {
      code,
      discountType: form.discountType,
      maxRedemptions: parseOptionalInt(form.maxRedemptions),
      perUserMaxRedemptions: parseOptionalInt(form.perUserMaxRedemptions),
      minSubtotal: parseOptionalFloat(form.minSubtotal, 0),
      restrictedToUserId: form.restrictedToUserId.trim() || null,
      isActive: form.isActive,
      expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : null,
    }

    if (form.discountType === "percent") {
      const pct = parseOptionalFloat(form.percentOff, 0.01)
      if (pct == null || pct <= 0 || pct > 100) {
        return { error: "Enter a percent between 0 and 100" }
      }
      payload.percentOff = pct
      payload.amountOff = null
    } else {
      const amt = parseOptionalFloat(form.amountOff, 0.01)
      if (amt == null || amt <= 0) {
        return { error: "Enter a dollar amount greater than 0" }
      }
      payload.amountOff = amt
      payload.percentOff = null
    }

    return payload
  }, [form])

  const submit = useCallback(async () => {
    const payload = buildPayload()
    if ("error" in payload) {
      toast.error(payload.error)
      return
    }

    setSaving(true)
    try {
      const res = isEdit
        ? await fetch(`/api/admin/discounts/${initial!.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
        : await fetch("/api/admin/discounts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })

      const data = (await res.json().catch(() => ({}))) as {
        error?: string
        code?: DiscountCode
      }
      if (!res.ok) {
        toast.error(data.error || "Could not save code")
        return
      }
      toast.success(isEdit ? "Code updated" : "Code created")
      if (!isEdit && data.code) {
        router.push(`/admin/discounts/${data.code.id}/edit`)
      } else {
        router.refresh()
      }
    } catch (err) {
      console.error(err)
      toast.error("Network error")
    } finally {
      setSaving(false)
    }
  }, [buildPayload, initial, isEdit, router])

  const handleDelete = useCallback(async () => {
    if (!initial) return
    if (!confirm("Delete this code? Existing orders that used it will stay intact.")) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/admin/discounts/${initial.id}`, {
        method: "DELETE",
      })
      if (!res.ok) {
        toast.error("Could not delete code")
        return
      }
      toast.success("Code deleted")
      router.push("/admin/discounts")
    } catch (err) {
      console.error(err)
      toast.error("Network error")
    } finally {
      setDeleting(false)
    }
  }, [initial, router])

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 lg:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link href="/admin/discounts">
            <ArrowLeft />
            Back to codes
          </Link>
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={submit}
          disabled={saving}
        >
          <Save />
          {isEdit ? "Save changes" : "Create code"}
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-5">
          <AdminCard title="Code">
            <FormInput
              value={form.code}
              onChange={(e) =>
                setForm((p) => ({
                  ...p,
                  // Normalize as the admin types — same shape the
                  // backend stores.
                  code: normalizeCode(e.target.value),
                }))
              }
              placeholder="WELCOME10"
              helperText="3–40 characters. Letters, numbers, hyphen, underscore. Case-insensitive at redemption."
              maxLength={40}
            />
          </AdminCard>

          <AdminCard title="Discount">
            <div className="flex flex-col gap-4">
              <Select
                label="Type"
                value={form.discountType}
                onChange={(v) =>
                  setForm((p) => ({ ...p, discountType: v as DiscountType }))
                }
                options={discountTypeOptions}
              />
              {form.discountType === "percent" ? (
                <FormInput
                  label="Percent off"
                  type="number"
                  step="0.01"
                  min="0.01"
                  max="100"
                  value={form.percentOff}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, percentOff: e.target.value }))
                  }
                  suffix={<span className="text-xs">%</span>}
                  interactiveSuffix={false}
                  placeholder="10"
                />
              ) : (
                <FormInput
                  label="Amount off"
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={form.amountOff}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, amountOff: e.target.value }))
                  }
                  prefix={<span className="text-xs">$</span>}
                  placeholder="25.00"
                />
              )}
            </div>
          </AdminCard>

          <AdminCard title="Limits">
            <div className="flex flex-col gap-4">
              <FormInput
                label="Global max redemptions"
                type="number"
                step="1"
                min="1"
                value={form.maxRedemptions}
                onChange={(e) =>
                  setForm((p) => ({ ...p, maxRedemptions: e.target.value }))
                }
                placeholder="leave blank for unlimited"
                helperText="Set to 1 for a single-use key. Set to N for a limited-quantity campaign."
              />
              <FormInput
                label="Per-user max redemptions"
                type="number"
                step="1"
                min="1"
                value={form.perUserMaxRedemptions}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    perUserMaxRedemptions: e.target.value,
                  }))
                }
                placeholder="leave blank for unlimited"
                helperText="Set to 1 for &ldquo;each customer can use this code only once.&rdquo;"
              />
              <FormInput
                label="Minimum order subtotal"
                type="number"
                step="0.01"
                min="0"
                value={form.minSubtotal}
                onChange={(e) =>
                  setForm((p) => ({ ...p, minSubtotal: e.target.value }))
                }
                prefix={<span className="text-xs">$</span>}
                placeholder="optional"
                helperText="Cart subtotal must reach this before the code applies."
              />
              <UserPicker
                label="Lock to user (advanced)"
                value={form.restrictedToUserId || null}
                onChange={(id) =>
                  setForm((p) => ({ ...p, restrictedToUserId: id ?? "" }))
                }
                placeholder="Any customer — leave blank to allow all"
                helperText="Search by name or email to make this a single-customer VIP code."
              />
            </div>
          </AdminCard>

          {isEdit && redemptions.length > 0 && (
            <AdminCard title={`Recent redemptions (${redemptions.length})`} flush>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-border/50">
                      <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        When
                      </th>
                      <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Customer
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Applied
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {redemptions.map((r) => (
                      <tr
                        key={r.id}
                        className="border-b border-border/50 last:border-0"
                      >
                        <td className="px-6 py-3 text-muted-foreground">
                          {new Date(r.redeemedAt).toLocaleString()}
                        </td>
                        <td className="px-6 py-3 font-mono text-xs text-muted-foreground">
                          {r.userId
                            ? `user:${r.userId.slice(0, 8)}…`
                            : `guest:${r.guestEmail}`}
                        </td>
                        <td className="px-6 py-3 text-right text-foreground">
                          ${r.discountApplied.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </AdminCard>
          )}

          {isEdit && (
            <div className="flex justify-end">
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={handleDelete}
                disabled={deleting}
              >
                <Trash2 />
                Delete code
              </Button>
            </div>
          )}
        </div>

        <aside className="flex flex-col gap-5">
          <AdminCard title="Status">
            <div className="flex flex-col gap-3">
              <StatusBadge variant={form.isActive ? "success" : "neutral"}>
                {form.isActive ? "active" : "inactive"}
              </StatusBadge>
              <label className="flex items-center gap-2 text-sm text-foreground">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, isActive: e.target.checked }))
                  }
                  className="h-4 w-4 rounded border-border"
                />
                Active
              </label>
            </div>
          </AdminCard>

          <AdminCard title="Expiration">
            <FormInput
              type="datetime-local"
              value={form.expiresAt}
              onChange={(e) =>
                setForm((p) => ({ ...p, expiresAt: e.target.value }))
              }
              helperText="Leave blank for no expiration."
            />
          </AdminCard>

          {isEdit && (
            <AdminCard title="Stats">
              <div className="flex flex-col gap-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Times used</span>
                  <span className="font-medium text-foreground">
                    {initial.redeemedCount}
                    {initial.maxRedemptions != null
                      ? ` / ${initial.maxRedemptions}`
                      : ""}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Created</span>
                  <span className="font-medium text-foreground">
                    {new Date(initial.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </AdminCard>
          )}
        </aside>
      </div>
    </div>
  )
}
