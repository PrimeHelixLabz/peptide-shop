import crypto from "crypto"
import { createAdminClient } from "@/lib/supabase/admin"
import { getCentryOSConfig } from "./config"
import { getAccessToken } from "./auth"
import { mapCollectionStatus, shouldAdvanceStatus } from "./status-mapping"
import type {
  CentryOSTransaction,
  CentryOSWebhookBody,
  CreatePaymentInput,
  PaymentRecord,
  PaymentStatus,
} from "./payment-types"
import type { ProcessingTrace } from "./processing-trace"
import type {
  CentryOSCartItem,
  CreatePaymentLinkRequest,
  CreatePaymentLinkResponse,
} from "./types"

const PROVIDER = "centryos"

// Gateway/CDN request-correlation headers CentryOS sits behind. When a
// call fails, logging these lets us hand CentryOS support an exact ID
// instead of a generic "it 500'd".
const REQUEST_ID_HEADERS = [
  "x-request-id",
  "x-amzn-requestid",
  "x-amzn-trace-id",
  "x-amz-cf-id",
  "cf-ray",
  "request-id",
] as const

function collectRequestIds(res: Response): Record<string, string> {
  const ids: Record<string, string> = {}
  for (const h of REQUEST_ID_HEADERS) {
    const v = res.headers.get(h)
    if (v) ids[h] = v
  }
  return ids
}

/**
 * Returns a copy of the create-payment-link body safe to log: the
 * webhook secret is the only sensitive value we send, so redact it.
 */
function redactPaymentLinkBody(
  body: CreatePaymentLinkRequest
): Record<string, unknown> {
  return {
    ...body,
    advancedConfig: { ...body.advancedConfig, webhookSecret: "[redacted]" },
  }
}

interface PaymentRow {
  id: string
  provider: string
  order_id: string | null
  client_reference_id: string
  status: PaymentStatus
  amount: string | number
  currency: string
  provider_payment_link_id: string | null
  provider_payment_link_token: string | null
  provider_payment_link_expires_at: string | null
  transaction_id: string | null
  checkout_url: string | null
  raw_create_response: unknown | null
  raw_webhook: unknown | null
  created_at: string
  updated_at: string
}

function rowToRecord(row: PaymentRow): PaymentRecord {
  return {
    id: row.id,
    provider: "centryos",
    orderId: row.order_id,
    clientReferenceId: row.client_reference_id,
    status: row.status,
    amount: typeof row.amount === "string" ? parseFloat(row.amount) : row.amount,
    currency: row.currency,
    providerPaymentLinkId: row.provider_payment_link_id,
    providerPaymentLinkToken: row.provider_payment_link_token,
    providerPaymentLinkExpiresAt: row.provider_payment_link_expires_at,
    providerTransactionId: row.transaction_id,
    checkoutUrl: row.checkout_url,
    rawCreateResponse: row.raw_create_response,
    rawWebhook: row.raw_webhook,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

// ── Payment row helpers ────────────────────────────────────

/**
 * Create a payments row in CREATED state BEFORE calling CentryOS, so
 * the webhook can always find it by (provider, client_reference_id)
 * even if the create-link call fails.
 */
export async function createPayment(
  input: CreatePaymentInput
): Promise<PaymentRecord> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from("payments")
    .insert({
      provider: PROVIDER,
      order_id: input.orderId,
      client_reference_id: input.clientReferenceId,
      amount: input.amount,
      currency: input.currency ?? "USD",
      status: "CREATED" as PaymentStatus,
    })
    .select("*")
    .single()

  if (error || !data) {
    throw new Error(
      `CentryOS createPayment failed: ${error?.message ?? "unknown"}`
    )
  }
  return rowToRecord(data as PaymentRow)
}

export async function getPaymentByClientReferenceId(
  clientReferenceId: string
): Promise<PaymentRecord | null> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from("payments")
    .select("*")
    .eq("provider", PROVIDER)
    .eq("client_reference_id", clientReferenceId)
    .maybeSingle()
  if (error) throw new Error(`CentryOS getPayment failed: ${error.message}`)
  return data ? rowToRecord(data as PaymentRow) : null
}

export async function getPaymentByPaymentLinkId(
  paymentLinkId: string
): Promise<PaymentRecord | null> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from("payments")
    .select("*")
    .eq("provider", PROVIDER)
    .eq("provider_payment_link_id", paymentLinkId)
    .maybeSingle()
  if (error)
    throw new Error(`CentryOS getPaymentByLink failed: ${error.message}`)
  return data ? rowToRecord(data as PaymentRow) : null
}

