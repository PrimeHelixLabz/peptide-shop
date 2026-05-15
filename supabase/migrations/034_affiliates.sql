-- ============================================================
-- Migration: affiliate program (referrals + commissions)
-- ============================================================
-- Implements a minimal but production-ready affiliate program:
--   * affiliates           — one row per partner (status, payout, rate)
--   * affiliate_codes      — referral codes that map to an affiliate
--   * affiliate_conversions — one row per attributed paid order
--
-- Attribution is cookie-based. The middleware sets the `phl_ref`
-- cookie when ?ref=CODE is present in any URL; checkout-creating
-- routes read the cookie and persist `affiliate_code` on the order.
-- A trigger on `orders` creates a conversion row when payment_status
-- flips to 'paid' and an affiliate_code is set, snapshotting the
-- commission rate at that moment so historical changes don't
-- retroactively rewrite payouts.

CREATE TABLE IF NOT EXISTS public.affiliates (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  name            TEXT NOT NULL,
  email           CITEXT UNIQUE NOT NULL,
  website         TEXT,
  audience        TEXT,
  payout_method   TEXT,
  payout_details  TEXT,
  -- pending  → submitted, awaiting admin approval
  -- approved → active; can earn commission
  -- suspended → inactive; existing conversions stand but no new ones
  status          TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'approved', 'suspended')),
  commission_rate NUMERIC(4,3) NOT NULL DEFAULT 0.10
                    CHECK (commission_rate >= 0 AND commission_rate <= 1),
  approved_at     TIMESTAMPTZ,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_affiliates_status
  ON public.affiliates(status);

