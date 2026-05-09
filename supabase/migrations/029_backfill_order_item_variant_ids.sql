-- Backfill missing variantId/variantName on order items.
--
-- Older orders (created before variants were required) have items in their
-- `items` JSONB that lack variantId/variantName. The new inventory RPCs
-- (decrement_inventory_for_order, restore_inventory_for_order from
-- migration 028) skip items without a variantId, so any
-- refund/restore/admin-paid flow on those legacy orders would silently
-- fail to touch stock.
--
-- Resolution: for every item missing variantId, look up the product's
-- default variant and inject {variantId, variantName} into the item.
-- Each product currently has exactly one variant (which IS the default),
-- so the mapping is unambiguous.
--
-- Idempotent: items that already have a variantId are left untouched.
-- Items whose product has no default variant (defensive — should not
-- happen in this DB) are also left untouched, so the migration is safe
-- to re-run if needed.
--
-- productName is intentionally NOT updated. It records what the customer
-- saw at purchase time and rewriting it post-hoc would misrepresent the
-- historical record. Only the administrative identification fields
-- (variantId, variantName) are filled in.

UPDATE orders o
SET items = (
  SELECT jsonb_agg(
    CASE
      WHEN (t.item->>'variantId') IS NOT NULL
       AND (t.item->>'variantId') <> ''
      THEN t.item
      ELSE t.item || COALESCE(
        (
          SELECT jsonb_build_object(
            'variantId',   dv.id::text,
            'variantName', dv.sku
          )
          FROM product_variants dv
          WHERE dv.product_id = NULLIF(t.item->>'productId', '')::uuid
            AND dv.is_default = true
          LIMIT 1
        ),
        '{}'::jsonb
      )
    END
    ORDER BY t.ord
  )
  FROM jsonb_array_elements(o.items) WITH ORDINALITY AS t(item, ord)
)
WHERE jsonb_typeof(o.items) = 'array'
  AND EXISTS (
    SELECT 1 FROM jsonb_array_elements(o.items) AS item
    WHERE (item->>'variantId') IS NULL OR (item->>'variantId') = ''
  );
