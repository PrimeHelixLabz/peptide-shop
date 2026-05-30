-- ============================================================
-- Migration: manual commission entry on affiliate_conversions
-- ============================================================
-- Adds two columns so admins can manually credit an affiliate
-- when a customer forgot to enter their referral code at checkout:
--
--   source      — 'automatic' (DB trigger) vs 'manual' (admin-created)
--   admin_notes — free-form context the admin records at entry time
--
-- Existing rows receive source = 'automatic' via the DEFAULT.

ALTER TABLE public.affiliate_conversions
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'automatic'
    CHECK (source IN ('automatic', 'manual'));

ALTER TABLE public.affiliate_conversions
  ADD COLUMN IF NOT EXISTS admin_notes TEXT;

COMMENT ON COLUMN public.affiliate_conversions.source IS
  'automatic = created by DB trigger on order payment; manual = admin-created for missed attribution.';

COMMENT ON COLUMN public.affiliate_conversions.admin_notes IS
  'Optional context recorded when source=manual, e.g. "Customer forgot code, confirmed via DM with affiliate".';
