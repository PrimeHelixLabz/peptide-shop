"use client"

import { useRef, useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Upload, UserPlus, Loader2, Download } from "lucide-react"
import { AdminCard } from "@/components/common/admin-card"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { NewsletterSubscriber } from "@/lib/db/newsletter"
import type { EmailCampaign } from "@/lib/db/campaigns"
import {
  AdminNewsletterTable,
  type StatusFilter,
} from "@/components/admin/admin-newsletter-table"
import { AdminNewsletterCompose } from "@/components/admin/admin-newsletter-compose"
import { AdminNewsletterCampaigns } from "@/components/admin/admin-newsletter-campaigns"

interface Props {
  subscribers: NewsletterSubscriber[]
  campaigns: EmailCampaign[]
}

type Tab = "subscribers" | "compose" | "history"

interface BulkAddResult {
  added: number
  reactivated: number
  skipped: number
  invalid: number
  total: number
}

const TABS: { id: Tab; label: string }[] = [
  { id: "subscribers", label: "Subscribers" },
  { id: "compose", label: "Compose & send" },
  { id: "history", label: "History" },
]

/** Pull the first column out of CSV text as a list of candidate emails. */
function parseCsvEmails(text: string): string[] {
  const emails: string[] = []
  const lines = text.split(/\r?\n/)
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue
    const first = (line.split(",")[0] ?? "").trim().replace(/^"|"$/g, "")
    // Skip a header row like "email"
    if (i === 0 && /^e-?mail$/i.test(first)) continue
    if (first) emails.push(first)
  }
  return emails
}

function summarize(r: BulkAddResult): string {
  const parts = [`${r.added} added`]
  if (r.reactivated) parts.push(`${r.reactivated} reactivated`)
  if (r.skipped) parts.push(`${r.skipped} already subscribed`)
  if (r.invalid) parts.push(`${r.invalid} invalid`)
  return parts.join(", ")
}

export function AdminNewsletterManager({ subscribers, campaigns }: Props) {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>("subscribers")
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [importing, setImporting] = useState(false)
  const [addingCustomers, setAddingCustomers] = useState(false)
  const [pendingStatusId, setPendingStatusId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const activeCount = useMemo(
    () => subscribers.filter((s) => !s.unsubscribedAt).length,
    [subscribers]
  )

  function toggle(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleMany(ids: string[], checked: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      for (const id of ids) {
        if (checked) next.add(id)
        else next.delete(id)
      }
      return next
    })
  }

  async function handleCsvFile(file: File) {
    setImporting(true)
    try {
      const text = await file.text()
      const emails = parseCsvEmails(text)
      if (emails.length === 0) {
        toast.error("No emails found in that file.")
        return
      }
      const res = await fetch("/api/admin/newsletter/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emails, source: "csv_import" }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Import failed")
      toast.success(`Import complete: ${summarize(data.result)}.`)
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Import failed")
    } finally {
      setImporting(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  async function handleSetStatus(id: string, action: "disable" | "enable") {
    setPendingStatusId(id)
    try {
      const res = await fetch(`/api/admin/newsletter/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Could not update subscriber")
      toast.success(
        action === "disable"
          ? "Subscriber disabled — they'll no longer receive emails."
          : "Subscriber enabled — they're back on the list."
      )
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update subscriber")
    } finally {
      setPendingStatusId(null)
    }
  }

  async function handleAddCustomers() {
    const ok = window.confirm(
      "Add all registered customers to the newsletter list? They'll start receiving marketing emails (each can unsubscribe). This only adds accounts that aren't already subscribed."
    )
    if (!ok) return
    setAddingCustomers(true)
    try {
      const res = await fetch("/api/admin/newsletter/import-customers", {
        method: "POST",
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Import failed")
      toast.success(`Customers imported: ${summarize(data.result)}.`)
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Import failed")
    } finally {
      setAddingCustomers(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-border/50">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "relative px-4 py-2.5 text-sm font-medium transition-colors",
              tab === t.id
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {t.label}
            {tab === t.id && (
              <span className="absolute inset-x-0 -bottom-px h-0.5 bg-primary" />
            )}
          </button>
        ))}
      </div>

      {tab === "subscribers" && (
        <>
          {/* Import controls */}
          <AdminCard title="Grow your list">
            <div className="flex flex-col gap-4">
              <p className="text-sm text-muted-foreground">
                Import a CSV of email addresses, or add your existing registered
                customers in one click. Duplicates and existing subscribers are
                skipped automatically.
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) handleCsvFile(file)
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={importing}
                >
                  {importing ? <Loader2 className="animate-spin" /> : <Upload />}
                  Upload CSV
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAddCustomers}
                  disabled={addingCustomers}
                >
                  {addingCustomers ? (
                    <Loader2 className="animate-spin" />
                  ) : (
                    <UserPlus />
                  )}
                  Add all customers
                </Button>
                <a
                  href="/sample-newsletter-import.csv"
                  download
                  className="inline-flex items-center gap-1.5 text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                >
                  <Download className="h-3.5 w-3.5" />
                  Sample CSV
                </a>
              </div>
            </div>
          </AdminCard>

          <AdminNewsletterTable
            subscribers={subscribers}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            selectedIds={selectedIds}
            onToggle={toggle}
            onToggleMany={toggleMany}
            onSetStatus={handleSetStatus}
            pendingStatusId={pendingStatusId}
          />
        </>
      )}

      {tab === "compose" && (
        <AdminNewsletterCompose
          activeCount={activeCount}
          selectedIds={Array.from(selectedIds)}
          onSent={() => setSelectedIds(new Set())}
        />
      )}

      {tab === "history" && <AdminNewsletterCampaigns campaigns={campaigns} />}
    </div>
  )
}
