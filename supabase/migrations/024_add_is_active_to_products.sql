-- Add is_active column to products for explicit admin enable/disable control.
-- This is separate from in_stock, which is derived from variant stock and used
-- as a stock-availability signal. is_active governs whether the product is
-- visible in the public store at all.

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_products_is_active ON public.products(is_active);
