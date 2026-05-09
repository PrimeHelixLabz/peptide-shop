-- Persistent idempotency guard for payment webhooks.
-- Each provider supplies an event identifier that is stable across
-- redeliveries (Link Money: x-signature-uniqueid; Stripe: event.id; etc.).
-- The composite PK (provider, event_id) makes "have we seen this?" an
-- atomic INSERT that survives process restarts and works across multiple
-- serverless instances.

CREATE TABLE IF NOT EXISTS webhook_dedupe (
  provider     TEXT NOT NULL,
  event_id     TEXT NOT NULL,
  received_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (provider, event_id)
);

-- Used by a future retention purge job (rows older than ~30d can be
-- dropped — providers do not redeliver that far back).
CREATE INDEX IF NOT EXISTS idx_webhook_dedupe_received_at
  ON webhook_dedupe (received_at);