export async function getPaymentByOrderId(
  orderId: string
): Promise<PaymentRecord | null> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from("payments")
    .select("*")
    .eq("provider", PROVIDER)
    .eq("order_id", orderId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error)
    throw new Error(`CentryOS getPaymentByOrder failed: ${error.message}`)
  return data ? rowToRecord(data as PaymentRow) : null
}

// ── Create payment link ────────────────────────────────────

export interface CreatePaymentLinkInput {
  orderId: string
  clientReferenceId: string
  amount: number
  currency?: string
  productName: string
  customerUserId?: string | null
  cartItems?: Array<Record<string, unknown>>
  /**
   * Free-form delivery address string. REQUIRED by CentryOS — omitting it
   * makes the payment-link endpoint return a 500. Callers should pass the
   * customer's shipping address (e.g. "123 Main St, Austin, TX, 78701, US").
   */
  itemDeliveryAddress?: string
  /**
   * Optional override for the redirect target. Defaults to
   * `${APP_PUBLIC_URL}/payments/centryos/callback?orderId=...`.
   */
  redirectTo?: string
}

export interface CreatePaymentLinkResult {
  url: string
  paymentLinkId: string | null
  paymentLinkToken: string | null
  expiredAt: string | null
  raw: CreatePaymentLinkResponse
}

/**
 * Creates a CentryOS payment link AND mirrors the result onto the
 * `payments` row identified by (provider='centryos', client_reference_id).
 *
 * The caller is responsible for having called `createPayment` first.
 */
export async function createPaymentLink(
  input: CreatePaymentLinkInput
): Promise<CreatePaymentLinkResult> {
  const config = getCentryOSConfig()
  const accessToken = await getAccessToken()

  const redirectTo =
    input.redirectTo ??
    `${config.appPublicUrl.replace(/\/$/, "")}/payments/centryos/callback?orderId=${encodeURIComponent(
      input.orderId
    )}`

  // CentryOS rejects non-string values inside customData with
  // `"customData.<key>" must be a string`. Stringify everything; nested
  // structures (cart items) are JSON-encoded so they remain readable
  // when echoed back on the webhook.
  const customData: Record<string, string> = {
    orderId: String(input.orderId),
    clientReferenceId: String(input.clientReferenceId),
  }
  if (input.customerUserId) customData.userId = String(input.customerUserId)
  if (input.cartItems && input.cartItems.length > 0) {
    customData.cartItems = JSON.stringify(input.cartItems)
  }

  const currency = input.currency ?? "USD"

  // CentryOS requires a top-level `cartItems` array (each item needs at
  // least name + description) AND `itemDeliveryAddress`. These became
  // mandatory in their 2026 API update; missing them returns a 500.
  const cartItems: CentryOSCartItem[] = (input.cartItems ?? []).map((item) => {
    const name = String(item.name ?? input.productName)
    const out: CentryOSCartItem = {
      name,
      description: String(item.description ?? name),
      qty: Number(item.quantity ?? item.qty ?? 1),
      price:
        typeof item.price === "number"
          ? item.price
          : Number(item.price ?? input.amount),
      currency,
    }
    if (item.productId) out.productId = String(item.productId)
    if (item.imageUrl) out.imageUrl = String(item.imageUrl)
    return out
  })
  // Fall back to a single line item so the required field is never empty.
  if (cartItems.length === 0) {
    cartItems.push({
      name: input.productName,
      description: input.productName,
      qty: 1,
      price: parseFloat(input.amount.toFixed(2)),
      currency,
    })
  }

  const itemDeliveryAddress =
    input.itemDeliveryAddress?.trim() || "See order details"

  const body: CreatePaymentLinkRequest = {
    currency,
    name: input.productName,
    amount: parseFloat(input.amount.toFixed(2)),
    amountLocked: true,
    redirectTo,
    checkoutType: "generic",
    isOpenLink: false,
    customerPays: true,
    orderId: input.orderId,
    acceptedPaymentOptions: ["apple_pay", "card", "cashapp", "google_pay", "us_bank_account"],
    itemDeliveryAddress,
    cartItems,
    customData,
    advancedConfig: {
      websiteUrl: config.appPublicUrl,
      webhookPath: `${config.appPublicUrl.replace(/\/$/, "")}/api/payments/centryos/webhook`,
      webhookSecret: config.webhookSecret,
    },
  }

  const res = await fetch(
    `${config.liquidityUrl}/v1/ext/collections/payment-link`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
    }
  )

  if (!res.ok) {
    const text = await res.text().catch(() => "")
    const requestIds = collectRequestIds(res)
    // CentryOS returns a bare `500 {"message":"Internal server error"}` with
    // no field-level detail. Log the request-correlation IDs + the exact
    // (redacted) payload we sent so the next failure is diagnosable —
    // either hand the request ID to CentryOS, or spot a bad/oversized field.
    console.error("CentryOS createPaymentLink failed", {
      status: res.status,
      statusText: res.statusText,
      responseBody: text,
      requestIds,
      orderId: input.orderId,
      clientReferenceId: input.clientReferenceId,
      requestBody: redactPaymentLinkBody(body),
    })
    const idSuffix = Object.keys(requestIds).length
      ? ` (request-id: ${Object.values(requestIds).join(", ")})`
      : ""
    throw new Error(
      `CentryOS createPaymentLink failed: ${res.status} ${text || res.statusText}${idSuffix}`
    )
  }

  const raw = (await res.json()) as CreatePaymentLinkResponse
  const data = raw?.data
  const url = data?.url
  if (!url) {
    throw new Error("CentryOS createPaymentLink: response missing data.url")
  }

  const application = data.application ?? ({} as CreatePaymentLinkResponse["data"]["application"])
  const paymentLinkId = application?.id ?? null
  const paymentLinkToken = application?.token ?? null

  let expiredAtIso: string | null = null
  if (typeof application?.expiredAt === "number") {
    expiredAtIso = new Date(application.expiredAt).toISOString()
  } else if (typeof application?.expiredAt === "string") {
    const parsed = Date.parse(application.expiredAt)
    if (Number.isFinite(parsed)) expiredAtIso = new Date(parsed).toISOString()
  }

  // Mirror the response onto the payments row.
  const supabase = createAdminClient()
  const { error } = await supabase
    .from("payments")
    .update({
      provider_payment_link_id: paymentLinkId,
      provider_payment_link_token: paymentLinkToken,
      provider_payment_link_expires_at: expiredAtIso,
      checkout_url: url,
      raw_create_response: raw as unknown as Record<string, unknown>,
      // Bump CREATED → PENDING to reflect that the customer now has
      // a usable checkout URL.
      status: "PENDING",
    })
    .eq("provider", PROVIDER)
    .eq("client_reference_id", input.clientReferenceId)

  if (error) {
    console.error("CentryOS createPaymentLink: failed to persist response", {
      error,
      clientReferenceId: input.clientReferenceId,
    })
  }

  return {
    url,
    paymentLinkId,
    paymentLinkToken,
    expiredAt: expiredAtIso,
    raw,
  }
}

