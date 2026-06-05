import { createAdminClient } from "@/lib/supabase/admin"
import { getLinkMoneyConfig } from "./config"
import {
  mapEventTypeToStatus,
  shouldAdvanceStatus,
} from "./status-mapping"
import type {
  CreatePaymentInput,
  LinkMoneyTransaction,
  LinkMoneyWebhookBody,
  PaymentRecord,
  PaymentStatus,
} from "./payment-types"

type Row = {
  id: string
  order_id: string | null
  client_reference_id: string
  transaction_id: string | null
  status: PaymentStatus
  amount: string | number
  currency: string
  session_key: string | null
  raw_webhook: unknown | null
  created_at: string
  updated_at: string
}

function rowToRecord(row: Row): PaymentRecord {
  return {
    id: row.id,
    orderId: row.order_id,
    clientReferenceId: row.client_reference_id,
    transactionId: row.transaction_id,
    status: row.status,
    amount: typeof row.amount === "string" ? parseFloat(row.amount) : row.amount,
    currency: row.currency,
    sessionKey: row.session_key,
    rawWebhook: row.raw_webhook,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

/**
 * Create a payment row in CREATED state BEFORE calling Link Money.
 * The client_reference_id is the idempotency key for the whole lifecycle.
 */
export async function createPayment(
  input: CreatePaymentInput
): Promise<PaymentRecord> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from("payments")
    .insert({
      order_id: input.orderId,
      client_reference_id: input.clientReferenceId,
      amount: input.amount,
      currency: input.currency ?? "USD",
      session_key: input.sessionKey ?? null,
      status: "CREATED" as PaymentStatus,
    })
    .select("*")
    .single()

  if (error || !data) {
    throw new Error(
      `Failed to create payment row: ${error?.message ?? "unknown"}`
    )
  }
  return rowToRecord(data as Row)
}

export async function setSessionKey(
  clientReferenceId: string,
  sessionKey: string
): Promise<void> {
  const supabase = createAdminClient()
  const { error } = await supabase
    .from("payments")
    .update({ session_key: sessionKey })
    .eq("client_reference_id", clientReferenceId)
  if (error) {
    throw new Error(`Failed to set session_key: ${error.message}`)
  }
}

export async function getPaymentByClientReferenceId(
  clientReferenceId: string
): Promise<PaymentRecord | null> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from("payments")
    .select("*")
    .eq("client_reference_id", clientReferenceId)
    .maybeSingle()
  if (error) {
    throw new Error(`Failed to load payment: ${error.message}`)
  }
  return data ? rowToRecord(data as Row) : null
}

export interface ApplyWebhookResult {
  payment: PaymentRecord | null
  applied: boolean
  reason?: string
}

/**
 * Idempotent webhook application. Safe on retries:
 *  - unknown eventType → ignored
 *  - unknown clientReferenceId → ignored (caller should 200 OK)
 *  - duplicate or stale status → raw payload still stored, status unchanged
 *  - transaction_id set on first receipt
 */
export async function applyWebhook(
  body: LinkMoneyWebhookBody
): Promise<ApplyWebhookResult> {
  const clientReferenceId =
    body.metadata?.clientReferenceId ?? body.clientReferenceId
  if (!clientReferenceId) {
    return { payment: null, applied: false, reason: "missing clientReferenceId" }
  }

  const nextStatus = mapEventTypeToStatus(body.eventType)
  if (!nextStatus) {
    return { payment: null, applied: false, reason: "unmapped eventType" }
  }

  const transactionId =
    body.metadata?.transactionId ??
    body.transactionId ??
    body.metadata?.resourceId ??
    body.resourceId ??
    null

  const existing = await getPaymentByClientReferenceId(clientReferenceId)
  if (!existing) {
    return { payment: null, applied: false, reason: "payment not found" }
  }

  const advance = shouldAdvanceStatus(existing.status, nextStatus)
  const needsTxnId = existing.transactionId == null && transactionId != null

  // Always persist the raw webhook for audit, even on no-op.
  const updates: Record<string, unknown> = {
    raw_webhook: body as unknown as Record<string, unknown>,
  }
  if (advance) {
    updates.status = nextStatus
    // Track the transaction that drove this advance. On a retry, a prior
    // failed attempt may have already stamped a different transaction_id;
    // the row must reflect the transaction behind its CURRENT status so
    // reconciliation / refunds resolve the right one.
    if (transactionId) updates.transaction_id = transactionId
  } else if (needsTxnId) {
    updates.transaction_id = transactionId
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from("payments")
    .update(updates)
    .eq("client_reference_id", clientReferenceId)
    .select("*")
    .single()

  if (error || !data) {
    throw new Error(
      `Failed to apply webhook: ${error?.message ?? "unknown"}`
    )
  }

  return {
    payment: rowToRecord(data as Row),
    applied: advance || needsTxnId,
  }
}

/**
 * Reconciliation / fallback verification only. Never used as the
 * primary signal — the webhook is source of truth.
 */
export async function getTransaction(
  transactionId: string
): Promise<LinkMoneyTransaction> {
  const config = getLinkMoneyConfig()
  const res = await fetch(
    `${config.baseUrl}/transactions/${encodeURIComponent(transactionId)}`,
    {
      method: "GET",
      headers: {
        Authorization: `Basic ${config.basicAuth}`,
        Accept: "application/json",
      },
    }
  )
  if (!res.ok) {
    throw new Error(
      `Link Money getTransaction failed: ${res.status} ${await res.text()}`
    )
  }
  return (await res.json()) as LinkMoneyTransaction
}
