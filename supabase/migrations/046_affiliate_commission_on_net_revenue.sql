-- ============================================================
-- Migration: affiliate commission on NET PRODUCT REVENUE
-- ============================================================
-- Previously commission was computed as `orders.total * rate`, where
-- `total = subtotal - discount + shipping + service_fee`. That paid
-- affiliates commission on shipping AND on processor/CentryOS service
-- fees — money the business never keeps as product revenue.
--
-- This migration switches the commission base to NET PRODUCT REVENUE:
--
--     commission_base   = max(subtotal - discount_amount, 0)
--     commission_amount = round(commission_base * commission_rate, 2)
--
-- `order_total` keeps storing the order's grand total (informational /
-- display). A new `commission_base` column records exactly what each
-- commission was computed from, so the math is self-documenting and the
-- relationship `commission_amount = commission_base * rate` always holds.
--
-- Data migration (per product decision):
--   * commission_base is backfilled for ALL existing rows.
--   * commission_amount is RECOMPUTED only for unsettled rows
--     (status pending/payable). Already paid/reversed rows are left
--     untouched — that money is settled and rewriting it would create
--     payout discrepancies.

-- ------------------------------------------------------------
-- 1. New column to record the commission base (net product revenue)
-- ------------------------------------------------------------
ALTER TABLE public.affiliate_conversions
  ADD COLUMN IF NOT EXISTS commission_base NUMERIC(10,2)
    CHECK (commission_base IS NULL OR commission_base >= 0);

-- ------------------------------------------------------------
-- 2. Backfill commission_base for every existing conversion from the
--    immutable order base fields. order_id is a FK (ON DELETE CASCADE),
--    so every conversion has a matching order — no orphans to worry about.
-- ------------------------------------------------------------
UPDATE public.affiliate_conversions ac
SET commission_base = GREATEST(o.subtotal - COALESCE(o.discount_amount, 0), 0)
FROM public.orders o
WHERE o.id = ac.order_id;

-- order_id is a NOT NULL FK to orders, so the UPDATE above touches every row.
-- If a base is somehow still NULL here, that's a real data anomaly — let the
-- SET NOT NULL below fail loudly rather than papering over it.
ALTER TABLE public.affiliate_conversions
  ALTER COLUMN commission_base SET NOT NULL;

-- ------------------------------------------------------------
-- 3. Recompute commission_amount for UNSETTLED rows only.
--    paid/reversed rows keep their historical (fee-inclusive) amount.
-- ------------------------------------------------------------
UPDATE public.affiliate_conversions
SET commission_amount = ROUND(commission_base * commission_rate, 2)
WHERE status IN ('pending', 'payable');

-- ------------------------------------------------------------
-- 4. Replace the conversion-creating triggers so NEW conversions use
--    net product revenue as the base. order_total still stores the grand
--    total; commission_base + commission_amount use the net figure.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION create_affiliate_conversion_on_paid()
RETURNS TRIGGER AS $$
DECLARE
  v_affiliate_id UUID;
  v_rate NUMERIC(4,3);
  v_base NUMERIC(10,2);
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

  -- Net product revenue: subtotal minus discount, never below zero.
  -- Shipping and service/CentryOS fees are intentionally excluded.
  v_base := GREATEST(NEW.subtotal - COALESCE(NEW.discount_amount, 0), 0);

  INSERT INTO public.affiliate_conversions (
    affiliate_id, code, order_id, order_total, commission_base,
    commission_rate, commission_amount, status
  )
  VALUES (
    v_affiliate_id,
    NEW.affiliate_code,
    NEW.id,
    NEW.total,
    v_base,
    v_rate,
    ROUND(v_base * v_rate, 2),
    'pending'
  )
  ON CONFLICT (order_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION create_affiliate_conversion_on_insert_paid()
RETURNS TRIGGER AS $$
DECLARE
  v_affiliate_id UUID;
  v_rate NUMERIC(4,3);
  v_base NUMERIC(10,2);
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

  -- Net product revenue: subtotal minus discount, never below zero.
  v_base := GREATEST(NEW.subtotal - COALESCE(NEW.discount_amount, 0), 0);

  INSERT INTO public.affiliate_conversions (
    affiliate_id, code, order_id, order_total, commission_base,
    commission_rate, commission_amount, status
  )
  VALUES (
    v_affiliate_id,
    NEW.affiliate_code,
    NEW.id,
    NEW.total,
    v_base,
    v_rate,
    ROUND(v_base * v_rate, 2),
    'pending'
  )
  ON CONFLICT (order_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
