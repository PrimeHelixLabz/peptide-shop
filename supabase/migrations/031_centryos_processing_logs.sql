-- ============================================================
-- Migration: CentryOS background-processing audit log
-- ============================================================
-- The webhook handler returns 200 immediately and runs business
-- logic (payment-row lookup, status transition, inventory adjust,
-- order update, notification email) in `after()`. This table
-- captures the full trace of each background run so silent failures
-- and slow-paths are visible without trawling console logs.
--
-- One row per webhook delivery (whether processing succeeded,
-- skipped, or failed). Paired with `centryos_webhook_logs` which
-- captures the request envelope.

CREATE TABLE IF NOT EXISTS centryos_processing_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  received_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  event_type      TEXT,
  status          TEXT,
  order_id        TEXT,
  payment_link_id TEXT,
  transaction_id  TEXT,
  -- "applied"  → webhook caused a state change
  -- "skipped"  → webhook valid but already-applied / non-COLLECTION / no-op
  -- "failed"   → background processing threw an unhandled error
  outcome         TEXT NOT NULL,
  reason          TEXT,
  duration_ms     INTEGER,
  context         JSONB,
  steps           JSONB,
  error           TEXT
);

CREATE INDEX IF NOT EXISTS idx_centryos_proc_logs_received_at
  ON centryos_processing_logs (received_at DESC);

CREATE INDEX IF NOT EXISTS idx_centryos_proc_logs_order_id
  ON centryos_processing_logs (order_id)
  WHERE order_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_centryos_proc_logs_outcome
  ON centryos_processing_logs (outcome);

CREATE INDEX IF NOT EXISTS idx_centryos_proc_logs_transaction_id
  ON centryos_processing_logs (transaction_id)
  WHERE transaction_id IS NOT NULL;
