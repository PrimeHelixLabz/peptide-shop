import { Resend } from "resend"
import type { Order } from "@/lib/db/schema"
import { formatPaymentMethod } from "@/lib/format-payment-method"
import {
  buildUnsubscribeUrl,
  buildUnsubscribeApiUrl,
} from "@/lib/newsletter/unsubscribe-token"
import {
  buildMarketingEmailHtml,
  renderMarketingMarkdown,
} from "@/lib/newsletter/marketing-template"
import { buildTrackingUrl, carrierLabel } from "@/lib/shipping/carriers"
import { createAdminClient } from "@/lib/supabase/admin"

const resend = new Resend(process.env.RESEND_API_KEY)

const FROM_EMAIL = "no-reply@primehelixlabz.com"
const SUPPORT_EMAIL = "support@primehelixlabz.com"
const DEV_EMAIL = "houyachun3@gmail.com"

const CONTACT_SUBJECT_LABELS = {
  order: "Order Inquiry",
  product: "Product Question",
  shipping: "Shipping Issue",
  "order-issue": "Order Issue (non-return)",
  wholesale: "Wholesale & Bulk Orders",
  other: "Other",
} as const

export type ContactSubject = keyof typeof CONTACT_SUBJECT_LABELS

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
}

export type ContactFormPayload = {
  name: string
  email: string
  subject: ContactSubject
  message: string
}

export async function sendContactFormEmail(payload: ContactFormPayload): Promise<void> {
  const topic = CONTACT_SUBJECT_LABELS[payload.subject]
  const safeName = escapeHtml(payload.name.trim())
  const safeEmail = escapeHtml(payload.email.trim())
  const safeTopic = escapeHtml(topic)
  const safeMessage = escapeHtml(payload.message.trim()).replace(/\r\n|\r|\n/g, "<br/>")

  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
      <div style="max-width: 600px; margin: 0 auto; padding: 24px;">
        <div style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); padding: 24px;">
          <h1 style="margin: 0 0 20px; color: #111827; font-size: 18px;">Website contact form</h1>
          <p style="margin: 8px 0; color: #4b5563;"><strong>Name:</strong> ${safeName}</p>
          <p style="margin: 8px 0; color: #4b5563;"><strong>Email:</strong> ${safeEmail}</p>
          <p style="margin: 8px 0; color: #4b5563;"><strong>Topic:</strong> ${safeTopic}</p>
          <div style="margin-top: 20px; padding-top: 16px; border-top: 1px solid #e5e7eb;">
            <p style="margin: 0 0 8px; color: #374151; font-size: 13px; text-transform: uppercase;">Message</p>
            <p style="margin: 0; color: #4b5563; line-height: 1.6;">${safeMessage}</p>
          </div>
        </div>
      </div>
    </body>
    </html>`

  const { error } = await resend.emails.send({
    from: `Prime Helix Labz <${FROM_EMAIL}>`,
    to: [SUPPORT_EMAIL, DEV_EMAIL],
    replyTo: payload.email.trim(),
    subject: `[Contact] ${topic} — ${payload.name.trim()}`,
    html,
  })

  if (error) {
    console.error("Failed to send contact form email:", error)
    throw new Error(error.message)
  }
}

function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`
}

function buildOrderItemsTable(items: Order["items"]): string {
  const rows = items
    .map(
      (item) => `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${item.productName}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">${item.quantity}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">${formatCurrency(item.price)}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">${formatCurrency(item.price * item.quantity)}</td>
      </tr>`
    )
    .join("")

  return `
    <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
      <thead>
        <tr style="background-color: #f9fafb;">
          <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e5e7eb; color: #374151;">Product</th>
          <th style="padding: 12px; text-align: center; border-bottom: 2px solid #e5e7eb; color: #374151;">Qty</th>
          <th style="padding: 12px; text-align: right; border-bottom: 2px solid #e5e7eb; color: #374151;">Price</th>
          <th style="padding: 12px; text-align: right; border-bottom: 2px solid #e5e7eb; color: #374151;">Total</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`
}

function buildShippingSection(address: Order["shippingAddress"]): string {
  const addr = address as any
  const name = addr.firstName && addr.lastName
    ? `${addr.firstName} ${addr.lastName}`
    : ""

  return `
    <div style="background-color: #f9fafb; padding: 16px; border-radius: 8px; margin: 16px 0;">
      <h3 style="margin: 0 0 8px; color: #374151; font-size: 14px; text-transform: uppercase;">Shipping Address</h3>
      ${name ? `<p style="margin: 4px 0; color: #4b5563;">${name}</p>` : ""}
      <p style="margin: 4px 0; color: #4b5563;">${addr.street}</p>
      <p style="margin: 4px 0; color: #4b5563;">${addr.city}, ${addr.state} ${addr.zipCode}</p>
      <p style="margin: 4px 0; color: #4b5563;">${addr.country}</p>
      ${addr.email ? `<p style="margin: 4px 0; color: #4b5563;">Email: ${addr.email}</p>` : ""}
      ${addr.phone ? `<p style="margin: 4px 0; color: #4b5563;">Phone: ${addr.phone}</p>` : ""}
    </div>`
}

