"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Send, Eye, Code, Loader2 } from "lucide-react"
import { AdminCard } from "@/components/common/admin-card"
import { FormInput } from "@/components/common/form-input"
import { Button } from "@/components/ui/button"
import {
  renderMarketingMarkdown,
  buildMarketingEmailHtml,
  MARKETING_MARKDOWN_HELP,
} from "@/lib/newsletter/marketing-template"

interface Props {
  activeCount: number
  selectedIds: string[]
  onSent: () => void
}

type Audience = "all_active" | "selected"

export function AdminNewsletterCompose({
  activeCount,
  selectedIds,
  onSent,
}: Props) {
  const router = useRouter()
  const [subject, setSubject] = useState("")
  const [body, setBody] = useState("")
  const [audience, setAudience] = useState<Audience>("all_active")
  const [testEmail, setTestEmail] = useState("")
  const [sendingTest, setSendingTest] = useState(false)
  const [sending, setSending] = useState(false)

  const selectedCount = selectedIds.length
  const recipientCount = audience === "selected" ? selectedCount : activeCount

  // The preview is the literal email HTML a recipient receives — same
  // template module the server send uses, so what you see is what ships.
  const previewHtml = useMemo(
    () =>
      buildMarketingEmailHtml({
        subject: subject || "Your subject line",
        contentHtml: renderMarketingMarkdown(
          body || "_Start typing to see your email preview…_"
        ),
        recipientEmail: "subscriber@example.com",
        unsubscribeUrl: "#",
      }),
    [subject, body]
  )

  async function sendTest() {
    if (!subject.trim() || !body.trim()) {
      toast.error("Add a subject and body first.")
      return
    }
    if (!testEmail.trim()) {
      toast.error("Enter an email address to send the test to.")
      return
    }
    setSendingTest(true)
    try {
      const res = await fetch("/api/admin/newsletter/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "test",
          subject,
          bodyMarkdown: body,
          testEmail,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Test send failed")
      toast.success(`Test email sent to ${testEmail}.`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Test send failed")
    } finally {
      setSendingTest(false)
    }
  }

  async function send() {
    if (!subject.trim() || !body.trim()) {
      toast.error("Add a subject and body first.")
      return
    }
    if (recipientCount === 0) {
      toast.error(
        audience === "selected"
          ? "No subscribers selected."
          : "No active subscribers to send to."
      )
      return
    }
    const ok = window.confirm(
      `Send "${subject.trim()}" to ${recipientCount} subscriber${
        recipientCount === 1 ? "" : "s"
      }? This cannot be undone.`
    )
    if (!ok) return

    setSending(true)
    try {
      const res = await fetch("/api/admin/newsletter/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "send",
          subject,
          bodyMarkdown: body,
          audience,
          subscriberIds: audience === "selected" ? selectedIds : undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Send failed")

      if (data.failed > 0) {
        toast.warning(
          `Sent to ${data.sent} of ${data.recipientCount}. ${data.failed} failed — check logs.`
        )
      } else {
        toast.success(`Campaign sent to ${data.sent} subscribers.`)
      }
      setSubject("")
      setBody("")
      onSent()
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Send failed")
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {/* Composer */}
      <AdminCard title="Compose">
        <div className="flex flex-col gap-5">
          <FormInput
            label="Subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="New batch just dropped — 15% off this week"
            maxLength={200}
          />

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="campaign-body"
              className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-foreground/80"
            >
              <Code className="h-3.5 w-3.5" />
              Body (Markdown)
            </label>
            <textarea
              id="campaign-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={14}
              maxLength={20000}
              placeholder={MARKETING_MARKDOWN_HELP}
              className="w-full rounded-xl border border-border/60 bg-white px-4 py-3 font-mono text-sm text-foreground outline-none transition-[box-shadow,border-color] placeholder:text-muted-foreground/70 focus:border-brand-primary/40 focus:ring-2 focus:ring-brand-primary/20 dark:border-white/10 dark:bg-gray-900"
            />
            <p className="text-xs text-muted-foreground/80 leading-snug">
              Supports headings (#), **bold**, *italic*, [links](url), and lists.
              A line that is just a link becomes a button.
            </p>
          </div>

          {/* Audience */}
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-foreground/80">
              Send to
            </legend>
            <label className="flex items-center gap-2 text-sm text-foreground">
              <input
                type="radio"
                name="audience"
                checked={audience === "all_active"}
                onChange={() => setAudience("all_active")}
                className="h-4 w-4 accent-brand-primary"
              />
              All active subscribers ({activeCount})
            </label>
            <label className="flex items-center gap-2 text-sm text-foreground">
              <input
                type="radio"
                name="audience"
                checked={audience === "selected"}
                onChange={() => setAudience("selected")}
                disabled={selectedCount === 0}
                className="h-4 w-4 accent-brand-primary disabled:opacity-50"
              />
              <span className={selectedCount === 0 ? "text-muted-foreground" : ""}>
                Selected subscribers ({selectedCount})
              </span>
            </label>
          </fieldset>

          {/* Test send */}
          <div className="flex flex-col gap-2 rounded-xl border border-border/50 bg-muted/30 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-foreground/80">
              Send a test first
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <FormInput
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="you@example.com"
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                onClick={sendTest}
                disabled={sendingTest}
              >
                {sendingTest ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <Send />
                )}
                Send test
              </Button>
            </div>
          </div>

          <Button type="button" onClick={send} disabled={sending} size="lg">
            {sending ? <Loader2 className="animate-spin" /> : <Send />}
            {sending
              ? "Sending…"
              : `Send to ${recipientCount} subscriber${
                  recipientCount === 1 ? "" : "s"
                }`}
          </Button>
        </div>
      </AdminCard>

      {/* Live preview */}
      <AdminCard
        title="Preview"
        headerActions={
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Eye className="h-3.5 w-3.5" />
            Exactly as it sends
          </span>
        }
        flush
      >
        <div className="p-4">
          <iframe
            title="Email preview"
            srcDoc={previewHtml}
            className="h-[640px] w-full rounded-xl border border-border/50 bg-[#f3f4f6]"
            sandbox=""
          />
        </div>
      </AdminCard>
    </div>
  )
}
