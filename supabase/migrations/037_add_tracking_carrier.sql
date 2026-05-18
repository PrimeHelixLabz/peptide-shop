-- ============================================================
-- Migration: add tracking_carrier to orders
-- ============================================================
-- The orders table already has `tracking_number` (TEXT). Adding the
-- carrier as a sibling column rather than concatenating "carrier:number"
-- into the existing field — keeps reads cheap, lets us build the
-- per-carrier tracking URL without parsing, and survives a tracking
-- number that legitimately contains a colon.
--
-- Allowed values mirror the carrier registry in lib/shipping/carriers.ts.
-- The check constraint is intentionally permissive: an admin can pick
-- "other" and we'll display the bare number with no link.

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS tracking_carrier TEXT
    CHECK (tracking_carrier IS NULL OR tracking_carrier IN (
      'fedex', 'usps', 'ups', 'dhl', 'other'
    ));

COMMENT ON COLUMN public.orders.tracking_carrier IS
  'Shipping carrier for the tracking_number. NULL when no shipment is recorded. See lib/shipping/carriers.ts for the URL builder.';