export async function sendOrderNotificationEmail(order: Order): Promise<void> {
  const customerEmail = order.email || (order.shippingAddress as any)?.email || "N/A"
  // This notification only fires once an order is paid (every caller passes a
  // paid order). Lead with the payment state so support doesn't read it as an
  // unsettled "new order", and keep the fulfillment status clearly separate —
  // a freshly paid order is always "processing", which previously got mistaken
  // for the payment still being in progress.
  const isPaid = order.paymentStatus === "paid"
  const headerTitle = isPaid ? "Payment Received" : "New Order Received"

  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
      <div style="max-width: 600px; margin: 0 auto; padding: 24px;">
        <div style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">

          <!-- Header -->
          <div style="background-color: #1e293b; padding: 24px; text-align: center;">
            <h1 style="margin: 0; color: #ffffff; font-size: 22px;">${headerTitle}</h1>
          </div>

          <!-- Body -->
          <div style="padding: 24px;">
            <div style="background-color: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
              <p style="margin: 0; color: #065f46; font-weight: 600; font-size: 16px;">
                Order #${order.orderNumber}
              </p>
              <p style="margin: 8px 0 0; color: #065f46; font-weight: 700; font-size: 15px;">
                ${isPaid ? "&#10003; Payment received" : `Payment Status: ${order.paymentStatus.toUpperCase()}`}
              </p>
              <p style="margin: 4px 0 0; color: #6b7280; font-size: 13px;">
                Fulfillment status: ${order.status.toUpperCase()}
              </p>
            </div>

            <!-- Customer Info -->
            <div style="margin-bottom: 20px;">
              <h3 style="margin: 0 0 8px; color: #374151; font-size: 14px; text-transform: uppercase;">Customer</h3>
              <p style="margin: 4px 0; color: #4b5563;">Email: ${customerEmail}</p>
              ${order.userId ? `<p style="margin: 4px 0; color: #4b5563;">User ID: ${order.userId}</p>` : `<p style="margin: 4px 0; color: #6b7280; font-style: italic;">Guest checkout</p>`}
            </div>

            <!-- Order Items -->
            <h3 style="margin: 0 0 8px; color: #374151; font-size: 14px; text-transform: uppercase;">Order Items</h3>
            ${buildOrderItemsTable(order.items)}

            <!-- Totals -->
            <div style="text-align: right; margin: 16px 0;">
              <p style="margin: 4px 0; color: #6b7280;">Subtotal: ${formatCurrency(order.subtotal)}</p>
              ${order.discountAmount && order.discountAmount > 0 ? `<p style="margin: 4px 0; color: #065f46;">Discount${order.discountCode ? ` (${escapeHtml(order.discountCode)})` : ""}: -${formatCurrency(order.discountAmount)}</p>` : ""}
              <p style="margin: 4px 0; color: #6b7280;">Shipping: ${formatCurrency(order.shipping)}</p>
              <p style="margin: 4px 0; color: #6b7280;">Service Fee: ${formatCurrency(order.serviceFee)}</p>
              <p style="margin: 8px 0 0; color: #111827; font-size: 18px; font-weight: 700;">Total: ${formatCurrency(order.total)}</p>
            </div>

            <!-- Shipping Address -->
            ${buildShippingSection(order.shippingAddress)}

            <!-- Payment Method -->
            <div style="margin-top: 16px;">
              <p style="margin: 4px 0; color: #6b7280; font-size: 13px;">Payment Method: ${formatPaymentMethod(order.paymentMethod)}</p>
              ${order.notes ? `<p style="margin: 4px 0; color: #6b7280; font-size: 13px;">Notes: ${order.notes}</p>` : ""}
              <p style="margin: 4px 0; color: #6b7280; font-size: 13px;">Date: ${new Date(order.createdAt).toLocaleString("en-US", { timeZone: "America/New_York" })}</p>
            </div>
          </div>

          <!-- Footer -->
          <div style="background-color: #f9fafb; padding: 16px; text-align: center; border-top: 1px solid #e5e7eb;">
            <p style="margin: 0; color: #9ca3af; font-size: 12px;">
              This is an automated notification from Prime Helix Labz.
            </p>
          </div>
        </div>
      </div>
    </body>
    </html>`

  try {
    await resend.emails.send({
      from: `Prime Helix Labz <${FROM_EMAIL}>`,
      to: [SUPPORT_EMAIL],
      subject: `${isPaid ? "Payment received" : "New order"} — Order #${order.orderNumber} (${formatCurrency(order.total)})`,
      html,
    })
    console.log(`Order notification email sent for order ${order.orderNumber}`)
  } catch (error) {
    console.error("Failed to send order notification email:", error)
  }
}

function getCustomerEmail(order: Order): string | null {
  const fromOrder = order.email?.trim()
  if (fromOrder) return fromOrder
  const fromShipping = (order.shippingAddress as any)?.email?.trim()
  return fromShipping || null
}

function buildCustomerEmailShell(params: {
  headerColor: string
  headerTitle: string
  bannerColor: string
  bannerBorder: string
  bannerTextDark: string
  bannerTextLight: string
  bannerHeadline: string
  bannerSubline: string
  intro: string
  /**
   * Optional block-level HTML inserted between the intro paragraph and the
   * order items table. Must be valid block-level HTML (no inline-into-<p>
   * nesting) since it's rendered outside the intro paragraph wrapper.
   */
  bodyExtra?: string
  order: Order
}): string {
  const { order } = params
  return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
      <div style="max-width: 600px; margin: 0 auto; padding: 24px;">
        <div style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">

          <!-- Header -->
          <div style="background-color: ${params.headerColor}; padding: 24px; text-align: center;">
            <h1 style="margin: 0; color: #ffffff; font-size: 22px; letter-spacing: 0.02em;">${params.headerTitle}</h1>
            <p style="margin: 6px 0 0; color: #cbd5e1; font-size: 13px;">PrimeHelix Labz</p>
          </div>

          <!-- Body -->
          <div style="padding: 24px;">
            <div style="background-color: ${params.bannerColor}; border: 1px solid ${params.bannerBorder}; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
              <p style="margin: 0; color: ${params.bannerTextDark}; font-weight: 600; font-size: 16px;">${params.bannerHeadline}</p>
              <p style="margin: 4px 0 0; color: ${params.bannerTextLight}; font-size: 14px;">${params.bannerSubline}</p>
            </div>

            <p style="margin: 0 0 16px; color: #374151; font-size: 15px; line-height: 1.6;">${params.intro}</p>
            ${params.bodyExtra ?? ""}

            <!-- Order Items -->
            <h3 style="margin: 24px 0 8px; color: #374151; font-size: 14px; text-transform: uppercase;">Order Summary</h3>
            ${buildOrderItemsTable(order.items)}

            <!-- Totals -->
            <div style="text-align: right; margin: 16px 0;">
              <p style="margin: 4px 0; color: #6b7280;">Subtotal: ${formatCurrency(order.subtotal)}</p>
              ${order.discountAmount && order.discountAmount > 0 ? `<p style="margin: 4px 0; color: #065f46;">Discount${order.discountCode ? ` (${escapeHtml(order.discountCode)})` : ""}: -${formatCurrency(order.discountAmount)}</p>` : ""}
              <p style="margin: 4px 0; color: #6b7280;">Shipping: ${formatCurrency(order.shipping)}</p>
              ${order.serviceFee > 0 ? `<p style="margin: 4px 0; color: #6b7280;">Service Fee: ${formatCurrency(order.serviceFee)}</p>` : ""}
              <p style="margin: 8px 0 0; color: #111827; font-size: 18px; font-weight: 700;">Total: ${formatCurrency(order.total)}</p>
            </div>

            <!-- Shipping Address -->
            ${buildShippingSection(order.shippingAddress)}

            <p style="margin: 20px 0 0; color: #6b7280; font-size: 13px; line-height: 1.6;">
              Questions about your order? Reply to this email or contact us at
              <a href="mailto:${SUPPORT_EMAIL}" style="color: #1e293b;">${SUPPORT_EMAIL}</a>.
            </p>
          </div>

          <!-- Footer -->
          <div style="background-color: #f9fafb; padding: 16px; text-align: center; border-top: 1px solid #e5e7eb;">
            <p style="margin: 0 0 6px; color: #6b7280; font-size: 12px;">PrimeHelix Labz &middot; 20403 N Lake Pleasant RD, Suite 117, Peoria, AZ 85382</p>
            <p style="margin: 0; color: #9ca3af; font-size: 11px;">All products are sold strictly for research purposes only. Not for human consumption.</p>
          </div>
        </div>
      </div>
    </body>
    </html>`
}

export async function sendCustomerOrderPlacedEmail(order: Order): Promise<void> {
  const to = getCustomerEmail(order)
  if (!to) {
    console.warn(`No customer email for order ${order.orderNumber}; skipping placed-confirmation email`)
    return
  }

  const html = buildCustomerEmailShell({
    headerColor: "#1e293b",
    headerTitle: "Order Received",
    bannerColor: "#fff7ed",
    bannerBorder: "#fed7aa",
    bannerTextDark: "#9a3412",
    bannerTextLight: "#c2410c",
    bannerHeadline: `Order #${order.orderNumber}`,
    bannerSubline: "Status: payment processing",
    intro:
      "Thanks for your order. We've received it and your payment is currently being processed by your bank. This usually takes a few business days to clear. We'll email you again as soon as your payment is confirmed, and we'll begin preparing your order for shipment then.",
    order,
  })

  try {
    await resend.emails.send({
      from: `PrimeHelix Labz <${FROM_EMAIL}>`,
      to: [to],
      replyTo: SUPPORT_EMAIL,
      subject: `Order #${order.orderNumber} received — payment processing`,
      html,
    })
    console.log(`Customer order-placed email sent for order ${order.orderNumber}`)
  } catch (error) {
    console.error("Failed to send customer order-placed email:", error)
  }
}

