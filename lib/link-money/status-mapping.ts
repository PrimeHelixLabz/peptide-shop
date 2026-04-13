import type { PaymentStatus } from "./payment-types"

const EVENT_TO_STATUS: Record<string, PaymentStatus> = {
  "payment.created": "CREATED",
  "payment.pending": "PENDING",
  "payment.authorized": "AUTHORIZED",
  "payment.initiated": "INITIATED",
  "payment.succeeded": "SUCCEEDED",
  "payment.failed": "FAILED",
}

// Rank defines legal forward transitions. Higher rank wins on conflict,
// so a late/out-of-order webhook cannot regress a payment's state.
const STATUS_RANK: Record<PaymentStatus, number> = {
  CREATED: 0,
  PENDING: 1,
  AUTHORIZED: 2,
  INITIATED: 3,
  SUCCEEDED: 4,
  FAILED: 4,
}

export function mapEventTypeToStatus(
  eventType: string
): PaymentStatus | null {
  return EVENT_TO_STATUS[eventType] ?? null
}

export function isTerminalStatus(status: PaymentStatus): boolean {
  return status === "SUCCEEDED" || status === "FAILED"
}

/**
 * Returns true if `next` should replace `current`. Idempotent re-deliveries
 * (same status) and out-of-order stale events are rejected.
 */
export function shouldAdvanceStatus(
  current: PaymentStatus,
  next: PaymentStatus
): boolean {
  if (current === next) return false
  if (isTerminalStatus(current)) return false
  return STATUS_RANK[next] > STATUS_RANK[current]
}
