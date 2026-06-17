-- ============================================================
-- Migration: email campaigns (marketing sends)
-- ============================================================
-- One row per marketing email blast sent from the admin
-- newsletter page. Records the composed content and the
-- delivery outcome so the admin has an audit trail and a basis
-- for resending. Recipients themselves are not stored per-row;
-- they are resolved at send time from newsletter_subscribers.

CREATE TABLE IF NOT EXISTS public.email_campaigns (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject         TEXT NOT NULL,
  body_markdown   TEXT NOT NULL,
  -- 'all_active'  → every active subscriber at send time
  -- 'selected'    → an explicit subset chosen in the UI
  audience        TEXT NOT NULL DEFAULT 'all_active',
  recipient_count INTEGER NOT NULL DEFAULT 0,
  sent_count      INTEGER NOT NULL DEFAULT 0,
  failed_count    INTEGER NOT NULL DEFAULT 0,
  -- 'sending' | 'sent' | 'partial' | 'failed'
  status          TEXT NOT NULL DEFAULT 'sending',
  created_by      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_at         TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_email_campaigns_created_at
  ON public.email_campaigns(created_at DESC);

-- RLS: server-only. The admin API routes use the service-role
-- client; no authenticated/anon client should touch this table.
ALTER TABLE public.email_campaigns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "email_campaigns_no_client_access"
  ON public.email_campaigns;
CREATE POLICY "email_campaigns_no_client_access"
  ON public.email_campaigns
  FOR ALL
  TO authenticated, anon
  USING (false)
  WITH CHECK (false);

COMMENT ON TABLE public.email_campaigns IS
  'Marketing email blasts sent from the admin newsletter page. Server-only access via service role.';