interface WelcomeArticle {
  title: string
  url: string
  description: string
}

const WELCOME_ARTICLES: WelcomeArticle[] = [
  {
    title: "BPC-157 Research Guide",
    url: "https://www.primehelixlabz.com/blog/bpc-157-research-guide",
    description:
      "Structure, mechanisms studied in animal models, and what published preclinical literature reports.",
  },
  {
    title: "BPC-157 vs TB-500",
    url: "https://www.primehelixlabz.com/blog/bpc-157-vs-tb-500",
    description:
      "How these two tissue-repair peptides differ structurally and mechanistically.",
  },
  {
    title: "Peptide Storage Guide",
    url: "https://www.primehelixlabz.com/blog/peptide-storage-guide",
    description:
      "Lyophilized vs reconstituted, temperature, freeze-thaw, and shelf life in the lab.",
  },
  {
    title: "How to Read a Certificate of Analysis",
    url: "https://www.primehelixlabz.com/blog/how-to-read-peptide-coa",
    description:
      "Field-by-field walkthrough of a peptide COA, plus the red flags to watch for.",
  },
  {
    title: "GHK-Cu Research Overview",
    url: "https://www.primehelixlabz.com/blog/ghk-cu-research-overview",
    description:
      "The copper-binding tripeptide, its mechanisms in dermal-research literature, and lab handling.",
  },
]

const SITE_ORIGIN = "https://www.primehelixlabz.com"

export async function sendNewsletterWelcomeEmail(toEmail: string): Promise<void> {
  const safeEmail = escapeHtml(toEmail.trim())
  // Body link → confirm page; header → API endpoint that handles one-click POST.
  const unsubscribeUrl = buildUnsubscribeUrl(toEmail.trim(), SITE_ORIGIN)
  const unsubscribeApiUrl = buildUnsubscribeApiUrl(toEmail.trim(), SITE_ORIGIN)

  const articleCards = WELCOME_ARTICLES.map(
    (a) => `
      <a href="${a.url}" style="display: block; text-decoration: none; margin: 12px 0; padding: 16px; background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 10px; color: #111827;">
        <p style="margin: 0 0 6px; font-weight: 600; color: #1e293b; font-size: 15px;">${a.title}</p>
        <p style="margin: 0; color: #4b5563; font-size: 13px; line-height: 1.5;">${a.description}</p>
      </a>`
  ).join("")

  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
      <div style="max-width: 600px; margin: 0 auto; padding: 24px;">
        <div style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">

          <!-- Header -->
          <div style="background-color: #1e293b; padding: 28px 24px; text-align: center;">
            <h1 style="margin: 0; color: #ffffff; font-size: 22px; letter-spacing: 0.02em;">Welcome to PrimeHelix Labz</h1>
            <p style="margin: 8px 0 0; color: #cbd5e1; font-size: 13px;">Your peptide research guide is below.</p>
          </div>

          <!-- Body -->
          <div style="padding: 28px 24px;">
            <p style="margin: 0 0 16px; color: #374151; font-size: 15px; line-height: 1.65;">
              Thanks for subscribing. As promised, here is our complete peptide research
              guide &mdash; five field-tested articles covering the most-studied
              compounds, lab handling, and how to evaluate quality documentation.
              Bookmark them, share them with your lab, and refer back as you need.
            </p>

            <h2 style="margin: 28px 0 8px; color: #111827; font-size: 16px;">Your research library</h2>
            ${articleCards}

            <div style="margin-top: 28px; padding: 16px; background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 10px;">
              <p style="margin: 0; color: #1e3a8a; font-size: 14px; line-height: 1.6;">
                <strong>What to expect from us:</strong> occasional emails when we
                publish new research articles or add new compounds to the catalog.
                No spam &mdash; we email only when there&rsquo;s something worth your
                time.
              </p>
            </div>

            <p style="margin: 28px 0 0; color: #4b5563; font-size: 14px; line-height: 1.6;">
              Browse our full catalog at
              <a href="https://www.primehelixlabz.com/shop" style="color: #1e293b; font-weight: 500;">primehelixlabz.com/shop</a>.
              All products ship with a lot-specific Certificate of Analysis.
            </p>

            <p style="margin: 24px 0 0; color: #6b7280; font-size: 13px; line-height: 1.6;">
              Questions? Reply to this email or reach us at
              <a href="mailto:${SUPPORT_EMAIL}" style="color: #1e293b;">${SUPPORT_EMAIL}</a>.
            </p>
          </div>

          <!-- Footer -->
          <div style="background-color: #f9fafb; padding: 16px 20px; text-align: center; border-top: 1px solid #e5e7eb;">
            <p style="margin: 0 0 6px; color: #6b7280; font-size: 12px;">
              You received this because you subscribed at primehelixlabz.com
              with the email <strong>${safeEmail}</strong>.
              <a href="${unsubscribeUrl}" style="color: #1e293b; text-decoration: underline;">Unsubscribe</a>.
            </p>
            <p style="margin: 0 0 6px; color: #9ca3af; font-size: 11px;">
              PrimeHelix Labz &middot; 20403 N Lake Pleasant RD, Suite 117, Peoria, AZ 85382
            </p>
            <p style="margin: 0; color: #9ca3af; font-size: 11px;">
              All products are sold strictly for research purposes only. Not for human consumption.
            </p>
          </div>
        </div>
      </div>
    </body>
    </html>`

  const { error } = await resend.emails.send({
    from: `PrimeHelix Labz <${FROM_EMAIL}>`,
    to: [toEmail.trim()],
    replyTo: SUPPORT_EMAIL,
    subject: "Your peptide research guide is here",
    html,
    // RFC 8058 List-Unsubscribe headers — Gmail/Outlook surface a native
    // "Unsubscribe" button when these are present. Both header and one-click
    // POST URL are required for the one-click flow.
    headers: {
      "List-Unsubscribe": `<${unsubscribeApiUrl}>, <mailto:${SUPPORT_EMAIL}?subject=unsubscribe>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
  })

  if (error) {
    console.error("Failed to send newsletter welcome email:", error)
    throw new Error(error.message)
  }
}

