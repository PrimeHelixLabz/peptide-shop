import { NextRequest, NextResponse, after } from "next/server"
import crypto from "crypto"
import { createAdminClient } from "@/lib/supabase/admin"
import {
  adjustInventoryForOrderAsAdmin,
  restoreInventoryForOrderAsAdmin,
  getOrderByIdAsAdmin,
} from "@/lib/db/supabase"
import { sendOrderNotificationEmail } from "@/lib/email"
import { applyWebhook } from "@/lib/link-money/payment-service"
import type { LinkMoneyWebhookBody } from "@/lib/link-money/payment-types"
import {
  logWebhook,
  notifyWebhookReceived,
  type WebhookLogEntry,
} from "@/lib/link-money/webhook-log"

/**
 * POST /api/payments/link-money/webhook
 *
 * Debug-first behavior:
 * - Always captures headers + raw body + parsed body (best effort)
 * - Tries to verify signature using likely HMAC forms
 * - Can optionally allow invalid signatures in debug mode so we can inspect real deliveries
 *
 * Required env:
 *   LINK_MONEY_WEBHOOK_SECRET=...
 *
 * Optional env:
 *   LINK_MONEY_WEBHOOK_ALLOW_INVALID_SIGNATURES=true
 */
export async function POST(req: NextRequest) {
  const headers = headersToObject(req)
  const rawBody = await req.text()

  let body: LinkMoneyWebhookBody | null = null
  let parseError: string | null = null

  try {
    body = rawBody ? (JSON.parse(rawBody) as LinkMoneyWebhookBody) : null
  } catch (err) {
    parseError = err instanceof Error ? err.message : "invalid JSON"
  }

  const eventType = body?.eventType ?? null
  const clientReferenceId =
    body?.metadata?.clientReferenceId ?? body?.clientReferenceId ?? null

  // Link Money docs/examples emphasize metadata.resourceId
  const resourceId =
    body?.metadata?.resourceId ??
    body?.resourceId ??
    body?.metadata?.transactionId ??
    body?.transactionId ??
    null

  const webhookSecret = process.env.LINK_MONEY_WEBHOOK_SECRET
  const allowInvalidSignatures =
    process.env.LINK_MONEY_WEBHOOK_ALLOW_INVALID_SIGNATURES === "true"

  // Keep all plausible headers until you see the real one in logs.
  const { signatureHeaderName, signature } = getIncomingSignature(req)

  const verification = verifyWebhookSignature({
    rawBody,
    signature,
    secret: webhookSecret,
  })

  const signatureValid = verification.valid

  const finish = async (
    statusCode: number,
    error: string | null,
    responseBody: Record<string, unknown>
  ) => {
    const entry: WebhookLogEntry & {
      signatureHeaderName?: string | null
      signaturePreview?: string | null
      signatureMode?: string | null
      signatureCandidates?: Record<string, string>
    } = {
      eventType,
      clientReferenceId,
      transactionId: resourceId,
      signatureValid,
      headers,
      body: body ?? null,
      rawBody,
      statusCode,
      error,
      signatureHeaderName,
      // preview only, never full secret/signature in logs
      signaturePreview: signature ? redactMiddle(signature, 10, 6) : null,
      signatureMode: verification.mode,
      signatureCandidates: verification.candidatesPreview,
    }

    // Fire-and-forget: don't block the webhook ack on logging/notify.
    // `after` runs after the response is flushed but before the serverless
    // function terminates, so best-effort work still completes.
    after(async () => {
      await Promise.allSettled([
        logWebhook(entry),
        notifyWebhookReceived(entry),
      ])
    })
    return NextResponse.json(responseBody, { status: statusCode })
  }

  if (!webhookSecret) {
    console.error("LINK_MONEY_WEBHOOK_SECRET not configured")
    return finish(500, "webhook secret not configured", {
      error: "Webhook not configured",
    })
  }

  if (parseError || !body) {
    return finish(400, parseError ?? "empty body", {
      error: "Invalid JSON",
      signatureValid,
      signatureHeaderName,
    })
  }

  if (!eventType) {
    return finish(400, "missing eventType", {
      error: "Missing eventType",
      signatureValid,
      signatureHeaderName,
    })
  }

  if (!signatureValid && !allowInvalidSignatures) {
    return finish(401, "invalid signature", {
      error: "Invalid signature",
      signatureValid,
      signatureHeaderName,
      hint: "Enable LINK_MONEY_WEBHOOK_ALLOW_INVALID_SIGNATURES=true temporarily to inspect live deliveries.",
    })
  }

  let result
  try {
    result = await applyWebhook(body)
  } catch (err) {
    console.error("Link Money webhook: applyWebhook failed", err)
    return finish(
      500,
      err instanceof Error ? err.message : "applyWebhook failed",
      {
        error: "Internal error",
        signatureValid,
        signatureHeaderName,
      }
    )
  }

  if (!result.payment) {
    console.warn("Link Money webhook: skipped", {
      eventType,
      reason: result.reason,
    })
    return finish(200, `skipped: ${result.reason}`, {
      received: true,
      skipped: result.reason,
      signatureValid,
      signatureHeaderName,
    })
  }

  if (result.applied && result.payment.orderId) {
    const orderId = result.payment.orderId
    const paymentStatus = result.payment.status
    after(async () => {
      try {
        await syncOrderFromPayment(orderId, paymentStatus)
      } catch (err) {
        console.error("Link Money webhook: order sync failed", err)
      }
    })
  }

  return finish(200, null, {
    received: true,
    status: result.payment.status,
    signatureValid,
    signatureHeaderName,
  })
}

