-- ============================================================
-- Migration: discount codes (customer-facing promo codes)
-- ============================================================
-- Single-table model (no Stripe-style coupon/promo-code split). Each row
-- in `discount_codes` is one redeemable string with its own discount
-- amount and restrictions. Redemptions are tracked per-(code,user|email)
-- so a "per-user once" code can be enforced at the DB level.
--
-- Money columns mirror the rest of the app: NUMERIC(10,2) dollars,
-- matching orders.subtotal / total. No cents conversion needed.

CREATE TABLE IF NOT EXISTS public.discount_codes (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Stored upper-cased; the API normalizes on insert and on lookup.
  -- citext would also work but the rest of the codebase uses TEXT + LOWER/UPPER
  -- normalization, so we stay consistent here.
  code                        TEXT UNIQUE NOT NULL CHECK (length(code) BETWEEN 3 AND 40),

  -- The discount itself: percent off OR fixed dollar amount off.
  discount_type               TEXT NOT NULL
                                CHECK (discount_type IN ('percent', 'amount')),
  percent_off                 NUMERIC(5,2)
                                CHECK (percent_off IS NULL
                                       OR (percent_off > 0 AND percent_off <= 100)),
  amount_off                  NUMERIC(10,2)
                                CHECK (amount_off IS NULL OR amount_off > 0),

  -- Exactly one of percent_off / amount_off is required, matched to discount_type.
  CONSTRAINT discount_type_value_match CHECK (
    (discount_type = 'percent' AND percent_off IS NOT NULL AND amount_off IS NULL)
    OR
    (discount_type = 'amount' AND amount_off IS NOT NULL AND percent_off IS NULL)
  ),

  -- Limits
  max_redemptions             INTEGER
                                CHECK (max_redemptions IS NULL OR max_redemptions > 0),
  per_user_max_redemptions    INTEGER
                                CHECK (per_user_max_redemptions IS NULL
                                       OR per_user_max_redemptions > 0),
  min_subtotal                NUMERIC(10,2)
                                CHECK (min_subtotal IS NULL OR min_subtotal >= 0),
  -- When set, code can only be redeemed by this specific user. Useful
  -- for VIP / customer-service make-goods. ON DELETE SET NULL so the
  -- code outlives a deleted account (becomes "no longer redeemable").
  restricted_to_user_id       UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Lifecycle
  is_active                   BOOLEAN NOT NULL DEFAULT TRUE,
  expires_at                  TIMESTAMPTZ,
  -- Reservation counter — incremented atomically at order creation,
  -- decremented if payment fails or order is canceled. NOT the same
  -- as confirmed redemptions; see discount_redemptions for those.
  redeemed_count              INTEGER NOT NULL DEFAULT 0
                                CHECK (redeemed_count >= 0),

  created_by                  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_discount_codes_code
  ON public.discount_codes(code);

CREATE INDEX IF NOT EXISTS idx_discount_codes_active
  ON public.discount_codes(is_active, expires_at)
  WHERE is_active = TRUE;

DROP TRIGGER IF EXISTS update_discount_codes_updated_at
  ON public.discount_codes;
CREATE TRIGGER update_discount_codes_updated_at
  BEFORE UPDATE ON public.discount_codes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- Redemption ledger
-- ============================================================
-- One row per *confirmed* redemption (i.e. after payment success). The
-- unique constraints enforce "once per user" / "once per guest email"
-- at the DB level so the application can't accidentally double-count.

CREATE TABLE IF NOT EXISTS public.discount_redemptions (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code_id                     UUID NOT NULL
                                REFERENCES public.discount_codes(id) ON DELETE CASCADE,
  -- Exactly one of user_id / guest_email is populated.
  user_id                     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  guest_email                 TEXT,
  order_id                    UUID NOT NULL
                                REFERENCES public.orders(id) ON DELETE CASCADE,
  discount_applied            NUMERIC(10,2) NOT NULL CHECK (discount_applied >= 0),
  redeemed_at                 TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Either user-bound or email-bound, never both, never neither.
  CONSTRAINT redemption_actor_xor CHECK (
    (user_id IS NOT NULL AND guest_email IS NULL)
    OR
    (user_id IS NULL AND guest_email IS NOT NULL)
  )
);

-- One redemption per (code, user) and (code, email). NULLS NOT DISTINCT
-- so that null on the inactive side doesn't bypass the dedup.
CREATE UNIQUE INDEX IF NOT EXISTS uq_discount_redemptions_user
  ON public.discount_redemptions(code_id, user_id)
  WHERE user_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_discount_redemptions_guest_email
  ON public.discount_redemptions(code_id, lower(guest_email))
  WHERE guest_email IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_discount_redemptions_code
  ON public.discount_redemptions(code_id, redeemed_at DESC);

-- ============================================================
-- Orders: capture which discount was used + how much was applied
-- ============================================================
-- discount_code_id stays as FK (with ON DELETE SET NULL) so admin can
-- delete a defunct code without nuking historical orders.
-- discount_amount is denormalized for the order summary / emails;
-- recomputing from the rate would risk drift if the code is edited.

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS discount_code_id UUID
    REFERENCES public.discount_codes(id) ON DELETE SET NULL;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS discount_code TEXT;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(10,2)
    NOT NULL DEFAULT 0 CHECK (discount_amount >= 0);

CREATE INDEX IF NOT EXISTS idx_orders_discount_code_id
  ON public.orders(discount_code_id)
  WHERE discount_code_id IS NOT NULL;

-- ============================================================
-- Atomic reservation / release
-- ============================================================
-- The order-creation flow needs a race-safe "reserve a redemption slot
-- if there's still room" primitive. A plain SELECT then UPDATE has a
-- TOCTOU race when two customers redeem a 1-use code simultaneously.
-- These RPCs fold the check + update into a single statement.

-- Reserve a redemption slot atomically. Re-checks every restriction that
-- could have flipped between validateCode() and order creation: is_active,
-- expires_at, restricted_to_user_id, max_redemptions, and the per-user cap.
-- Done inside one transaction with FOR UPDATE so two concurrent checkouts
-- by the same customer can't both squeak past the per-user cap.
CREATE OR REPLACE FUNCTION public.discount_reserve_redemption(
  p_code_id UUID,
  p_user_id UUID DEFAULT NULL,
  p_guest_email TEXT DEFAULT NULL
)
RETURNS SETOF public.discount_codes
LANGUAGE plpgsql
AS $$
DECLARE
  v_code public.discount_codes;
  v_per_user_count INTEGER;
BEGIN
  -- Row-lock the code so concurrent reserves serialize on it.
  SELECT * INTO v_code
  FROM public.discount_codes
  WHERE id = p_code_id
  FOR UPDATE;

  IF NOT FOUND THEN RETURN; END IF;

  IF NOT v_code.is_active THEN RETURN; END IF;
  IF v_code.expires_at IS NOT NULL AND v_code.expires_at <= now() THEN RETURN; END IF;
  IF v_code.restricted_to_user_id IS NOT NULL
     AND v_code.restricted_to_user_id IS DISTINCT FROM p_user_id THEN
    RETURN;
  END IF;
  IF v_code.max_redemptions IS NOT NULL
     AND v_code.redeemed_count >= v_code.max_redemptions THEN
    RETURN;
  END IF;

  -- Per-user cap: count confirmed redemptions for this user/email.
  IF v_code.per_user_max_redemptions IS NOT NULL THEN
    IF p_user_id IS NOT NULL THEN
      SELECT COUNT(*) INTO v_per_user_count
      FROM public.discount_redemptions
      WHERE code_id = p_code_id AND user_id = p_user_id;
    ELSIF p_guest_email IS NOT NULL THEN
      SELECT COUNT(*) INTO v_per_user_count
      FROM public.discount_redemptions
      WHERE code_id = p_code_id
        AND lower(guest_email) = lower(p_guest_email);
    ELSE
      -- No identity available — refuse rather than risk an end-run.
      RETURN;
    END IF;

    IF v_per_user_count >= v_code.per_user_max_redemptions THEN
      RETURN;
    END IF;
  END IF;

  UPDATE public.discount_codes
  SET redeemed_count = redeemed_count + 1
  WHERE id = p_code_id;

  RETURN QUERY
  SELECT * FROM public.discount_codes WHERE id = p_code_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.discount_release_reservation(p_code_id UUID)
RETURNS VOID
LANGUAGE sql
AS $$
  UPDATE public.discount_codes
  SET redeemed_count = GREATEST(redeemed_count - 1, 0)
  WHERE id = p_code_id;
$$;

-- ============================================================
-- RLS
-- ============================================================
-- All discount reads/writes flow through the API under the service
-- role. No direct customer-side access to the table.

ALTER TABLE public.discount_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discount_redemptions ENABLE ROW LEVEL SECURITY;

-- No public policies — service role bypasses RLS.

COMMENT ON TABLE public.discount_codes IS
  'Customer-facing promo codes. Each row is one redeemable string. Use max_redemptions for "first N customers", per_user_max_redemptions for "once per user", restricted_to_user_id for VIP single-customer codes.';
COMMENT ON TABLE public.discount_redemptions IS
  'One row per CONFIRMED redemption (post payment-success). DB unique constraints enforce per-user-once and per-guest-email-once. The redeemed_count on discount_codes is a reservation counter (incremented at order creation, decremented on cancel); it''s not the same as count(*) of this table.';
COMMENT ON COLUMN public.orders.discount_code IS
  'Captured code string (denormalized). Stays intact even if the originating discount_codes row is later deleted.';