export async function sendShippingConfirmationEmail(order: Order): Promise<void> {
  const to = getCustomerEmail(order)
  if (!to) {
    console.warn(
      `No customer email for order ${order.orderNumber}; skipping shipping email`
    )
    return
  }

  const trackingNumber = order.trackingNumber?.trim() || ""
  const carrierKey = order.trackingCarrier?.trim() || ""
  const trackingUrl = buildTrackingUrl(carrierKey, trackingNumber)
  const carrierName = carrierLabel(carrierKey)

  // Tracking banner: when we have a real URL, render a CTA button; when we
  // only have a number but no carrier (or "other"), render bare text.
  const trackingBlock = trackingNumber
    ? trackingUrl
      ? `
        <div style="margin: 20px 0; padding: 20px; background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; text-align: center;">
          <p style="margin: 0 0 6px; color: #14532d; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em;">
            ${escapeHtml(carrierName)} tracking
          </p>
          <p style="margin: 0 0 14px; color: #065f46; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 18px; font-weight: 600; word-break: break-all;">
            ${escapeHtml(trackingNumber)}
          </p>
          <a href="${trackingUrl}" style="display: inline-block; background-color: #065f46; color: #ffffff; text-decoration: none; padding: 11px 22px; border-radius: 10px; font-weight: 500; font-size: 14px;">
            Track shipment
          </a>
        </div>`
      : `
        <div style="margin: 20px 0; padding: 16px 20px; background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 12px;">
          <p style="margin: 0 0 4px; color: #6b7280; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em;">
            ${escapeHtml(carrierName)} tracking number
          </p>
          <p style="margin: 0; color: #111827; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 16px; font-weight: 600; word-break: break-all;">
            ${escapeHtml(trackingNumber)}
          </p>
        </div>`
    : ""

  const html = buildCustomerEmailShell({
    headerColor: "#065f46",
    headerTitle: "Your order is on the way",
    bannerColor: "#ecfdf5",
    bannerBorder: "#a7f3d0",
    bannerTextDark: "#065f46",
    bannerTextLight: "#047857",
    bannerHeadline: `Order #${order.orderNumber} shipped`,
    bannerSubline: trackingNumber
      ? `Carrier: ${carrierName}`
      : "Tracking details will follow shortly.",
    intro: trackingNumber
      ? "Good news — your order is in transit. Use the tracking number below to follow its progress."
      : "Good news — your order is in transit. We're confirming the carrier details and will update you shortly.",
    bodyExtra: trackingBlock,
    order,
  })

  try {
    await resend.emails.send({
      from: `PrimeHelix Labz <${FROM_EMAIL}>`,
      to: [to],
      replyTo: SUPPORT_EMAIL,
      subject: `Order #${order.orderNumber} shipped${trackingNumber ? ` — tracking ${trackingNumber}` : ""}`,
      html,
    })
    console.log(`Shipping confirmation email sent for order ${order.orderNumber}`)
  } catch (error) {
    console.error("Failed to send shipping confirmation email:", error)
  }
}

/**
 * Bulk-lookup of product slugs by id, used to build deep links from emails
 * back to individual product pages. Returns a Map keyed by productId — items
 * whose product no longer exists are simply absent from the map so callers
 * can skip them gracefully.
 */
async function fetchProductSlugs(
  productIds: string[]
): Promise<Map<string, string>> {
  const result = new Map<string, string>()
  if (productIds.length === 0) return result
  const unique = Array.from(new Set(productIds))
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from("products")
      .select("id, slug")
      .in("id", unique)
    if (error || !data) return result
    for (const row of data as unknown as { id: string; slug: string }[]) {
      if (row.slug) result.set(row.id, row.slug)
    }
  } catch (err) {
    console.error("fetchProductSlugs failed:", err)
  }
  return result
}

/**
 * Post-delivery review request. Fires once when an order transitions into
 * 'delivered' status. Each purchased product gets its own "Leave a review"
 * CTA that deep-links to the product page's reviews section. Items whose
 * product was deleted between purchase and now are silently omitted.
 *
 * The verified-purchase constraint in /api/reviews matches against the
 * user's paid orders, so any link in this email will succeed at submit
 * time — the customer can't accidentally get blocked by the gate.
 */
