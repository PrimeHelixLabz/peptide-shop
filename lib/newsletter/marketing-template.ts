/**
 * Marketing email template — shared by the admin live-preview and the
 * server-side send so the two are byte-for-byte identical.
 *
 * IMPORTANT: this module must stay free of server-only imports (no Resend,
 * no crypto, no Supabase) — it is imported into a client component for the
 * preview. The per-recipient unsubscribe URL is computed by the caller and
 * passed in.
 *
 * The composer accepts a small, deliberately-constrained subset of Markdown.
 * Every supported construct maps to inline-styled, email-client-safe HTML —
 * what the admin sees in the preview is exactly what lands in the inbox.
 */

const BRAND_DARK = "#1e293b"
const TEXT_BODY = "#374151"
const MUTED = "#6b7280"

export const MARKETING_MARKDOWN_HELP = [
  "# Heading       — large heading",
  "## Subheading   — smaller heading",
  "**bold**        — bold text",
  "*italic*        — italic text",
  "[label](https://…) — a link",
  "- item          — bullet list",
  "1. item         — numbered list",
  "---             — divider line",
  "",
  "Tip: a line containing only a single link becomes a big button.",
].join("\n")

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
}

/**
 * Only allow URLs we're comfortable putting in a customer's inbox. Anything
 * else (javascript:, data:, etc.) collapses to "#" so a malformed/hostile
 * link can't ship. Input is already HTML-escaped by the time it gets here.
 */
function safeUrl(url: string): string {
  const trimmed = url.trim()
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  if (/^mailto:/i.test(trimmed)) return trimmed
  if (trimmed.startsWith("/")) return trimmed
  return "#"
}

const LINK_ONLY_RE = /^\[([^\]]+)\]\(([^)\s]+)\)$/

/** Render inline marks (links, bold, italic) within an already-escaped run. */
function renderInline(escaped: string): string {
  let s = escaped
  // Links: [label](url)
  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_m, label: string, url: string) => {
    return `<a href="${safeUrl(url)}" style="color:${BRAND_DARK};text-decoration:underline;">${label}</a>`
  })
  // Bold: **text**
  s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
  // Italic: *text*  (avoid eating the inner asterisks of bold, already consumed)
  s = s.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>')
  // Italic: _text_
  s = s.replace(/(^|[^A-Za-z0-9_])_([^_\n]+)_/g, "$1<em>$2</em>")
  return s
}

