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
import type {
  CreatePaymentLinkRequest,
  CreatePaymentLinkResponse,
} from "./types"

const PROVIDER = "centryos"

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

  const body: CreatePaymentLinkRequest = {
    currency: input.currency ?? "USD",
    name: input.productName,
    amount: parseFloat(input.amount.toFixed(2)),
    redirectTo,
    checkoutType: "generic",
    isOpenLink: false,
    customerPays: true,
    orderId: input.orderId,
    acceptedPaymentOptions: ["card"],
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
    throw new Error(
      `CentryOS createPaymentLink failed: ${res.status} ${text || res.statusText}`
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
  body: CentryOSWebhookBody
): Promise<ApplyWebhookResult> {
  const orderIdFromMetadata = body?.payload?.metadata?.orderId
  const clientRefFromMetadata =
    (body?.payload?.metadata as { clientReferenceId?: string } | undefined)
      ?.clientReferenceId
  const paymentLinkId = body?.paymentLink?.id ?? null
  const transactionId = body?.payload?.transactionId ?? null

  // Resolve the payment row in priority order:
  //   1. metadata.clientReferenceId (set when we created the link)
  //   2. metadata.orderId (matches our payments.order_id)
  //   3. paymentLink.id (fallback if both are missing)
  let existing: PaymentRecord | null = null
  if (clientRefFromMetadata) {
    existing = await getPaymentByClientReferenceId(clientRefFromMetadata)
  }
  if (!existing && orderIdFromMetadata) {
    existing = await getPaymentByOrderId(orderIdFromMetadata)
  }
  if (!existing && paymentLinkId) {
    existing = await getPaymentByPaymentLinkId(paymentLinkId)
  }

  if (!existing) {
    return { payment: null, applied: false, reason: "payment row not found" }
  }

  // Idempotency: if this exact transaction has already been applied
  // and we are already SUCCEEDED, we are done.
  if (
    transactionId &&
    existing.providerTransactionId === transactionId &&
    existing.status === "SUCCEEDED"
  ) {
    return { payment: existing, applied: false, reason: "duplicate transaction" }
  }

  const nextStatus = mapCollectionStatus(body.status)
  const advance = shouldAdvanceStatus(existing.status, nextStatus)
  const needsTxnId = !existing.providerTransactionId && !!transactionId

  const updates: Record<string, unknown> = {
    raw_webhook: body as unknown as Record<string, unknown>,
  }
  if (advance) updates.status = nextStatus
  if (needsTxnId) updates.transaction_id = transactionId

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from("payments")
    .update(updates)
    .eq("id", existing.id)
    .select("*")
    .single()

  if (error || !data) {
    throw new Error(
      `CentryOS applyCollectionWebhook failed: ${error?.message ?? "unknown"}`
    )
  }

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
