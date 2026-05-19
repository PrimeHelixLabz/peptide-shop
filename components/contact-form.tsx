"use client"

import { useState, useCallback, type FormEvent } from "react"
import { Send, CheckCircle } from "lucide-react"
import { Select } from "@/components/common/select"

export function ContactForm() {
  const [status, setStatus] = useState<"idle" | "submitting" | "success">("idle")
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = useCallback(async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setStatus("submitting")
    const form = e.currentTarget
    const fd = new FormData(form)
    const name = String(fd.get("name") ?? "").trim()
    const email = String(fd.get("email") ?? "").trim()
    const subject = String(fd.get("subject") ?? "")
    const message = String(fd.get("message") ?? "").trim()

    if (!subject) {
      setStatus("idle")
      setError("Please pick a subject so we can route your message.")
      return
    }

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, subject, message }),
      })
      const data: { error?: string } = await res.json().catch(() => ({}))
      if (!res.ok) {
        setStatus("idle")
        setError(
          typeof data.error === "string"
            ? data.error
            : "We could not send your message. Please try again."
        )
        return
      }
      form.reset()
      setStatus("success")
    } catch {
      setStatus("idle")
      setError(
        "Network error. Please check your connection and try again."
      )
    }
  }, [])

  if (status === "success") {
    return (
      <div className="flex flex-col items-center justify-center gap-5 rounded-3xl bg-white px-8 py-20 text-center shadow-[0_10px_30px_rgba(0,0,0,0.05)]">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
          <CheckCircle className="h-6 w-6 text-primary" strokeWidth={1.5} />
        </div>
        <div className="flex flex-col gap-2">
          <h3 className="text-lg font-semibold text-foreground">
            Message Received
          </h3>
          <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
            {"Thank you for reaching out. Our team will review your inquiry and respond within one business day."}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setStatus("idle")
            setError(null)
          }}
          className="mt-2 rounded-2xl bg-white px-6 py-3 text-sm font-medium text-foreground transition-all duration-300 hover:bg-gray-50 active:scale-95 shadow-[0_10px_30px_rgba(0,0,0,0.05)] min-h-[48px]"
        >
          Send Another Message
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6 rounded-3xl bg-white p-8 shadow-[0_10px_30px_rgba(0,0,0,0.05)]">
      {/* Name */}
      <div className="flex flex-col gap-2">
        <label
          htmlFor="contact-name"
          className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground"
        >
          Full Name
        </label>
        <input
          id="contact-name"
          name="name"
          type="text"
          required
          placeholder="Dr. Jane Smith"
          className="rounded-xl border-0 bg-gray-50 px-6 py-4 text-sm text-foreground shadow-[0_10px_30px_rgba(0,0,0,0.05)] placeholder:text-muted-foreground/50 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[48px]"
        />
      </div>

      {/* Email */}
      <div className="flex flex-col gap-2">
        <label
          htmlFor="contact-email"
          className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground"
        >
          Email Address
        </label>
        <input
          id="contact-email"
          name="email"
          type="email"
          required
          placeholder="jane.smith@institution.edu"
          className="rounded-xl border-0 bg-gray-50 px-6 py-4 text-sm text-foreground shadow-[0_10px_30px_rgba(0,0,0,0.05)] placeholder:text-muted-foreground/50 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[48px]"
        />
      </div>

      {/* Subject */}
      <Select
        id="contact-subject"
        name="subject"
        label="Subject"
        placeholder="Select a topic"
        defaultValue=""
        options={[
          { value: "order", label: "Order Inquiry" },
          { value: "product", label: "Product Question" },
          { value: "shipping", label: "Shipping Issue" },
          { value: "order-issue", label: "Order Issue (non-return)" },
          { value: "wholesale", label: "Wholesale & Bulk Orders" },
          { value: "other", label: "Other" },
        ]}
      />

      {/* Message */}
      <div className="flex flex-col gap-2">
        <label
          htmlFor="contact-message"
          className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground"
        >
          Message
        </label>
        <textarea
          id="contact-message"
          name="message"
          required
          rows={5}
          placeholder="Please describe your inquiry in detail..."
          className="resize-none rounded-xl border-0 bg-gray-50 px-6 py-4 text-sm leading-relaxed text-foreground shadow-[0_10px_30px_rgba(0,0,0,0.05)] placeholder:text-muted-foreground/50 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {error ? (
        <p
          role="alert"
          className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          {error}
        </p>
      ) : null}

      {/* Submit */}
      <button
        type="submit"
        disabled={status === "submitting"}
        className="mt-2 inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-500 to-blue-600 px-8 py-4 text-sm font-medium text-white transition-all duration-300 hover:brightness-110 active:scale-95 disabled:pointer-events-none disabled:opacity-50 shadow-[0_10px_30px_rgba(0,0,0,0.05)] hover:shadow-[0_20px_40px_rgba(0,0,0,0.08)] min-h-[48px]"
      >
        {status === "submitting" ? (
          <>
            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            Sending...
          </>
        ) : (
          <>
            <Send className="h-3.5 w-3.5" strokeWidth={1.5} />
            Send Message
          </>
        )}
      </button>
    </form>
  )
}
