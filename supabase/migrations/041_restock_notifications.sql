-- Restock notification subscriptions.
--
-- One row per (variant, email) pair waiting to be emailed when the variant
-- transitions back to in_stock = true. The cron at /api/cron/restock-notify
-- runs every 15 minutes, joins this table against product_variants where
-- in_stock = true AND notified_at IS NULL, sends one email per row, and
-- stamps notified_at so the same person isn't notified twice for the same
-- restock cycle.
--
-- The unsubscribe_token is opaque (random base64url, generated at insert
-- time) and stored directly. No HMAC needed because token knowledge already
-- equals row-level authority — easier to reason about than rotating secrets.

CREATE TABLE IF NOT EXISTS public.restock_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  variant_id UUID NOT NULL REFERENCES public.product_variants(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  unsubscribe_token TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  notified_at TIMESTAMPTZ
);

-- Email is normalized to lowercase by the API route before insert.
-- Unique constraint makes resubscribing idempotent (ON CONFLICT DO NOTHING).
CREATE UNIQUE INDEX IF NOT EXISTS idx_restock_notifications_variant_email
  ON public.restock_notifications (variant_id, email);

-- Hot index for the cron: only pending rows. Keeps scans cheap even as we
-- accumulate historical notified rows for analytics.
CREATE INDEX IF NOT EXISTS idx_restock_notifications_pending
  ON public.restock_notifications (variant_id)
  WHERE notified_at IS NULL;

-- RLS: all access goes through the admin client (API routes). No
-- user-facing policies needed.
ALTER TABLE public.restock_notifications ENABLE ROW LEVEL SECURITY;
