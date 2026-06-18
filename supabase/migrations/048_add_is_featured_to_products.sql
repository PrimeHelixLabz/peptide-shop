-- Add is_featured column to products for admin-controlled homepage feature slots.
-- The homepage "Featured Compounds" section shows up to 3 featured products
-- (ordered by name), backfilled with other active products if fewer than 3 are
-- flagged. This is independent of is_active/is_archived, which still govern
-- public visibility — a featured product that is archived/inactive simply drops
-- out of the storefront and is backfilled.

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS is_featured BOOLEAN NOT NULL DEFAULT false;

-- Partial index: the homepage query only ever filters for the small set of
-- featured rows, so index just those.
CREATE INDEX IF NOT EXISTS idx_products_is_featured
  ON public.products(is_featured)
  WHERE is_featured = true;