// ── Signature verification ─────────────────────────────────

/**
 * HMAC-SHA512(rawBody) hex digest, compared timing-safely against
 * the `signature` header value.
 */
export function verifyWebhookSignature(
  rawBody: string,
  signature: string | null,
  secret = process.env.CENTRYOS_WEBHOOK_SECRET ?? ""
): boolean {
  if (!signature || !secret) return false

  const expected = crypto
    .createHmac("sha512", secret)
    .update(rawBody, "utf8")
    .digest("hex")

  // Some webhook publishers prefix the algorithm or use base64; accept
  // a hex digest in either case-insensitive form. Anything else fails
  // the length check below.
  const provided = signature.replace(/^sha512=/i, "").trim().toLowerCase()
  const expectedLower = expected.toLowerCase()

  const expectedBuf = Buffer.from(expectedLower, "utf8")
  const providedBuf = Buffer.from(provided, "utf8")
  if (expectedBuf.length !== providedBuf.length) return false
  return crypto.timingSafeEqual(expectedBuf, providedBuf)
}

// ── Webhook application (idempotent) ───────────────────────

export interface ApplyWebhookResult {
  payment: PaymentRecord | null
  applied: boolean
  reason?: string
}

/**
 * Idempotent webhook application. Safe on retries:
 *  - unknown clientReferenceId / paymentLinkId → ignored (caller 200 OK)
 *  - duplicate transactionId on a SUCCEEDED row → no-op
 *  - stale status → raw payload still stored, status unchanged
 */
