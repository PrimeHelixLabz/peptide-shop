-- Ensure every product has at least one variant. Required because the
-- checkout flows are about to require variantId on every cart item.
--
-- Idempotent: only inserts a variant for products that have zero variants.
-- The created variant copies the product's current price/stock so existing
-- behaviour is preserved.

INSERT INTO public.product_variants (
  product_id,
  name,
  sku,
  price,
  stock,
  stock_quantity,
  in_stock,
  is_default,
  display_order
)
SELECT
  p.id,
  'Default'                                                  AS name,
  COALESCE(NULLIF(p.slug, ''), p.id::text)                   AS sku,
  -- price has CHECK (price > 0); fall back to a positive sentinel rather
  -- than failing the migration on a misconfigured product row.
  GREATEST(COALESCE(p.price, 0)::numeric, 0.01)              AS price,
  COALESCE(p.stock_quantity, 0)                              AS stock,
  COALESCE(p.stock_quantity, 0)                              AS stock_quantity,
  COALESCE(p.in_stock, true)                                 AS in_stock,
  true                                                        AS is_default,
  0                                                           AS display_order
FROM public.products p
WHERE NOT EXISTS (
  SELECT 1 FROM public.product_variants v WHERE v.product_id = p.id
);
