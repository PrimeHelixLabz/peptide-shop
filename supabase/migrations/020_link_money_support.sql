-- ============================================================
-- Migration: Link Money pay-by-bank support
-- ============================================================

-- 1. Add provider columns to orders table for multi-provider support.
--    Existing Stripe orders get provider='stripe' by default.
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS provider TEXT NOT NULL DEFAULT 'stripe',
  ADD COLUMN IF NOT EXISTS provider_payment_id TEXT,
  ADD COLUMN IF NOT EXISTS provider_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS provider_metadata JSONB;

-- Index for webhook lookups by provider payment ID
CREATE INDEX IF NOT EXISTS idx_orders_provider_payment_id
  ON orders (provider_payment_id)
  WHERE provider_payment_id IS NOT NULL;

-- 2. Webhook / event log table - provider-agnostic.
CREATE TABLE IF NOT EXISTS payment_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL,             -- 'stripe' | 'link_money'
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  provider_payment_id TEXT,
  provider_customer_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_webhook_events_provider
  ON payment_webhook_events (provider, event_type);

CREATE INDEX IF NOT EXISTS idx_webhook_events_payment_id
  ON payment_webhook_events (provider_payment_id)
  WHERE provider_payment_id IS NOT NULL;

-- 3. Extend pending_checkouts for Link Money (nullable stripe_session_id,
--    add generic provider column).
ALTER TABLE pending_checkouts
  ALTER COLUMN stripe_session_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS provider TEXT NOT NULL DEFAULT 'stripe';
