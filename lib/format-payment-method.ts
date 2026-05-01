/**
 * Human-readable payment method labels.
 * Shared across email templates, order confirmation, admin dashboard, etc.
 */
export function formatPaymentMethod(method: string): string {
  switch (method) {
    case "stripe":
      return "Credit/Debit Card"
    case "link_money":
      return "Pay by Bank"
    case "cash":
      return "Cash"
    default:
      return method
  }
}

/**
 * Short label for use in table badges and compact UI.
 */
export function formatPaymentMethodShort(method: string): string {
  switch (method) {
    case "stripe":
      return "Card"
    case "link_money":
      return "Bank"
    case "cash":
      return "Cash"
    default:
      return method
  }
}
