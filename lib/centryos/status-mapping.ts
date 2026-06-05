import type { PaymentStatus } from "./payment-types"

/**
 * Forward-only rank for the internal payment status. Late or
 * out-of-order webhooks cannot regress a payment's state — for
 * example, a stale PENDING arriving after SUCCEEDED is ignored.
 *
 * SUCCEEDED outranks the failure states on purpose: CentryOS lets a
 * customer retry the SAME payment link after a decline, so one payment
 * row can receive FAILED, FAILED, then SUCCEEDED. A success means money
 * was received and must always be allowed to override a prior failure.
 */
const STATUS_RANK: Record<PaymentStatus, number> = {
  CREATED: 0,
  PENDING: 1,
  PROCESSING: 2,
  FAILED: 3,
  CANCELLED: 3,
  EXPIRED: 3,
  SUCCEEDED: 4,
}

// Only SUCCEEDED is truly terminal. FAILED / CANCELLED / EXPIRED are
// "soft" terminals: they block regression to a lower rank (a stale
// PENDING cannot undo a FAILED) but must NOT block a later SUCCEEDED on
// the same retryable payment link.
const TERMINAL: ReadonlySet<PaymentStatus> = new Set(["SUCCEEDED"])

export function isTerminalStatus(status: PaymentStatus): boolean {
  return TERMINAL.has(status)
}

export function shouldAdvanceStatus(
  current: PaymentStatus,
  next: PaymentStatus
): boolean {
  if (current === next) return false
  if (isTerminalStatus(current)) return false
  return STATUS_RANK[next] > STATUS_RANK[current]
}

/**
 * Map a CentryOS webhook collection `status` to our internal payment
 * state. Anything unknown is treated as PROCESSING so we don't lose
 * progress signals for new statuses CentryOS may add later.
 */
export function mapCollectionStatus(
  status: string | undefined
): PaymentStatus {
  switch ((status ?? "").toUpperCase()) {
    case "SUCCESS":
    case "SUCCEEDED":
    case "COMPLETED":
      return "SUCCEEDED"
    case "FAILED":
    case "FAILURE":
    case "DECLINED":
    case "BLOCKED":
      return "FAILED"
    case "CANCELLED":
    case "CANCELED":
      return "CANCELLED"
    case "EXPIRED":
      return "EXPIRED"
    case "PENDING":
      return "PENDING"
    case "PROCESSING":
    default:
      return "PROCESSING"
  }
}
