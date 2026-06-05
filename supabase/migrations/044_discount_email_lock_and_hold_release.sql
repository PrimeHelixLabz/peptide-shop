-- ============================================================
-- Migration: discount email-lock
-- ============================================================
-- "Lock to customer" used the account UUID (restricted_to_user_id),
-- which only matched when that exact account was signed in. Admins think
-- of it as locking to an *email*. We add restricted_to_email and match on
-- that (case-insensitive), falling back to the legacy user-id lock for any
-- code created before this migration.
--
-- The reservation counter (redeemed_count) stays as-is: it locks a code at
-- checkout-start so it can't be reused concurrently before a payment
-- settles. Releasing an abandoned hold is handled WITHOUT a timer — see the
-- note at the bottom of this file — so a slow/in-flight payment is never at
-- risk of being cancelled.

-- ── Email lock column ──────────────────────────────────────────────
ALTER TABLE public.discount_codes
  ADD COLUMN IF NOT EXISTS restricted_to_email TEXT;

-- Backfill from the existing account lock so live VIP codes keep working.
UPDATE public.discount_codes c
SET restricted_to_email = lower(p.email)
FROM public.profiles p
WHERE c.restricted_to_user_id = p.id
  AND c.restricted_to_email IS NULL
  AND p.email IS NOT NULL;

-- ── Reservation RPC: add email-lock check ──────────────────────────
-- Signature changes (new p_actor_email arg), so drop the old one first.
DROP FUNCTION IF EXISTS public.discount_reserve_redemption(UUID, UUID, TEXT);

CREATE OR REPLACE FUNCTION public.discount_reserve_redemption(
  p_code_id UUID,
  p_user_id UUID DEFAULT NULL,
  p_guest_email TEXT DEFAULT NULL,
  p_actor_email TEXT DEFAULT NULL
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

  -- Customer lock: prefer the email lock; fall back to the legacy
  -- account-id lock for codes created before email locking existed.
  IF v_code.restricted_to_email IS NOT NULL THEN
    IF p_actor_email IS NULL
       OR lower(p_actor_email) IS DISTINCT FROM lower(v_code.restricted_to_email) THEN
      RETURN;
    END IF;
  ELSIF v_code.restricted_to_user_id IS NOT NULL
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

-- ── Abandoned-hold release: handled WITHOUT a timer ────────────────
-- We deliberately do NOT auto-cancel pending discount orders on a clock.
-- A hosted/ACH checkout can sit "pending" legitimately while the customer
-- is still paying, and a timer can't tell that apart from an abandoned
-- one — cancelling it would risk killing a live payment.
--
-- Instead the reserved slot is released only on signals we can trust:
--   1. The provider reports failed/cancelled  → existing webhook/callback
--      flips the order terminal and the release trigger returns the slot.
--   2. The same customer starts checkout again → the app releases their
--      own never-authorized (pending+pending) hold before re-reserving
--      (see releaseActorStalePendingHolds in lib/discounts/checkout.ts).
--   3. The existing 3-day stale-pending cleanup as a final backstop.
-- This keeps the reservation (which blocks concurrent reuse of a code)
-- while never cancelling an in-flight payment.

COMMENT ON COLUMN public.discount_codes.restricted_to_email IS
  'When set, only a customer whose account/checkout email matches (case-insensitive) may redeem. Preferred over restricted_to_user_id, which is kept for legacy codes and admin display.';