DROP TRIGGER IF EXISTS update_affiliates_updated_at ON public.affiliates;
CREATE TRIGGER update_affiliates_updated_at
  BEFORE UPDATE ON public.affiliates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.affiliate_codes (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id  UUID NOT NULL REFERENCES public.affiliates(id) ON DELETE CASCADE,
  code          CITEXT UNIQUE NOT NULL,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_affiliate_codes_affiliate
  ON public.affiliate_codes(affiliate_id);

-- Add affiliate_code column to orders (FK to affiliate_codes.code by value).
-- Stored as plain TEXT (not FK) so deleting an affiliate doesn't cascade
-- through paid orders — the historical attribution stays intact.
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS affiliate_code TEXT;

CREATE INDEX IF NOT EXISTS idx_orders_affiliate_code
  ON public.orders(affiliate_code)
  WHERE affiliate_code IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.affiliate_conversions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id      UUID NOT NULL REFERENCES public.affiliates(id) ON DELETE CASCADE,
  code              TEXT NOT NULL,
  order_id          UUID NOT NULL UNIQUE REFERENCES public.orders(id) ON DELETE CASCADE,
  order_total       NUMERIC(10,2) NOT NULL CHECK (order_total >= 0),
  commission_rate   NUMERIC(4,3) NOT NULL CHECK (commission_rate >= 0 AND commission_rate <= 1),
  commission_amount NUMERIC(10,2) NOT NULL CHECK (commission_amount >= 0),
  -- pending  → freshly created, not yet payable (e.g., refund window)
  -- payable  → cleared the holdback period; ready for payout
  -- paid     → settled
  -- reversed → order was refunded; commission revoked
  status            TEXT NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending', 'payable', 'paid', 'reversed')),
  paid_at           TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_affiliate_conversions_affiliate
  ON public.affiliate_conversions(affiliate_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_affiliate_conversions_status
  ON public.affiliate_conversions(status);

DROP TRIGGER IF EXISTS update_affiliate_conversions_updated_at
  ON public.affiliate_conversions;
CREATE TRIGGER update_affiliate_conversions_updated_at
  BEFORE UPDATE ON public.affiliate_conversions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- Conversion-creating trigger
-- ============================================================
-- Fires on orders UPDATE when payment_status transitions to 'paid'
-- AND affiliate_code is set AND no conversion exists yet for the order.
-- Looks up the affiliate by code, snapshots the rate, inserts the row.

CREATE OR REPLACE FUNCTION create_affiliate_conversion_on_paid()
RETURNS TRIGGER AS $$
DECLARE
  v_affiliate_id UUID;
  v_rate NUMERIC(4,3);
BEGIN
  -- Only fire on transitions INTO 'paid'.
  IF NEW.payment_status <> 'paid' THEN
    RETURN NEW;
  END IF;
  IF OLD.payment_status = 'paid' THEN
    RETURN NEW;
  END IF;
  IF NEW.affiliate_code IS NULL OR NEW.affiliate_code = '' THEN
    RETURN NEW;
  END IF;

  -- Resolve affiliate from the code (case-insensitive via citext)
  SELECT a.id, a.commission_rate
    INTO v_affiliate_id, v_rate
  FROM public.affiliate_codes c
  JOIN public.affiliates a ON a.id = c.affiliate_id
  WHERE c.code = NEW.affiliate_code
    AND c.is_active = true
    AND a.status = 'approved'
  LIMIT 1;

  IF v_affiliate_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Insert the conversion. ON CONFLICT ON the (order_id) unique constraint
  -- guards against duplicate firings (e.g. paid → refunded → paid bounces).
  INSERT INTO public.affiliate_conversions (
    affiliate_id, code, order_id, order_total,
    commission_rate, commission_amount, status
  )
  VALUES (
    v_affiliate_id,
    NEW.affiliate_code,
    NEW.id,
    NEW.total,
    v_rate,
    ROUND(NEW.total * v_rate, 2),
    'pending'
  )
  ON CONFLICT (order_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_create_affiliate_conversion_on_paid
  ON public.orders;
CREATE TRIGGER trigger_create_affiliate_conversion_on_paid
  AFTER UPDATE OF payment_status ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION create_affiliate_conversion_on_paid();

-- Also fire on INSERT, since some flows (Stripe webhook) create the
-- order with payment_status='paid' directly rather than transitioning.
CREATE OR REPLACE FUNCTION create_affiliate_conversion_on_insert_paid()
RETURNS TRIGGER AS $$
DECLARE
  v_affiliate_id UUID;
  v_rate NUMERIC(4,3);
BEGIN
  IF NEW.payment_status <> 'paid' THEN
    RETURN NEW;
  END IF;
  IF NEW.affiliate_code IS NULL OR NEW.affiliate_code = '' THEN
    RETURN NEW;
  END IF;

  SELECT a.id, a.commission_rate
    INTO v_affiliate_id, v_rate
  FROM public.affiliate_codes c
  JOIN public.affiliates a ON a.id = c.affiliate_id
  WHERE c.code = NEW.affiliate_code
    AND c.is_active = true
    AND a.status = 'approved'
  LIMIT 1;

  IF v_affiliate_id IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.affiliate_conversions (
    affiliate_id, code, order_id, order_total,
    commission_rate, commission_amount, status
  )
  VALUES (
    v_affiliate_id,
    NEW.affiliate_code,
    NEW.id,
    NEW.total,
    v_rate,
    ROUND(NEW.total * v_rate, 2),
    'pending'
  )
  ON CONFLICT (order_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_create_affiliate_conversion_on_insert
  ON public.orders;
CREATE TRIGGER trigger_create_affiliate_conversion_on_insert
  AFTER INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION create_affiliate_conversion_on_insert_paid();

-- ============================================================
-- RLS
-- ============================================================
-- Affiliates can read their own row + their codes + their conversions.
-- All writes flow through the API under the service role.

ALTER TABLE public.affiliates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_conversions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Affiliates can read their own profile"
  ON public.affiliates;
CREATE POLICY "Affiliates can read their own profile"
  ON public.affiliates
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Affiliates can read their own codes"
  ON public.affiliate_codes;
CREATE POLICY "Affiliates can read their own codes"
  ON public.affiliate_codes
  FOR SELECT
  TO authenticated
  USING (
    affiliate_id IN (
      SELECT id FROM public.affiliates WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Affiliates can read their own conversions"
  ON public.affiliate_conversions;
CREATE POLICY "Affiliates can read their own conversions"
  ON public.affiliate_conversions
  FOR SELECT
  TO authenticated
  USING (
    affiliate_id IN (
      SELECT id FROM public.affiliates WHERE user_id = auth.uid()
    )
  );

COMMENT ON TABLE public.affiliates IS
  'Affiliate program partners. Approve/suspend via Supabase dashboard. commission_rate is per-partner; falls back to 0.10 default.';
COMMENT ON TABLE public.affiliate_conversions IS
  'One row per attributed paid order. Created automatically by trigger when orders.payment_status flips to ''paid'' AND orders.affiliate_code is set AND a matching active code exists.';
