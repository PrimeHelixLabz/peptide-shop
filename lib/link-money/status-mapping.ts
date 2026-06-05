import type { PaymentStatus } from "./payment-types"

const EVENT_TO_STATUS: Record<string, PaymentStatus> = {
  "payment.created": "CREATED",
  "payment.pending": "PENDING",
  "payment.authorized": "AUTHORIZED",
  "payment.initiated": "INITIATED",
  "payment.scheduled": "INITIATED",
  "payment.succeeded": "SUCCEEDED",
  // Link Money's final settlement event — collapsed onto SUCCEEDED so it
  // shares the existing terminal "paid" handling.
  "payment.disbursed": "SUCCEEDED",
  "payment.failed": "FAILED",
}

// Rank defines legal forward transitions. Higher rank wins on conflict,
// so a late/out-of-order webhook cannot regress a payment's state.
//
// SUCCEEDED outranks FAILED on purpose: a customer can retry on the same
// payment session after a decline, so one payment row can receive FAILED
// then SUCCEEDED. A success means money was received and must always be
// allowed to override a prior failure.
const STATUS_RANK: Record<PaymentStatus, number> = {
  CREATED: 0,
  PENDING: 1,
  AUTHORIZED: 2,
  INITIATED: 3,
  FAILED: 4,
  SUCCEEDED: 5,
}

export function mapEventTypeToStatus(
  eventType: string
): PaymentStatus | null {
  return EVENT_TO_STATUS[eventType] ?? null
}

// Only SUCCEEDED is truly terminal. FAILED blocks regression to a lower
// rank (a stale AUTHORIZED can't undo a FAILED) but must NOT block a
// later SUCCEEDED on the same retryable payment session.
export function isTerminalStatus(status: PaymentStatus): boolean {
  return status === "SUCCEEDED"
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
