-- ============================================================
-- Verification queries for affiliate commission migration 046
-- ============================================================
-- READ-ONLY. Run BEFORE applying 046 to preview the payout impact, and
-- AFTER applying to confirm the data is correct. Nothing here mutates data.

-- ------------------------------------------------------------
-- [BEFORE] Preview the impact on UNSETTLED commissions.
-- Shows, per pending/payable conversion, the old fee-inclusive amount vs the
-- new net-revenue amount and the delta. Run this before migrating so you know
-- exactly how much each affiliate's balance will move.
-- ------------------------------------------------------------
SELECT
  ac.id,
  ac.code,
  ac.status,
  o.subtotal,
  o.discount_amount,
  o.shipping,
  o.service_fee,
  o.total                                         AS order_total,
  ac.commission_rate,
  ac.commission_amount                            AS old_commission,            -- total * rate
  ROUND(GREATEST(o.subtotal - COALESCE(o.discount_amount, 0), 0)
        * ac.commission_rate, 2)                  AS new_commission,            -- net * rate
  ROUND(GREATEST(o.subtotal - COALESCE(o.discount_amount, 0), 0)
        * ac.commission_rate, 2) - ac.commission_amount AS delta
FROM public.affiliate_conversions ac
JOIN public.orders o ON o.id = ac.order_id
WHERE ac.status IN ('pending', 'payable')
ORDER BY delta;

-- [BEFORE] Same thing, summarized per affiliate: total balance change.
SELECT
  ac.affiliate_id,
  ac.code,
  COUNT(*)                                        AS unsettled_conversions,
  SUM(ac.commission_amount)                       AS old_total,
  SUM(ROUND(GREATEST(o.subtotal - COALESCE(o.discount_amount, 0), 0)
        * ac.commission_rate, 2))                 AS new_total,
  SUM(ROUND(GREATEST(o.subtotal - COALESCE(o.discount_amount, 0), 0)
        * ac.commission_rate, 2)) - SUM(ac.commission_amount) AS total_delta
FROM public.affiliate_conversions ac
JOIN public.orders o ON o.id = ac.order_id
WHERE ac.status IN ('pending', 'payable')
GROUP BY ac.affiliate_id, ac.code
ORDER BY total_delta;

-- ------------------------------------------------------------
-- [AFTER 046] Correctness checks. Each of these should return 0 rows.
-- ------------------------------------------------------------

-- 1. commission_base must equal net product revenue for every row.
SELECT ac.id, ac.commission_base,
       GREATEST(o.subtotal - COALESCE(o.discount_amount, 0), 0) AS expected_base
FROM public.affiliate_conversions ac
JOIN public.orders o ON o.id = ac.order_id
WHERE ac.commission_base
      <> GREATEST(o.subtotal - COALESCE(o.discount_amount, 0), 0);

-- 2. For UNSETTLED rows, commission_amount must equal base * rate.
--    (paid/reversed rows are intentionally left at their historical amount.)
SELECT id, commission_base, commission_rate, commission_amount,
       ROUND(commission_base * commission_rate, 2) AS expected_amount
FROM public.affiliate_conversions
WHERE status IN ('pending', 'payable')
  AND commission_amount <> ROUND(commission_base * commission_rate, 2);

-- 3. commission_base must never be NULL or negative (constraint backstop).
SELECT id, commission_base
FROM public.affiliate_conversions
WHERE commission_base IS NULL OR commission_base < 0;
