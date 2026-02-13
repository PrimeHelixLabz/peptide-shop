/**
 * PaymentCloud Payment Gateway Integration
 * 
 * This module handles PaymentCloud payment processing
 */

export interface PaymentCloudConfig {
  apiKey: string
  apiUrl: string
  merchantId?: string
}

export interface PaymentRequest {
  token: string
  amount: number // in dollars
  currency?: string
  orderId: string
  email: string
  description?: string
  billingAddress?: {
    street: string
    city: string
    state: string
    zipCode: string
    country: string
  }
}

export interface PaymentResponse {
  success: boolean
  transactionId?: string
  error?: string
  message?: string
}

/**
 * Process a payment through PaymentCloud
 */
export async function processPayment(
  request: PaymentRequest
): Promise<PaymentResponse> {
  const apiKey = process.env.PAYMENTCLOUD_API_KEY
  const apiUrl = process.env.PAYMENTCLOUD_API_URL || "https://api.paymentcloud.com/v1/charges"

  if (!apiKey) {
    return {
      success: false,
      error: "PaymentCloud API key not configured",
    }
  }

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        token: request.token,
        amount: Math.round(request.amount * 100), // Convert to cents
        currency: request.currency || "USD",
        order_id: request.orderId,
        email: request.email,
        description: request.description,
        billing_address: request.billingAddress,
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      return {
        success: false,
        error: data.message || data.error || "Payment failed",
      }
    }

    return {
      success: true,
      transactionId: data.transaction_id || data.id,
      message: data.message,
    }
  } catch (error) {
    console.error("PaymentCloud API error:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Payment processing failed",
    }
  }
}

/**
 * Get PaymentCloud public key for client-side tokenization
 */
export function getPaymentCloudPublicKey(): string {
  return process.env.NEXT_PUBLIC_PAYMENTCLOUD_PUBLIC_KEY || ""
}
