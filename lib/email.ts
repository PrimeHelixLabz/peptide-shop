import { Resend } from "resend"
import type { Order } from "@/lib/db/schema"

const resend = new Resend(process.env.RESEND_API_KEY)

const FROM_EMAIL = "no-reply@primehelixlabz.com"
const SUPPORT_EMAIL = "support@primehelixlabz.com"

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
              <p style="margin: 4px 0; color: #6b7280;">Tax: ${formatCurrency(order.tax)}</p>
              <p style="margin: 8px 0 0; color: #111827; font-size: 18px; font-weight: 700;">Total: ${formatCurrency(order.total)}</p>
            </div>

            <!-- Shipping Address -->
            ${buildShippingSection(order.shippingAddress)}

            <!-- Payment Method -->
            <div style="margin-top: 16px;">
              <p style="margin: 4px 0; color: #6b7280; font-size: 13px;">Payment Method: ${order.paymentMethod}</p>
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
