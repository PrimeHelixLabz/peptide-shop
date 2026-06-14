-- ============================================================
-- Migration: backfill CentryOS service_fee onto paid orders
-- ============================================================
-- CentryOS surcharges the customer on top of our order amount and reports
-- it on the COLLECTION webhook as payload.feeCharged (a STRING, e.g. "2.41").
-- Until now the webhook ignored it, so paid CentryOS orders were stored with
-- service_fee = 0 and a total that understated what the customer actually
-- paid. The webhook handler now records the fee going forward; this migration
-- repairs historical paid orders from the raw webhook logs.
--
-- Idempotent: total is RECOMPUTED from the immutable base columns
-- (subtotal - discount_amount + shipping + fee), never incremented, so
-- re-running this migration produces the same result.

WITH fee_per_order AS (
  -- One fee per order: the latest SUCCESS COLLECTION webhook that carried a
  -- numeric feeCharged. (Re)deliveries report the same fee, so DISTINCT ON
  -- the most recent is safe.
  SELECT DISTINCT ON (l.order_id)
    l.order_id,
    (l.body -> 'payload' ->> 'feeCharged')::numeric AS fee
  FROM centryos_webhook_logs l
  WHERE l.order_id IS NOT NULL
    AND l.signature_valid = true
    AND upper(l.event_type) = 'COLLECTION'
    AND upper(l.status) = 'SUCCESS'
    AND l.body -> 'payload' ->> 'feeCharged' ~ '^[0-9]+(\.[0-9]+)?$'
  ORDER BY l.order_id, l.received_at DESC
)
UPDATE orders o
SET
  service_fee = f.fee,
  total = round(
    o.subtotal - COALESCE(o.discount_amount, 0) + o.shipping + f.fee,
    2
  ),
  updated_at = now()
FROM fee_per_order f
WHERE o.id::text = f.order_id
  AND o.payment_method = 'centryos'
  AND o.payment_status = 'paid'
  AND f.fee > 0
  -- Only touch rows that aren't already correct, so re-runs are no-ops.
  AND (
    o.service_fee IS DISTINCT FROM f.fee
    OR o.total IS DISTINCT FROM round(
      o.subtotal - COALESCE(o.discount_amount, 0) + o.shipping + f.fee,
      2
    )
  );
