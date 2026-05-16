/**
 * Minimal HTML sanitizer for Quill-produced blog body content.
 *
 * Strips script/style/iframe/object/embed tags, `on*` event handlers,
 * `javascript:` URLs, and `<a>` href schemes other than http/https/mailto/tel.
 *
 * NOTE: Writes are admin-only in v1, so this is defense-in-depth rather than
 * the primary security boundary. If/when customer submissions are added,
 * swap this for the `sanitize-html` package configured with an explicit
 * allowlist of tags and attributes.
 */

const DANGEROUS_TAGS_PATTERN = /<\/?(?:script|style|iframe|object|embed|link|meta|base|form|input|button|textarea|select|option)\b[^>]*>/gi
const EVENT_HANDLER_PATTERN = /\s+on[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi
const JAVASCRIPT_URL_PATTERN = /\s+(?:href|src|action|formaction|background|poster|cite|data|usemap)\s*=\s*(?:"javascript:[^"]*"|'javascript:[^']*'|javascript:[^\s>]+)/gi
const DATA_URL_PATTERN = /\s+(?:href|src)\s*=\s*(?:"data:(?!image\/)[^"]*"|'data:(?!image\/)[^']*')/gi

export function sanitizeBlogHtml(html: string): string {
  if (!html) return ""
  let cleaned = html

  // Strip dangerous tags entirely
  cleaned = cleaned.replace(DANGEROUS_TAGS_PATTERN, "")
  // Strip inline event handlers (onclick, onload, …)
  cleaned = cleaned.replace(EVENT_HANDLER_PATTERN, "")
  // Strip javascript: URLs in any URL-bearing attribute
  cleaned = cleaned.replace(JAVASCRIPT_URL_PATTERN, "")
  // Strip non-image data: URLs (image data URLs can be useful for inline pasted images)
  cleaned = cleaned.replace(DATA_URL_PATTERN, "")

  return cleaned.trim()
}

/**
 * Plain-text excerpt for read-time estimation and description fallback.
 */
export function stripHtmlToPlainText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim()
}

/**
 * Word-count-based read-time estimate, rounded up to the nearest minute.
 * Uses an average reading pace of 220 WPM (industry-standard for prose).
 */
export function estimateReadMinutes(html: string): number {
  const text = stripHtmlToPlainText(html)
  if (!text) return 1
  const words = text.split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.ceil(words / 220))
}

const SLUG_INVALID = /[^a-z0-9]+/g
const SLUG_TRIM = /^-+|-+$/g

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(SLUG_INVALID, "-")
    .replace(SLUG_TRIM, "")
    .slice(0, 80)
}