export async function applyCollectionWebhook(
  body: CentryOSWebhookBody,
  trace?: ProcessingTrace
): Promise<ApplyWebhookResult> {
  // CentryOS echoes the original customData under payload.paymentLink.
  // payload.metadata holds checkout-form fields (Email, First/Last name,
  // Phone), NOT our orderId/clientReferenceId. Fall back to metadata and
  // top-level paymentLink for any future shape drift.
  const customData = body?.payload?.paymentLink?.customData ?? undefined
  const orderIdResolved =
    (customData?.orderId as string | undefined) ??
    (body?.payload?.metadata?.orderId as string | undefined) ??
    null
  const clientRefResolved =
    (customData?.clientReferenceId as string | undefined) ??
    (body?.payload?.metadata as { clientReferenceId?: string } | undefined)
      ?.clientReferenceId ??
    null
  const paymentLinkId =
    body?.payload?.paymentLink?.id ?? body?.paymentLink?.id ?? null
  const transactionId = body?.payload?.transactionId ?? null

  trace?.step("apply.start", true, {
    orderIdResolved,
    clientRefResolved,
    paymentLinkId,
    transactionId,
    rawStatus: body?.status ?? null,
  })

  // Resolve the payment row in priority order:
  //   1. customData.clientReferenceId (set when we created the link)
  //   2. customData.orderId (matches our payments.order_id)
  //   3. paymentLink.id (fallback if both are missing)
  let existing: PaymentRecord | null = null
  let resolvedBy: string | null = null
  if (clientRefResolved) {
    existing = await getPaymentByClientReferenceId(clientRefResolved)
    if (existing) resolvedBy = "clientReferenceId"
    trace?.step("apply.lookup.byClientReferenceId", !!existing, {
      key: clientRefResolved,
      found: !!existing,
    })
  }
  if (!existing && orderIdResolved) {
    existing = await getPaymentByOrderId(orderIdResolved)
    if (existing) resolvedBy = "orderId"
    trace?.step("apply.lookup.byOrderId", !!existing, {
      key: orderIdResolved,
      found: !!existing,
    })
  }
  if (!existing && paymentLinkId) {
    existing = await getPaymentByPaymentLinkId(paymentLinkId)
    if (existing) resolvedBy = "paymentLinkId"
    trace?.step("apply.lookup.byPaymentLinkId", !!existing, {
      key: paymentLinkId,
      found: !!existing,
    })
  }

  if (!existing) {
    trace?.step("apply.payment_not_found", false)
    return { payment: null, applied: false, reason: "payment row not found" }
  }

  trace?.attach("paymentId", existing.id)
  trace?.attach("paymentOrderId", existing.orderId)
  trace?.attach("resolvedBy", resolvedBy)

  // Idempotency: if this exact transaction has already been applied
  // and we are already SUCCEEDED, we are done.
  if (
    transactionId &&
    existing.providerTransactionId === transactionId &&
    existing.status === "SUCCEEDED"
  ) {
    trace?.step("apply.duplicate_transaction", true, {
      transactionId,
      currentStatus: existing.status,
    })
    return { payment: existing, applied: false, reason: "duplicate transaction" }
  }

  const nextStatus = mapCollectionStatus(body.status)
  const advance = shouldAdvanceStatus(existing.status, nextStatus)
  const needsTxnId = !existing.providerTransactionId && !!transactionId

  trace?.step("apply.status_transition", true, {
    from: existing.status,
    to: nextStatus,
    advance,
    needsTxnId,
  })

  const updates: Record<string, unknown> = {
    raw_webhook: body as unknown as Record<string, unknown>,
  }
  if (advance) {
    updates.status = nextStatus
    // Track the transaction that drove this advance. On a retry, a prior
    // failed attempt may have already stamped a different transaction_id;
    // the row must reflect the transaction behind its CURRENT status so
    // admin sync / reconciliation / refunds resolve the right one.
    if (transactionId) updates.transaction_id = transactionId
  } else if (needsTxnId) {
    updates.transaction_id = transactionId
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from("payments")
    .update(updates)
    .eq("id", existing.id)
    .select("*")
    .single()

  if (error || !data) {
    trace?.step("apply.db_update", false, undefined, error?.message)
    throw new Error(
      `CentryOS applyCollectionWebhook failed: ${error?.message ?? "unknown"}`
    )
  }

  trace?.step("apply.db_update", true, {
    fieldsWritten: Object.keys(updates),
  })

  return {
    payment: rowToRecord(data as PaymentRow),
    applied: advance || needsTxnId,
  }
}

// ── Transaction lookup (reconciliation) ────────────────────

/**
 * Reconciliation / fallback verification only. The webhook is the
 * authoritative source of truth — this exists for the admin "sync"
 * action, return-page polling, and webhook recovery.
 */
export async function getTransactionStatus(
  transactionId: string
): Promise<CentryOSTransaction> {
  const config = getCentryOSConfig()
  const accessToken = await getAccessToken()
  const url = new URL(`${config.liquidityUrl}/v1/ext/transactions`)
  url.searchParams.set("id", transactionId)

  const res = await fetch(url.toString(), {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  })

  if (!res.ok) {
    const text = await res.text().catch(() => "")
    throw new Error(
      `CentryOS getTransactionStatus failed: ${res.status} ${text || res.statusText}`
    )
  }

  const json = (await res.json()) as
    | CentryOSTransaction
    | { data: CentryOSTransaction }
  return "id" in json ? json : (json as { data: CentryOSTransaction }).data
}
