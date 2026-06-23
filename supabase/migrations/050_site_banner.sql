-- ============================================================
-- Migration: site banner (configurable homepage notice)
-- ============================================================
-- A single, admin-editable announcement rendered at the top of the
-- homepage (replaces the old hard-coded VacationNotice component). The
-- admin can toggle it on/off and rewrite the title + message for any
-- purpose — shipping delay, sale, holiday hours, etc.
--
-- Enforced as a singleton via a BOOLEAN primary key fixed at true, so
-- there is only ever one row to read/update. Content is non-sensitive and
-- publicly readable (the homepage uses the anon public client); writes are
-- admin-only and go through the authenticated server client + RLS, matching
-- the categories table.

CREATE TABLE IF NOT EXISTS public.site_banner (
  -- Singleton guard: only the row with id = true is allowed to exist.
  id         BOOLEAN PRIMARY KEY DEFAULT true CHECK (id),
  enabled    BOOLEAN NOT NULL DEFAULT false,
  title      TEXT NOT NULL DEFAULT '',
  message    TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by TEXT
);

-- Seed the singleton row (disabled, pre-filled with the old vacation copy
-- as a starting example the admin can edit or clear).
INSERT INTO public.site_banner (id, enabled, title, message)
VALUES (
  true,
  false,
  'Temporary Shipping Delay',
  'Orders placed between April 21 and April 27 will be processed on April 28. Thank you for your patience.'
)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.site_banner ENABLE ROW LEVEL SECURITY;

-- Anyone can read the banner (homepage renders it via the anon client).
DROP POLICY IF EXISTS "Site banner is viewable by everyone" ON public.site_banner;
CREATE POLICY "Site banner is viewable by everyone"
  ON public.site_banner FOR SELECT
  USING (true);

-- Only admins can change it.
DROP POLICY IF EXISTS "Only admins can update site banner" ON public.site_banner;
CREATE POLICY "Only admins can update site banner"
  ON public.site_banner FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

COMMENT ON TABLE public.site_banner IS
  'Singleton admin-editable homepage announcement banner. Public read, admin-only write.';