export async function sendCustomerReviewRequestEmail(order: Order): Promise<void> {
  const to = getCustomerEmail(order)
  if (!to) {
    console.warn(
      `No customer email for order ${order.orderNumber}; skipping review request`
    )
    return
  }
  if (!order.items?.length) return

  const slugMap = await fetchProductSlugs(order.items.map((i) => i.productId))
  // Dedupe by productId — if the customer bought two variants of the same
  // product we only need to ask for one review.
  const seen = new Set<string>()
  const reviewableItems = order.items.filter((item) => {
    if (seen.has(item.productId)) return false
    if (!slugMap.has(item.productId)) return false
    seen.add(item.productId)
    return true
  })
  if (reviewableItems.length === 0) {
    console.warn(
      `Order ${order.orderNumber} has no reviewable items (all products missing); skipping review request`
    )
    return
  }

  const itemCards = reviewableItems
    .map((item) => {
      const slug = slugMap.get(item.productId)!
      const url = `${SITE_ORIGIN}/shop/${slug}#reviews`
      // Strip the "(SKU)" suffix the order pipeline adds to productName so
      // the email reads like the product page title rather than a SKU-tagged
      // line item.
      const cleanName = item.productName.replace(/\s*\([^)]+\)\s*$/, "")
      return `
        <div style="display: block; margin: 12px 0; padding: 16px; background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 10px;">
          <p style="margin: 0 0 12px; font-weight: 600; color: #1e293b; font-size: 15px;">${escapeHtml(cleanName)}</p>
          <a href="${url}" style="display: inline-block; background-color: #1e293b; color: #ffffff; text-decoration: none; padding: 10px 18px; border-radius: 10px; font-weight: 500; font-size: 13px;">
            Leave a review
          </a>
        </div>`
    })
    .join("")

  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
      <div style="max-width: 600px; margin: 0 auto; padding: 24px;">
        <div style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">

          <div style="background-color: #1e293b; padding: 28px 24px; text-align: center;">
            <h1 style="margin: 0; color: #ffffff; font-size: 22px; letter-spacing: 0.02em;">How was your order?</h1>
            <p style="margin: 8px 0 0; color: #cbd5e1; font-size: 13px;">PrimeHelix Labz</p>
          </div>

          <div style="padding: 28px 24px;">
            <p style="margin: 0 0 16px; color: #374151; font-size: 15px; line-height: 1.65;">
              Thanks for your recent order. If you&rsquo;ve had a chance to work
              with what you received, other researchers would benefit from
              hearing about it. Reviews from verified buyers like you are the
              #1 trust signal new buyers use to evaluate research-peptide
              suppliers.
            </p>

            <p style="margin: 0 0 8px; color: #374151; font-size: 14px; font-weight: 600;">
              Order #${order.orderNumber}
            </p>
            ${itemCards}

            <p style="margin: 24px 0 0; color: #6b7280; font-size: 13px; line-height: 1.6;">
              Reviews are tied to your verified purchase so we never publish
              anonymous or bot reviews. You can edit or remove anything you
              post at any time.
            </p>
            <p style="margin: 16px 0 0; color: #6b7280; font-size: 13px; line-height: 1.6;">
              Questions or issues with the order? Reply to this email or reach
              <a href="mailto:${SUPPORT_EMAIL}" style="color: #1e293b;">${SUPPORT_EMAIL}</a>.
            </p>
          </div>

          <div style="background-color: #f9fafb; padding: 16px 20px; text-align: center; border-top: 1px solid #e5e7eb;">
            <p style="margin: 0 0 6px; color: #9ca3af; font-size: 11px;">
              PrimeHelix Labz &middot; 20403 N Lake Pleasant RD, Suite 117, Peoria, AZ 85382
            </p>
            <p style="margin: 0; color: #9ca3af; font-size: 11px;">
              All products are sold strictly for research purposes only. Not for human consumption.
            </p>
          </div>
        </div>
      </div>
    </body>
    </html>`

  try {
    await resend.emails.send({
      from: `PrimeHelix Labz <${FROM_EMAIL}>`,
      to: [to],
      replyTo: SUPPORT_EMAIL,
      subject: `How was your order from PrimeHelix Labz?`,
      html,
    })
    console.log(`Review request email sent for order ${order.orderNumber}`)
  } catch (error) {
    console.error("Failed to send review request email:", error)
  }
}

export type AffiliateApplicationPayload = {
  name: string
  email: string
  website?: string | null
  audience?: string | null
  payoutMethod?: string | null
  payoutDetails?: string | null
}

export async function sendAffiliateApplicationNotificationEmail(
  payload: AffiliateApplicationPayload
): Promise<void> {
  const safeName = escapeHtml(payload.name.trim())
  const safeEmail = escapeHtml(payload.email.trim())
  const safeWebsite = payload.website ? escapeHtml(payload.website.trim()) : ""
  const safeAudience = payload.audience
    ? escapeHtml(payload.audience.trim()).replace(/\r\n|\r|\n/g, "<br/>")
    : ""
  const safePayoutMethod = payload.payoutMethod
    ? escapeHtml(payload.payoutMethod.trim())
    : ""
  const safePayoutDetails = payload.payoutDetails
    ? escapeHtml(payload.payoutDetails.trim())
    : ""

  const row = (label: string, value: string) =>
    `<p style="margin: 8px 0; color: #4b5563;"><strong>${label}:</strong> ${value}</p>`

  const adminUrl = `${SITE_ORIGIN}/admin/affiliates`

  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
      <div style="max-width: 600px; margin: 0 auto; padding: 24px;">
        <div style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); padding: 24px;">
          <h1 style="margin: 0 0 20px; color: #111827; font-size: 18px;">New affiliate application</h1>
          ${row("Name", safeName)}
          ${row("Email", safeEmail)}
          ${safeWebsite ? row("Website", `<a href="${safeWebsite}" style="color: #1e293b;">${safeWebsite}</a>`) : ""}
          ${safePayoutMethod ? row("Payout method", safePayoutMethod) : ""}
          ${safePayoutDetails ? row("Payout details", safePayoutDetails) : ""}
          ${
            safeAudience
              ? `<div style="margin-top: 20px; padding-top: 16px; border-top: 1px solid #e5e7eb;">
                  <p style="margin: 0 0 8px; color: #374151; font-size: 13px; text-transform: uppercase;">Audience</p>
                  <p style="margin: 0; color: #4b5563; line-height: 1.6;">${safeAudience}</p>
                </div>`
              : ""
          }
          <p style="margin: 24px 0 0;">
            <a href="${adminUrl}" style="display: inline-block; background-color: #1e293b; color: #ffffff; text-decoration: none; padding: 11px 22px; border-radius: 10px; font-weight: 500; font-size: 14px;">
              Review in admin
            </a>
          </p>
        </div>
      </div>
    </body>
    </html>`

  const { error } = await resend.emails.send({
    from: `PrimeHelix Labz <${FROM_EMAIL}>`,
    to: [SUPPORT_EMAIL],
    replyTo: payload.email.trim(),
    subject: `[Affiliate] New application — ${payload.name.trim()}`,
    html,
  })

  if (error) {
    console.error("Failed to send affiliate application notification email:", error)
    throw new Error(error.message)
  }
}

