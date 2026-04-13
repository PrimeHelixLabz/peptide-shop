-- ============================================================
-- Migration: raw Link Money webhook logs
-- ============================================================
-- Every hit on /api/payments/link-money/webhook is persisted here
-- verbatim, regardless of whether it was processed. This is purely
-- a debugging / audit surface — do not read from it at runtime.

CREATE TABLE IF NOT EXISTS link_money_webhook_logs (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  received_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  event_type           TEXT,
  client_reference_id  TEXT,
  transaction_id       TEXT,
  signature_valid      BOOLEAN NOT NULL DEFAULT false,
  headers              JSONB,
  body                 JSONB,
  raw_body             TEXT,
  status_code          INT,
  error                TEXT
);

CREATE INDEX IF NOT EXISTS idx_lm_webhook_logs_received_at
  ON link_money_webhook_logs (received_at DESC);

CREATE INDEX IF NOT EXISTS idx_lm_webhook_logs_client_ref
  ON link_money_webhook_logs (client_reference_id)
  WHERE client_reference_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_lm_webhook_logs_event_type
  ON link_money_webhook_logs (event_type);