function button(label: string, url: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:20px auto;"><tr><td style="border-radius:10px;background-color:${BRAND_DARK};">
    <a href="${safeUrl(url)}" style="display:inline-block;padding:12px 28px;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;border-radius:10px;">${label}</a>
  </td></tr></table>`
}

/**
 * Convert the constrained Markdown into the HTML that fills the body of the
 * marketing email shell.
 */
export function renderMarketingMarkdown(markdown: string): string {
  const lines = (markdown ?? "").replace(/\r\n/g, "\n").split("\n")
  const blocks: string[] = []

  let paragraph: string[] = []
  let list: { ordered: boolean; items: string[] } | null = null

  const flushParagraph = () => {
    if (paragraph.length === 0) return
    const inner = paragraph
      .map((line) => renderInline(escapeHtml(line)))
      .join("<br>")
    blocks.push(
      `<p style="margin:0 0 16px;color:${TEXT_BODY};font-size:15px;line-height:1.7;">${inner}</p>`
    )
    paragraph = []
  }

  const flushList = () => {
    if (!list) return
    const tag = list.ordered ? "ol" : "ul"
    const items = list.items
      .map(
        (item) =>
          `<li style="margin:0 0 6px;color:${TEXT_BODY};font-size:15px;line-height:1.6;">${renderInline(
            escapeHtml(item)
          )}</li>`
      )
      .join("")
    blocks.push(
      `<${tag} style="margin:0 0 16px;padding-left:22px;color:${TEXT_BODY};">${items}</${tag}>`
    )
    list = null
  }

  const flushAll = () => {
    flushParagraph()
    flushList()
  }

  for (const rawLine of lines) {
    const line = rawLine.trimEnd()

    // Blank line → block boundary
    if (line.trim() === "") {
      flushAll()
      continue
    }

    // Horizontal rule
    if (/^---+$/.test(line.trim())) {
      flushAll()
      blocks.push(
        `<hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;">`
      )
      continue
    }

    // Headings
    const heading = /^(#{1,3})\s+(.*)$/.exec(line)
    if (heading) {
      flushAll()
      const level = heading[1].length
      const content = renderInline(escapeHtml(heading[2].trim()))
      const size = level === 1 ? 22 : level === 2 ? 18 : 16
      const top = blocks.length === 0 ? 0 : 24
      blocks.push(
        `<p style="margin:${top}px 0 12px;color:${BRAND_DARK};font-size:${size}px;font-weight:700;line-height:1.3;">${content}</p>`
      )
      continue
    }

    // Unordered list item
    const ul = /^[-*]\s+(.*)$/.exec(line)
    if (ul) {
      flushParagraph()
      if (!list || list.ordered) {
        flushList()
        list = { ordered: false, items: [] }
      }
      list.items.push(ul[1].trim())
      continue
    }

    // Ordered list item
    const ol = /^\d+\.\s+(.*)$/.exec(line)
    if (ol) {
      flushParagraph()
      if (!list || !list.ordered) {
        flushList()
        list = { ordered: true, items: [] }
      }
      list.items.push(ol[1].trim())
      continue
    }

    // A line that is solely a single link → render as a button.
    const linkOnly = LINK_ONLY_RE.exec(line.trim())
    if (linkOnly) {
      flushAll()
      blocks.push(
        button(escapeHtml(linkOnly[1].trim()), escapeHtml(linkOnly[2].trim()))
      )
      continue
    }

    // Otherwise accumulate into the current paragraph
    flushList()
    paragraph.push(line)
  }

  flushAll()
  return blocks.join("\n")
}

export interface MarketingEmailParams {
  subject: string
  /** Already-rendered body HTML from renderMarketingMarkdown(). */
  contentHtml: string
  /** Recipient address, shown in the footer for transparency. */
  recipientEmail: string
  /** Per-recipient one-click unsubscribe URL. Use "#" for previews. */
  unsubscribeUrl: string
}

/**
 * Wrap rendered body content in the branded PrimeHelix marketing shell.
 * Mirrors the transactional email shell (header / card / footer) so blasts
 * look consistent with order emails.
 */
export function buildMarketingEmailHtml(params: MarketingEmailParams): string {
  const safeEmail = escapeHtml(params.recipientEmail.trim())
  const safeSubject = escapeHtml(params.subject.trim())
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:24px;">
    <div style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">

      <!-- Header -->
      <div style="background-color:${BRAND_DARK};padding:24px;text-align:center;">
        <h1 style="margin:0;color:#ffffff;font-size:22px;letter-spacing:0.02em;">${safeSubject}</h1>
        <p style="margin:6px 0 0;color:#cbd5e1;font-size:13px;">PrimeHelix Labz</p>
      </div>

      <!-- Body -->
      <div style="padding:28px 24px;">
        ${params.contentHtml}
        <p style="margin:24px 0 0;color:${MUTED};font-size:13px;line-height:1.6;">
          — The PrimeHelix Labz Team
        </p>
      </div>

      <!-- Footer -->
      <div style="background-color:#f9fafb;padding:16px 20px;text-align:center;border-top:1px solid #e5e7eb;">
        <p style="margin:0 0 6px;color:${MUTED};font-size:12px;">
          You're receiving this because you subscribed at primehelixlabz.com with
          <strong>${safeEmail}</strong>.
          <a href="${params.unsubscribeUrl}" style="color:${BRAND_DARK};text-decoration:underline;">Unsubscribe</a>.
        </p>
        <p style="margin:0 0 6px;color:#9ca3af;font-size:11px;">
          PrimeHelix Labz &middot; 20403 N Lake Pleasant RD, Suite 117, Peoria, AZ 85382
        </p>
        <p style="margin:0;color:#9ca3af;font-size:11px;">
          All products are sold strictly for research purposes only. Not for human consumption.
        </p>
      </div>
    </div>
  </div>
</body>
</html>`
}