export async function sendAffiliateApprovedEmail(params: {
  toEmail: string
  name: string
  code: string
  commissionRatePercent: number
}): Promise<void> {
  const safeName = escapeHtml(params.name)
  const safeCode = escapeHtml(params.code)
  const ratePct = Math.round(params.commissionRatePercent)
  const referralUrl = `${SITE_ORIGIN}/?ref=${encodeURIComponent(params.code)}`
  const shopReferralUrl = `${SITE_ORIGIN}/shop?ref=${encodeURIComponent(params.code)}`
  const dashboardUrl = `${SITE_ORIGIN}/affiliates/dashboard`

  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
      <div style="max-width: 600px; margin: 0 auto; padding: 24px;">
        <div style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">

          <div style="background-color: #065f46; padding: 28px 24px; text-align: center;">
            <h1 style="margin: 0; color: #ffffff; font-size: 22px; letter-spacing: 0.02em;">You're in</h1>
            <p style="margin: 8px 0 0; color: #a7f3d0; font-size: 13px;">PrimeHelix Labz Affiliate Program</p>
          </div>

          <div style="padding: 28px 24px;">
            <p style="margin: 0 0 16px; color: #111827; font-size: 16px; line-height: 1.6;">
              Hi ${safeName},
            </p>
            <p style="margin: 0 0 16px; color: #374151; font-size: 15px; line-height: 1.65;">
              Your application is approved. You can start earning
              <strong>${ratePct}%</strong> on every paid order placed through your
              referral link, with a 90-day attribution window.
            </p>

            <div style="margin: 24px 0; padding: 16px 18px; background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 10px;">
              <p style="margin: 0 0 8px; color: #6b7280; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em;">
                Your referral code
              </p>
              <p style="margin: 0; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 22px; font-weight: 600; color: #1e293b;">
                ${safeCode}
              </p>
            </div>

            <p style="margin: 16px 0 8px; color: #374151; font-size: 14px;">
              <strong>Quick share links:</strong>
            </p>
            <ul style="margin: 0 0 20px; padding-left: 18px; color: #4b5563; font-size: 14px; line-height: 1.6;">
              <li><a href="${referralUrl}" style="color: #1e293b;">${referralUrl}</a></li>
              <li><a href="${shopReferralUrl}" style="color: #1e293b;">${shopReferralUrl}</a></li>
            </ul>

            <p style="margin: 0 0 20px; color: #374151; font-size: 14px; line-height: 1.6;">
              Track conversions, see earnings, and copy share-ready links from
              your dashboard:
            </p>
            <p style="margin: 0 0 24px;">
              <a href="${dashboardUrl}" style="display: inline-block; background-color: #1e293b; color: #ffffff; text-decoration: none; padding: 12px 22px; border-radius: 12px; font-weight: 500; font-size: 14px;">
                Open dashboard
              </a>
            </p>

            <p style="margin: 24px 0 0; color: #6b7280; font-size: 13px; line-height: 1.6;">
              Reminder of the rules: no Google/Meta/TikTok paid ads (those
              platforms ban this niche), no medical or dosing claims, no
              coupon-site spam. Stick to your audience and you'll be fine.
            </p>
            <p style="margin: 16px 0 0; color: #6b7280; font-size: 13px; line-height: 1.6;">
              Questions? Reply to this email or reach
              <a href="mailto:${SUPPORT_EMAIL}" style="color: #1e293b;">${SUPPORT_EMAIL}</a>.
            </p>
          </div>

          <div style="background-color: #f9fafb; padding: 16px 20px; text-align: center; border-top: 1px solid #e5e7eb;">
            <p style="margin: 0 0 6px; color: #9ca3af; font-size: 11px;">
              PrimeHelix Labz &middot; 20403 N Lake Pleasant RD, Suite 117, Peoria, AZ 85382
            </p>
            <p style="margin: 0; color: #9ca3af; font-size: 11px;">
              All products are sold strictly for research purposes only. Not for human consumption.
            </p>
          </div>
        </div>
      </div>
    </body>
    </html>`

  const { error } = await resend.emails.send({
    from: `PrimeHelix Labz <${FROM_EMAIL}>`,
    to: [params.toEmail.trim()],
    replyTo: SUPPORT_EMAIL,
    subject: "You're approved — your PrimeHelix Labz affiliate code is ready",
    html,
  })

  if (error) {
    console.error("Failed to send affiliate approval email:", error)
    throw new Error(error.message)
  }
}

export async function sendAffiliateDeclinedEmail(params: {
  toEmail: string
  name: string
}): Promise<void> {
  const safeName = escapeHtml(params.name)

  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
      <div style="max-width: 600px; margin: 0 auto; padding: 24px;">
        <div style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">

          <div style="background-color: #1e293b; padding: 28px 24px; text-align: center;">
            <h1 style="margin: 0; color: #ffffff; font-size: 22px; letter-spacing: 0.02em;">Affiliate application update</h1>
            <p style="margin: 8px 0 0; color: #cbd5e1; font-size: 13px;">PrimeHelix Labz Affiliate Program</p>
          </div>

          <div style="padding: 28px 24px;">
            <p style="margin: 0 0 16px; color: #111827; font-size: 16px; line-height: 1.6;">
              Hi ${safeName},
            </p>
            <p style="margin: 0 0 16px; color: #374151; font-size: 15px; line-height: 1.65;">
              Thanks for your interest in the PrimeHelix Labz affiliate program.
              After reviewing your application, we're not able to approve it at
              this time.
            </p>
            <p style="margin: 0 0 16px; color: #374151; font-size: 15px; line-height: 1.65;">
              This isn't necessarily final — if your audience or channels change,
              you're welcome to reapply down the road. If you believe this was a
              mistake or have questions, just reply to this email.
            </p>
            <p style="margin: 24px 0 0; color: #6b7280; font-size: 13px; line-height: 1.6;">
              Reach us any time at
              <a href="mailto:${SUPPORT_EMAIL}" style="color: #1e293b;">${SUPPORT_EMAIL}</a>.
            </p>
          </div>

          <div style="background-color: #f9fafb; padding: 16px 20px; text-align: center; border-top: 1px solid #e5e7eb;">
            <p style="margin: 0 0 6px; color: #9ca3af; font-size: 11px;">
              PrimeHelix Labz &middot; 20403 N Lake Pleasant RD, Suite 117, Peoria, AZ 85382
            </p>
            <p style="margin: 0; color: #9ca3af; font-size: 11px;">
              All products are sold strictly for research purposes only. Not for human consumption.
            </p>
          </div>
        </div>
      </div>
    </body>
    </html>`

  const { error } = await resend.emails.send({
    from: `PrimeHelix Labz <${FROM_EMAIL}>`,
    to: [params.toEmail.trim()],
    replyTo: SUPPORT_EMAIL,
    subject: "Update on your PrimeHelix Labz affiliate application",
    html,
  })

  if (error) {
    console.error("Failed to send affiliate declined email:", error)
    throw new Error(error.message)
  }
}

