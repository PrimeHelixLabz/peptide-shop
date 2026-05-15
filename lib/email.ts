import { Resend } from "resend"
import type { Order } from "@/lib/db/schema"
import { formatPaymentMethod } from "@/lib/format-payment-method"

const resend = new Resend(process.env.RESEND_API_KEY)

const FROM_EMAIL = "no-reply@primehelixlabz.com"
const SUPPORT_EMAIL = "support@primehelixlabz.com"

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
    to: [SUPPORT_EMAIL],
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

  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
      <div style="max-width: 600px; margin: 0 auto; padding: 24px;">
        <div style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">

          <!-- Header -->
          <div style="background-color: #1e293b; padding: 24px; text-align: center;">
            <h1 style="margin: 0; color: #ffffff; font-size: 22px;">New Order Received</h1>
          </div>

          <!-- Body -->
          <div style="padding: 24px;">
            <div style="background-color: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
              <p style="margin: 0; color: #065f46; font-weight: 600; font-size: 16px;">
                Order #${order.orderNumber}
              </p>
              <p style="margin: 4px 0 0; color: #047857; font-size: 14px;">
                Payment Status: ${order.paymentStatus.toUpperCase()} &bull; Order Status: ${order.status.toUpperCase()}
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
      subject: `New Order #${order.orderNumber} - ${formatCurrency(order.total)}`,
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

            <!-- Order Items -->
            <h3 style="margin: 24px 0 8px; color: #374151; font-size: 14px; text-transform: uppercase;">Order Summary</h3>
            ${buildOrderItemsTable(order.items)}

            <!-- Totals -->
            <div style="text-align: right; margin: 16px 0;">
              <p style="margin: 4px 0; color: #6b7280;">Subtotal: ${formatCurrency(order.subtotal)}</p>
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
    url: "https://primehelixlabz.com/blog/bpc-157-research-guide",
    description:
      "Structure, mechanisms studied in animal models, and what published preclinical literature reports.",
  },
  {
    title: "BPC-157 vs TB-500",
    url: "https://primehelixlabz.com/blog/bpc-157-vs-tb-500",
    description:
      "How these two tissue-repair peptides differ structurally and mechanistically.",
  },
  {
    title: "Peptide Storage Guide",
    url: "https://primehelixlabz.com/blog/peptide-storage-guide",
    description:
      "Lyophilized vs reconstituted, temperature, freeze-thaw, and shelf life in the lab.",
  },
  {
    title: "How to Read a Certificate of Analysis",
    url: "https://primehelixlabz.com/blog/how-to-read-peptide-coa",
    description:
      "Field-by-field walkthrough of a peptide COA, plus the red flags to watch for.",
  },
  {
    title: "GHK-Cu Research Overview",
    url: "https://primehelixlabz.com/blog/ghk-cu-research-overview",
    description:
      "The copper-binding tripeptide, its mechanisms in dermal-research literature, and lab handling.",
  },
]

export async function sendNewsletterWelcomeEmail(toEmail: string): Promise<void> {
  const safeEmail = escapeHtml(toEmail.trim())

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
              <a href="https://primehelixlabz.com/shop" style="color: #1e293b; font-weight: 500;">primehelixlabz.com/shop</a>.
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
  })

  if (error) {
    console.error("Failed to send newsletter welcome email:", error)
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
