export type PaymentStatus =
  | "CREATED"
  | "PENDING"
  | "AUTHORIZED"
  | "INITIATED"
  | "SUCCEEDED"
  | "FAILED"

export interface PaymentRecord {
  id: string
  orderId: string | null
  clientReferenceId: string
  transactionId: string | null
  status: PaymentStatus
  amount: number
  currency: string
  sessionKey: string | null
  rawWebhook: unknown | null
  createdAt: string
  updatedAt: string
}

export interface CreatePaymentInput {
  orderId: string | null
  clientReferenceId: string
  amount: number
  currency?: string
  sessionKey?: string | null
}

export interface LinkMoneyWebhookBody {
  eventType: string
  resourceId?: string
  metadata?: {
    clientReferenceId?: string
    transactionId?: string
    resourceId?: string
  }
  clientReferenceId?: string
  transactionId?: string
  [key: string]: unknown
}

export interface LinkMoneyTransaction {
  id: string
  status: string
  amount?: { value: number; currency: string }
  clientReferenceId?: string
  [key: string]: unknown
}