export async function sendAffiliateSuspendedEmail(params: {
  toEmail: string
  name: string
}): Promise<void> {
  const safeName = escapeHtml(params.name)
  const dashboardUrl = `${SITE_ORIGIN}/affiliates/dashboard`

  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
      <div style="max-width: 600px; margin: 0 auto; padding: 24px;">
        <div style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">

          <div style="background-color: #7f1d1d; padding: 28px 24px; text-align: center;">
            <h1 style="margin: 0; color: #ffffff; font-size: 22px; letter-spacing: 0.02em;">Affiliate account suspended</h1>
            <p style="margin: 8px 0 0; color: #fecaca; font-size: 13px;">PrimeHelix Labz Affiliate Program</p>
          </div>

          <div style="padding: 28px 24px;">
            <p style="margin: 0 0 16px; color: #111827; font-size: 16px; line-height: 1.6;">
              Hi ${safeName},
            </p>
            <p style="margin: 0 0 16px; color: #374151; font-size: 15px; line-height: 1.65;">
              Your PrimeHelix Labz affiliate account has been suspended. Your
              referral links will no longer track new conversions while the
              account is in this state.
            </p>
            <p style="margin: 0 0 16px; color: #374151; font-size: 15px; line-height: 1.65;">
              To be clear: any commissions you've already earned still stand and
              will be paid out per the normal schedule — suspension only stops
              <em>new</em> referrals from being credited.
            </p>
            <p style="margin: 0 0 16px; color: #374151; font-size: 15px; line-height: 1.65;">
              If you think this was a mistake or want to discuss reinstatement,
              reply to this email and we'll take a look.
            </p>
            <p style="margin: 0 0 24px;">
              <a href="${dashboardUrl}" style="display: inline-block; background-color: #1e293b; color: #ffffff; text-decoration: none; padding: 12px 22px; border-radius: 12px; font-weight: 500; font-size: 14px;">
                View dashboard
              </a>
            </p>
            <p style="margin: 24px 0 0; color: #6b7280; font-size: 13px; line-height: 1.6;">
              Questions? Reach us at
              <a href="mailto:${SUPPORT_EMAIL}" style="color: #1e293b;">${SUPPORT_EMAIL}</a>.
            </p>
          </div>

          <div style="background-color: #f9fafb; padding: 16px 20px; text-align: center; border-top: 1px solid #e5e7eb;">
            <p style="margin: 0 0 6px; color: #9ca3af; font-size: 11px;">
              PrimeHelix Labz &middot; 20403 N Lake Pleasant RD, Suite 117, Peoria, AZ 85382
            </p>
            <p style="margin: 0; color: #9ca3af; font-size: 11px;">
              All products are sold strictly for research purposes only. Not for human consumption.
            </p>
          </div>
        </div>
      </div>
    </body>
    </html>`

  const { error } = await resend.emails.send({
    from: `PrimeHelix Labz <${FROM_EMAIL}>`,
    to: [params.toEmail.trim()],
    replyTo: SUPPORT_EMAIL,
    subject: "Your PrimeHelix Labz affiliate account has been suspended",
    html,
  })

  if (error) {
    console.error("Failed to send affiliate suspended email:", error)
    throw new Error(error.message)
  }
}

export async function sendCustomerOrderConfirmedEmail(order: Order): Promise<void> {
  const to = getCustomerEmail(order)
  if (!to) {
    console.warn(`No customer email for order ${order.orderNumber}; skipping paid-confirmation email`)
    return
  }

  const html = buildCustomerEmailShell({
    headerColor: "#065f46",
    headerTitle: "Payment Confirmed",
    bannerColor: "#ecfdf5",
    bannerBorder: "#a7f3d0",
    bannerTextDark: "#065f46",
    bannerTextLight: "#047857",
    bannerHeadline: `Order #${order.orderNumber} confirmed`,
    bannerSubline: `Total paid: ${formatCurrency(order.total)}`,
    intro:
      "Good news — your payment has cleared and your order is now being processed for shipment. You'll receive tracking details by email as soon as your order ships.",
    order,
  })

  try {
    await resend.emails.send({
      from: `PrimeHelix Labz <${FROM_EMAIL}>`,
      to: [to],
      replyTo: SUPPORT_EMAIL,
      subject: `Order #${order.orderNumber} confirmed — payment received`,
      html,
    })
    console.log(`Customer paid-confirmation email sent for order ${order.orderNumber}`)
  } catch (error) {
    console.error("Failed to send customer paid-confirmation email:", error)
  }
}

interface RestockNotificationParams {
  toEmail: string
  productName: string
  variantSku: string
  productUrl: string
  productImage?: string
  unsubscribeUrl: string
}

