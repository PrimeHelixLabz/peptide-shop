-- Cleanup unused product_variants fields
-- Removes color/size fields that are not needed by the application layer.

ALTER TABLE public.product_variants
  DROP COLUMN IF EXISTS color,
  DROP COLUMN IF EXISTS size;