function getIncomingSignature(req: NextRequest): {
  signatureHeaderName: string | null
  signature: string | null
} {
  const candidates = [
    "x-link-money-signature",
    "x-webhook-signature",
    "x-signature",
    "signature",
    "authorization",
  ]

  for (const name of candidates) {
    const value = req.headers.get(name)
    if (value) {
      return { signatureHeaderName: name, signature: value.trim() }
    }
  }

  return { signatureHeaderName: null, signature: null }
}

function verifyWebhookSignature({
  rawBody,
  signature,
  secret,
}: {
  rawBody: string
  signature: string | null
  secret: string | undefined
}): {
  valid: boolean
  mode: string | null
  candidatesPreview: Record<string, string>
} {
  if (!secret || !signature) {
    return {
      valid: false,
      mode: null,
      candidatesPreview: {},
    }
  }

  // Common webhook signing variants:
  // 1) hex(HMAC_SHA256(rawBody, secret))
  // 2) base64(HMAC_SHA256(rawBody, secret))
  // 3) "sha256=" + base64(...)
  // 4) "sha256=" + hex(...)
  const hex = crypto.createHmac("sha256", secret).update(rawBody, "utf8").digest("hex")
  const base64 = crypto.createHmac("sha256", secret).update(rawBody, "utf8").digest("base64")
  const prefixedBase64 = `sha256=${base64}`
  const prefixedHex = `sha256=${hex}`

  const normalized = signature.trim()

  const candidates: Array<{ mode: string; value: string }> = [
    { mode: "hmac-sha256-hex", value: hex },
    { mode: "hmac-sha256-base64", value: base64 },
    { mode: "hmac-sha256-prefixed-base64", value: prefixedBase64 },
    { mode: "hmac-sha256-prefixed-hex", value: prefixedHex },
  ]

  for (const candidate of candidates) {
    if (safeEqual(normalized, candidate.value)) {
      return {
        valid: true,
        mode: candidate.mode,
        candidatesPreview: {
          [candidate.mode]: redactMiddle(candidate.value, 10, 6),
        },
      }
    }
  }

  return {
    valid: false,
    mode: null,
    candidatesPreview: {
      "hmac-sha256-hex": redactMiddle(hex, 10, 6),
      "hmac-sha256-base64": redactMiddle(base64, 10, 6),
      "hmac-sha256-prefixed-base64": redactMiddle(prefixedBase64, 10, 6),
      "hmac-sha256-prefixed-hex": redactMiddle(prefixedHex, 10, 6),
    },
  }
}

function safeEqual(a: string, b: string): boolean {
  const aBuf = Buffer.from(a)
  const bBuf = Buffer.from(b)
  if (aBuf.length !== bBuf.length) return false
  return crypto.timingSafeEqual(aBuf, bBuf)
}

function redactMiddle(value: string, left = 8, right = 4): string {
  if (value.length <= left + right) return "[redacted]"
  return `${value.slice(0, left)}…${value.slice(-right)}`
}

function headersToObject(req: NextRequest): Record<string, string> {
  const out: Record<string, string> = {}

  req.headers.forEach((value, key) => {
    const lower = key.toLowerCase()
    if (
      lower === "x-link-money-signature" ||
      lower === "x-webhook-signature" ||
      lower === "x-signature" ||
      lower === "signature" ||
      lower === "authorization"
    ) {
      out[key] = redactMiddle(value, 10, 6)
      return
    }
    out[key] = value
  })

  return out
}

async function syncOrderFromPayment(
  orderId: string,
  status: string
): Promise<void> {
  const supabase = createAdminClient()

  const { data: order } = await supabase
    .from("orders")
    .select("id, payment_status, status, order_number")
    .eq("id", orderId)
    .single()

  if (!order) return

  if (
    status === "AUTHORIZED" ||
    status === "INITIATED" ||
    status === "SUCCEEDED"
  ) {
    if (order.payment_status === "paid") return

    await adjustInventoryForOrderAsAdmin(order.id)

    await supabase
      .from("orders")
      .update({
        payment_status: "paid",
        status: order.status === "pending" ? "processing" : order.status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", order.id)

    getOrderByIdAsAdmin(order.id)
      .then((full) => full && sendOrderNotificationEmail(full))
      .catch((err) => console.error("notif email failed", err))

    return
  }

  if (status === "FAILED") {
    if (order.payment_status === "failed") return

    if (order.payment_status === "paid") {
      await restoreInventoryForOrderAsAdmin(order.id)
    }

    await supabase
      .from("orders")
      .update({
        payment_status: "failed",
        status: "cancelled",
        updated_at: new Date().toISOString(),
      })
      .eq("id", order.id)
  }
}