export async function sendRestockNotificationEmail(
  params: RestockNotificationParams
): Promise<void> {
  const safeProductName = escapeHtml(params.productName)
  const safeVariantSku = escapeHtml(params.variantSku)
  const imageBlock = params.productImage
    ? `
      <div style="margin: 16px 0; text-align: center;">
        <img src="${params.productImage}" alt="${safeProductName}" style="max-width: 240px; height: auto; border-radius: 12px; border: 1px solid #e5e7eb;" />
      </div>`
    : ""

  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
      <div style="max-width: 600px; margin: 0 auto; padding: 24px;">
        <div style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">

          <div style="background-color: #065f46; padding: 28px 24px; text-align: center;">
            <h1 style="margin: 0; color: #ffffff; font-size: 22px; letter-spacing: 0.02em;">Back in stock</h1>
            <p style="margin: 8px 0 0; color: #a7f3d0; font-size: 13px;">PrimeHelix Labz</p>
          </div>

          <div style="padding: 28px 24px;">
            <p style="margin: 0 0 16px; color: #111827; font-size: 16px; line-height: 1.6;">
              Good news &mdash; <strong>${safeProductName} (${safeVariantSku})</strong>
              is back in stock and available to order.
            </p>

            ${imageBlock}

            <p style="margin: 16px 0 24px; color: #374151; font-size: 15px; line-height: 1.65;">
              Restocks of this compound move quickly. We recommend ordering soon
              if you want to avoid the next wait.
            </p>

            <p style="margin: 0 0 28px; text-align: center;">
              <a href="${params.productUrl}" style="display: inline-block; background-color: #1e293b; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 12px; font-weight: 500; font-size: 15px;">
                View product
              </a>
            </p>

            <p style="margin: 20px 0 0; color: #6b7280; font-size: 13px; line-height: 1.6;">
              Questions? Reply to this email or reach
              <a href="mailto:${SUPPORT_EMAIL}" style="color: #1e293b;">${SUPPORT_EMAIL}</a>.
            </p>
          </div>

          <div style="background-color: #f9fafb; padding: 16px 20px; text-align: center; border-top: 1px solid #e5e7eb;">
            <p style="margin: 0 0 6px; color: #6b7280; font-size: 12px;">
              You received this because you asked us to notify you when this
              product was restocked.
              <a href="${params.unsubscribeUrl}" style="color: #1e293b; text-decoration: underline;">Unsubscribe</a>.
            </p>
            <p style="margin: 0 0 6px; color: #9ca3af; font-size: 11px;">
              PrimeHelix Labz &middot; 20403 N Lake Pleasant RD, Suite 117, Peoria, AZ 85382
            </p>
            <p style="margin: 0; color: #9ca3af; font-size: 11px;">
              All products are sold strictly for research purposes only. Not for human consumption.
            </p>
          </div>
        </div>
      </div>
    </body>
    </html>`

  const { error } = await resend.emails.send({
    from: `PrimeHelix Labz <${FROM_EMAIL}>`,
    to: [params.toEmail.trim()],
    replyTo: SUPPORT_EMAIL,
    subject: `Back in stock: ${params.productName} (${params.variantSku})`,
    html,
    headers: {
      "List-Unsubscribe": `<${params.unsubscribeUrl}>, <mailto:${SUPPORT_EMAIL}?subject=unsubscribe>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
  })

  if (error) {
    console.error("Failed to send restock notification email:", error)
    throw new Error(error.message)
  }
}

/* ────────────────────────────────────────────────────────────────
 *  Marketing campaigns
 *  Sends a Markdown-composed blast to a list of subscriber emails.
 *  Each message carries a per-recipient one-click unsubscribe link +
 *  RFC 8058 List-Unsubscribe headers, so it stays CAN-SPAM compliant
 *  and keeps Gmail/Outlook's native unsubscribe button working.
 * ────────────────────────────────────────────────────────────── */

export interface SendCampaignResult {
  sent: number
  failed: number
  /** Emails we couldn't hand off to Resend, for surfacing in the UI/logs. */
  failedEmails: string[]
}

/**
 * Compose the subject + Markdown body for a "new blog post" announcement.
 * Reuses the marketing-campaign pipeline (sendCampaignEmails) so the blast
 * gets the same branded shell, one-click unsubscribe, and audit trail as any
 * other newsletter send. The article link is a content link (not a shop CTA),
 * so it intentionally carries no affiliate ref.
 */
export function buildBlogAnnouncement(post: {
  title: string
  description: string
  slug: string
}): { subject: string; bodyMarkdown: string } {
  const url = `${SITE_ORIGIN}/blog/${post.slug}`
  const subject = `New article: ${post.title.trim()}`
  const bodyMarkdown = [
    "A new article just went live on the PrimeHelix Labz research blog:",
    "",
    `## ${post.title.trim()}`,
    "",
    post.description.trim(),
    "",
    `[Read the full article →](${url})`,
  ].join("\n")
  return { subject, bodyMarkdown }
}

// Resend caps batch sends at 100 messages per request.
const CAMPAIGN_BATCH_SIZE = 100

export async function sendCampaignEmails(params: {
  subject: string
  bodyMarkdown: string
  recipients: string[]
}): Promise<SendCampaignResult> {
  const subject = params.subject.trim()
  const contentHtml = renderMarketingMarkdown(params.bodyMarkdown)

  // De-dupe + normalize so the same person never gets two copies.
  const recipients = Array.from(
    new Set(
      params.recipients
        .map((e) => e.trim().toLowerCase())
        .filter((e) => e.length > 0)
    )
  )

  const result: SendCampaignResult = { sent: 0, failed: 0, failedEmails: [] }

  for (let i = 0; i < recipients.length; i += CAMPAIGN_BATCH_SIZE) {
    const chunk = recipients.slice(i, i + CAMPAIGN_BATCH_SIZE)
    const messages = chunk.map((email) => {
      // Body link → confirm page; header → API endpoint for one-click POST.
      const unsubscribeUrl = buildUnsubscribeUrl(email, SITE_ORIGIN)
      const unsubscribeApiUrl = buildUnsubscribeApiUrl(email, SITE_ORIGIN)
      return {
        from: `PrimeHelix Labz <${FROM_EMAIL}>`,
        to: [email],
        replyTo: SUPPORT_EMAIL,
        subject,
        html: buildMarketingEmailHtml({
          subject,
          contentHtml,
          recipientEmail: email,
          unsubscribeUrl,
        }),
        headers: {
          "List-Unsubscribe": `<${unsubscribeApiUrl}>, <mailto:${SUPPORT_EMAIL}?subject=unsubscribe>`,
          "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        },
      }
    })

    try {
      const { error } = await resend.batch.send(messages)
      if (error) {
        console.error("Campaign batch send failed:", error)
        result.failed += chunk.length
        result.failedEmails.push(...chunk)
      } else {
        result.sent += chunk.length
      }
    } catch (err) {
      console.error("Campaign batch send threw:", err)
      result.failed += chunk.length
      result.failedEmails.push(...chunk)
    }
  }

  return result
}
