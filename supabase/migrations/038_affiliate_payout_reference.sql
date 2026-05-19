-- ============================================================
-- Migration: payout_reference on affiliate_conversions
-- ============================================================
-- Adds a free-form text column that an admin fills in when marking
-- conversions as paid. Holds the proof-of-payment for the partner:
-- a crypto tx hash, a PayPal transaction ID, a Wise transfer ID,
-- "USDC on Polygon — 0xabc…", or similar.
--
-- Partner-visible (truncated) on the dashboard so partners can match
-- against their own wallet without us exposing the full reference.

ALTER TABLE public.affiliate_conversions
  ADD COLUMN IF NOT EXISTS payout_reference TEXT;

COMMENT ON COLUMN public.affiliate_conversions.payout_reference IS
  'Free-form proof-of-payment string captured when admin marks the conversion paid. Tx hash, PayPal ID, Wise ID, etc.';
