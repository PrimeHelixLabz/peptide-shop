-- Add Stripe mapping columns for products and product_variants

-- Stripe product ID on products table
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS stripe_product_id TEXT;

CREATE INDEX IF NOT EXISTS idx_products_stripe_product_id
  ON public.products(stripe_product_id);

-- Stripe price ID on product_variants table
ALTER TABLE public.product_variants
ADD COLUMN IF NOT EXISTS stripe_price_id TEXT;

CREATE INDEX IF NOT EXISTS idx_product_variants_stripe_price_id
  ON public.product_variants(stripe_price_id);

