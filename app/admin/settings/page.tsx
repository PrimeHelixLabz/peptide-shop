"use client"

import { useState, useEffect } from "react"
import { Megaphone, Eye } from "lucide-react"
import { toast } from "sonner"

interface BannerForm {
  enabled: boolean
  title: string
  message: string
}

export default function AdminSettingsPage() {
  const [form, setForm] = useState<BannerForm>({
    enabled: false,
    title: "",
    message: "",
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadBanner()
  }, [])

  async function loadBanner() {
    try {
      const response = await fetch("/api/admin/site-banner")
      if (response.ok) {
        const data = await response.json()
        const banner = data.banner
        setForm({
          enabled: banner?.enabled ?? false,
          title: banner?.title ?? "",
          message: banner?.message ?? "",
        })
      } else {
        toast.error("Failed to load banner")
      }
    } catch (error) {
      console.error("Error loading site banner:", error)
      toast.error("Failed to load banner")
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (form.enabled && !form.title.trim() && !form.message.trim()) {
      toast.error("Add a title or message before enabling the banner")
      return
    }

    setSaving(true)
    try {
      const response = await fetch("/api/admin/site-banner", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })

      if (response.ok) {
        toast.success("Banner saved")
      } else {
        const error = await response.json()
        toast.error("Failed to save banner", {
          description: error.error || "An unexpected error occurred",
        })
      }
    } catch (error) {
      console.error("Error saving site banner:", error)
      toast.error("Failed to save banner", {
        description: "An unexpected error occurred. Please try again.",
      })
    } finally {
      setSaving(false)
    }
  }

  const hasPreviewContent = form.title.trim() !== "" || form.message.trim() !== ""

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Manage site-wide settings and announcements
        </p>
      </div>

      {/* Banner card */}
      <div className="rounded-3xl bg-white dark:bg-gray-900 shadow-[0_10px_30px_rgba(0,0,0,0.05)] dark:shadow-[0_10px_30px_rgba(0,0,0,0.3)] overflow-hidden">
        <div className="flex items-center gap-3 border-b border-border/50 px-6 py-5">
          <Megaphone className="h-5 w-5 text-primary" />
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground">
              Homepage Banner
            </h2>
            <p className="text-xs text-muted-foreground">
              A notice shown at the top of the homepage — use it for shipping
              delays, sales, holiday hours, or any announcement.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center px-6 py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-muted-foreground" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {/* Enabled toggle */}
            <label className="flex items-center justify-between gap-4 rounded-2xl bg-gray-50 dark:bg-gray-800/50 px-5 py-4 cursor-pointer">
              <div>
                <span className="text-sm font-semibold text-foreground">
                  Show banner on homepage
                </span>
                <p className="text-xs text-muted-foreground">
                  {form.enabled
                    ? "The banner is live and visible to visitors."
                    : "The banner is hidden. Your text is saved for next time."}
                </p>
              </div>
              <input
                type="checkbox"
                checked={form.enabled}
                onChange={(e) => setForm({ ...form, enabled: e.target.checked })}
                className="h-5 w-5 shrink-0 rounded text-primary focus:ring-primary"
              />
            </label>

            {/* Title */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Title
              </label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. Temporary Shipping Delay"
                className="h-12 w-full rounded-xl bg-white dark:bg-gray-900 border-0 shadow-[0_10px_30px_rgba(0,0,0,0.05)] dark:shadow-[0_10px_30px_rgba(0,0,0,0.3)] px-4 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/20"
              />
            </div>

            {/* Message */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Message
              </label>
              <textarea
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                rows={3}
                placeholder="e.g. Orders placed this week will ship on Monday. Thanks for your patience."
                className="w-full resize-none rounded-xl bg-white dark:bg-gray-900 border-0 shadow-[0_10px_30px_rgba(0,0,0,0.05)] dark:shadow-[0_10px_30px_rgba(0,0,0,0.3)] px-4 py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/20"
              />
            </div>

            {/* Live preview */}
            {hasPreviewContent && (
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  <Eye className="h-3.5 w-3.5" />
                  Preview
                </div>
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center">
                  {form.title.trim() && (
                    <h3 className="text-lg font-semibold text-amber-900">
                      {form.title}
                    </h3>
                  )}
                  {form.message.trim() && (
                    <p className="mt-2 text-sm text-amber-800 whitespace-pre-line">
                      {form.message}
                    </p>
                  )}
                </div>
              </div>
            )}

            <div className="pt-1">
              <button
                type="submit"
                disabled={saving}
                className="rounded-2xl bg-primary px-6 py-2.5 text-sm font-semibold text-white shadow-[0_10px_30px_rgba(0,0,0,0.1)] transition-all duration-200 hover:shadow-[0_20px_40px_rgba(0,0,0,0.15)] hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
