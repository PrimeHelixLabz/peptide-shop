-- Atomic inventory adjustment + webhook-retry idempotency.
--
-- Two safety nets in one migration:
--
-- 1. orders.inventory_adjusted_at — idempotency token. The first attempt to
--    decrement an order's inventory atomically claims this column; later
--    attempts (e.g. webhook redeliveries, retried admin actions) see it set
--    and skip. Without this, a Stripe/Link Money retry that lands after the
--    original webhook can decrement the same stock a second time.
--
-- 2. decrement_inventory_for_order() / restore_inventory_for_order() —
--    server-side functions that perform check + decrement (or increment)
--    inside a single Postgres transaction with FOR UPDATE locks. Replaces
--    the prior application-side read-modify-write loop, which allowed two
--    concurrent orders for the last unit to both succeed (oversell).

-- ---------------------------------------------------------------------------
-- 1. Idempotency column
-- ---------------------------------------------------------------------------

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS inventory_adjusted_at TIMESTAMPTZ;

-- Backfill: any order that has visibly progressed past "pending" was
-- already decremented by the legacy code path. Mark it adjusted so the
-- first run of the new code on those orders is a no-op (instead of
-- accidentally double-decrementing on the next webhook retry).
UPDATE orders
SET inventory_adjusted_at = COALESCE(updated_at, created_at)
WHERE inventory_adjusted_at IS NULL
  AND (
    payment_status IN ('paid', 'authorized', 'processing', 'refunded')
    OR status IN ('processing', 'shipped', 'delivered')
  );

-- ---------------------------------------------------------------------------
-- 2. Atomic decrement function
-- ---------------------------------------------------------------------------
-- Returns:
--   { ok: true }                              -> claim acquired and decrement applied
--   { ok: true, already_adjusted: true }      -> redelivery / retry; no-op
--   { ok: false, shortfalls: [...] }          -> insufficient stock or missing variant;
--                                                claim is released so caller can retry
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION decrement_inventory_for_order(
  p_order_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_items       JSONB;
  v_item        JSONB;
  v_variant_id  UUID;
  v_quantity    INT;
  v_available   INT;
  v_shortfalls  JSONB := '[]'::JSONB;
BEGIN
  -- Atomically claim the order. Only the first caller proceeds; concurrent
  -- callers (webhook retry, admin action while webhook is in flight, etc.)
  -- get NULL back and return early with already_adjusted=true.
  UPDATE orders
  SET inventory_adjusted_at = now()
  WHERE id = p_order_id
    AND inventory_adjusted_at IS NULL
  RETURNING items INTO v_items;

  IF v_items IS NULL THEN
    RETURN jsonb_build_object('ok', true, 'already_adjusted', true);
  END IF;

  -- Phase 1: lock every variant row first and check availability.
  -- Two passes guarantee that if ANY item is short, we decrement NONE.
  FOR v_item IN SELECT jsonb_array_elements(v_items) LOOP
    v_variant_id := NULLIF(v_item->>'variantId', '')::UUID;
    v_quantity   := COALESCE((v_item->>'quantity')::INT, 0);

    IF v_variant_id IS NULL OR v_quantity <= 0 THEN
      CONTINUE;
    END IF;

    SELECT stock INTO v_available
    FROM product_variants
    WHERE id = v_variant_id
    FOR UPDATE;

    IF v_available IS NULL THEN
      v_shortfalls := v_shortfalls || jsonb_build_object(
        'variantId', v_variant_id,
        'requested', v_quantity,
        'available', 0,
        'reason', 'variant_not_found'
      );
    ELSIF v_available < v_quantity THEN
      v_shortfalls := v_shortfalls || jsonb_build_object(
        'variantId', v_variant_id,
        'requested', v_quantity,
        'available', v_available,
        'reason', 'insufficient_stock'
      );
    END IF;
  END LOOP;

  IF jsonb_array_length(v_shortfalls) > 0 THEN
    -- Release the claim so the caller (or a future retry) can try again
    -- once stock is restored. The caller is expected to roll back the
    -- order or surface a "no longer in stock" error to the user.
    UPDATE orders SET inventory_adjusted_at = NULL WHERE id = p_order_id;
    RETURN jsonb_build_object('ok', false, 'shortfalls', v_shortfalls);
  END IF;

  -- Phase 2: decrement (locks held from phase 1 keep this safe).
  FOR v_item IN SELECT jsonb_array_elements(v_items) LOOP
    v_variant_id := NULLIF(v_item->>'variantId', '')::UUID;
    v_quantity   := COALESCE((v_item->>'quantity')::INT, 0);

    IF v_variant_id IS NULL OR v_quantity <= 0 THEN
      CONTINUE;
    END IF;

    UPDATE product_variants
    SET stock      = stock - v_quantity,
        in_stock   = (stock - v_quantity) > 0,
        updated_at = now()
    WHERE id = v_variant_id;
  END LOOP;

  RETURN jsonb_build_object('ok', true);
END;
$$;

-- ---------------------------------------------------------------------------
-- 3. Atomic restore function (used on payment reversal / refund)
-- ---------------------------------------------------------------------------
-- Always increments stock for each item that has a variantId. Clears
-- inventory_adjusted_at so a subsequent re-payment can claim and decrement
-- again. No-op if the order was never adjusted.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION restore_inventory_for_order(
  p_order_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_items        JSONB;
  v_was_adjusted TIMESTAMPTZ;
  v_item         JSONB;
  v_variant_id   UUID;
  v_quantity     INT;
BEGIN
  SELECT items, inventory_adjusted_at
  INTO v_items, v_was_adjusted
  FROM orders
  WHERE id = p_order_id;

  IF v_items IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'order_not_found');
  END IF;

  IF v_was_adjusted IS NULL THEN
    RETURN jsonb_build_object('ok', true, 'no_op', true);
  END IF;

  FOR v_item IN SELECT jsonb_array_elements(v_items) LOOP
    v_variant_id := NULLIF(v_item->>'variantId', '')::UUID;
    v_quantity   := COALESCE((v_item->>'quantity')::INT, 0);

    IF v_variant_id IS NULL OR v_quantity <= 0 THEN
      CONTINUE;
    END IF;

    UPDATE product_variants
    SET stock      = stock + v_quantity,
        in_stock   = true,
        updated_at = now()
    WHERE id = v_variant_id;
  END LOOP;

  UPDATE orders SET inventory_adjusted_at = NULL WHERE id = p_order_id;

  RETURN jsonb_build_object('ok', true);
END;
$$;
