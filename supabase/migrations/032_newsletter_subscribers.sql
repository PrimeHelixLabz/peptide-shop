-- ============================================================
-- Migration: newsletter subscribers
-- ============================================================
-- Captures email-address subscriptions from the exit-intent
-- popup and any other email-capture surfaces. One row per
-- unique email address; `unsubscribed_at` is non-null when the
-- subscriber has opted out.

-- citext is bundled with Supabase Postgres; enable before column use
CREATE EXTENSION IF NOT EXISTS "citext";

CREATE TABLE IF NOT EXISTS public.newsletter_subscribers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email           CITEXT UNIQUE NOT NULL,
  source          TEXT NOT NULL DEFAULT 'popup',
  subscribed_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  unsubscribed_at TIMESTAMPTZ,
  ip_hash         TEXT,
  user_agent      TEXT,
  metadata        JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_newsletter_subscribers_subscribed_at
  ON public.newsletter_subscribers(subscribed_at DESC);

CREATE INDEX IF NOT EXISTS idx_newsletter_subscribers_active
  ON public.newsletter_subscribers(email)
  WHERE unsubscribed_at IS NULL;

-- RLS: this table is server-only. No client should ever read or
-- write directly; the /api/newsletter/subscribe route uses the
-- service-role client.
ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;

-- Deny-all default; service role bypasses RLS.
DROP POLICY IF EXISTS "newsletter_subscribers_no_client_access"
  ON public.newsletter_subscribers;
CREATE POLICY "newsletter_subscribers_no_client_access"
  ON public.newsletter_subscribers
  FOR ALL
  TO authenticated, anon
  USING (false)
  WITH CHECK (false);

COMMENT ON TABLE public.newsletter_subscribers IS
  'Email subscribers captured from exit-intent popup and other capture surfaces. Server-only access via service role.';
