-- ============================================================
-- Migration: payments table (Link Money source-of-truth ledger)
-- ============================================================
-- Dedicated payments ledger so webhook is the single source of
-- truth for payment state. Order state is derived from here.

CREATE TABLE IF NOT EXISTS payments (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id             UUID REFERENCES orders (id) ON DELETE SET NULL,
  client_reference_id  TEXT NOT NULL UNIQUE,
  transaction_id       TEXT,
  status               TEXT NOT NULL DEFAULT 'CREATED'
                         CHECK (status IN (
                           'CREATED',
                           'PENDING',
                           'AUTHORIZED',
                           'INITIATED',
                           'SUCCEEDED',
                           'FAILED'
                         )),
  amount               NUMERIC(12, 2) NOT NULL,
  currency             TEXT NOT NULL DEFAULT 'USD',
  session_key          TEXT,
  raw_webhook          JSONB,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payments_order_id
  ON payments (order_id);

CREATE INDEX IF NOT EXISTS idx_payments_transaction_id
  ON payments (transaction_id)
  WHERE transaction_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_payments_status
  ON payments (status);

-- Keep updated_at fresh on every row update.
CREATE OR REPLACE FUNCTION set_payments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_payments_updated_at ON payments;
CREATE TRIGGER trg_payments_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW
  EXECUTE FUNCTION set_payments_updated_at();
