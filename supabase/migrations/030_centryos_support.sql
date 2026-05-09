-- ============================================================
-- Migration: CentryOS payment provider support
-- ============================================================
-- Adds CentryOS as a second multi-provider hosted-checkout option
-- alongside Link Money. Mirrors the link_money table layout so the
-- payments ledger can serve both providers.
--
-- Key changes:
--   1. payments.provider column (defaults to 'link_money' for the
--      existing rows so no backfill query is needed).
--   2. CentryOS-specific link/token/expiry columns plus the raw
--      create-link response for audit.
--   3. UNIQUE (provider, client_reference_id) replaces the global
--      UNIQUE so each provider has its own idempotency namespace.
--   4. Extended status CHECK to cover CentryOS lifecycle states.
--   5. Dedicated centryos_webhook_logs table (parallel to
--      link_money_webhook_logs).

-- 1. Provider scoping + CentryOS columns on payments
ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS provider                       TEXT NOT NULL DEFAULT 'link_money',
  ADD COLUMN IF NOT EXISTS provider_payment_link_id       TEXT,
  ADD COLUMN IF NOT EXISTS provider_payment_link_token    TEXT,
  ADD COLUMN IF NOT EXISTS provider_payment_link_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS checkout_url                   TEXT,
  ADD COLUMN IF NOT EXISTS raw_create_response            JSONB;

-- 2. Replace the global UNIQUE on client_reference_id with one scoped
--    by provider. This lets CentryOS reuse the same orderNumber/
--    client_reference_id space without colliding with Link Money.
ALTER TABLE payments
  DROP CONSTRAINT IF EXISTS payments_client_reference_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS uq_payments_provider_client_ref
  ON payments (provider, client_reference_id);

-- 3. Extend status CHECK to include CentryOS-friendly states.
--    PROCESSING covers the gap between link-creation and webhook
--    confirmation. EXPIRED and CANCELLED are CentryOS-specific
--    terminal states distinct from FAILED.
ALTER TABLE payments
  DROP CONSTRAINT IF EXISTS payments_status_check;

ALTER TABLE payments
  ADD CONSTRAINT payments_status_check CHECK (status IN (
    'CREATED',
    'PENDING',
    'AUTHORIZED',
    'INITIATED',
    'PROCESSING',
    'SUCCEEDED',
    'FAILED',
    'CANCELLED',
    'EXPIRED'
  ));

-- 4. Index for CentryOS link lookup (webhook fallback path).
CREATE INDEX IF NOT EXISTS idx_payments_provider_link_id
  ON payments (provider_payment_link_id)
  WHERE provider_payment_link_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_payments_provider
  ON payments (provider);

-- 5. Raw CentryOS webhook logs - parallel to link_money_webhook_logs.
CREATE TABLE IF NOT EXISTS centryos_webhook_logs (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  received_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  event_type           TEXT,
  status               TEXT,
  order_id             TEXT,
  payment_link_id      TEXT,
  transaction_id       TEXT,
  signature_valid      BOOLEAN NOT NULL DEFAULT false,
  headers              JSONB,
  body                 JSONB,
  raw_body             TEXT,
  status_code          INT,
  error                TEXT
);

CREATE INDEX IF NOT EXISTS idx_centryos_webhook_logs_received_at
  ON centryos_webhook_logs (received_at DESC);

CREATE INDEX IF NOT EXISTS idx_centryos_webhook_logs_order_id
  ON centryos_webhook_logs (order_id)
  WHERE order_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_centryos_webhook_logs_event_type
  ON centryos_webhook_logs (event_type);
