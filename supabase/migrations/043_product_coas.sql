-- Multi-COA per product
--
-- Replaces the single products.coa_url column (added in migration 015) with a
-- product_coas table so admins can list multiple Certificates of Analysis per
-- product. Driver: vendors keep older batches in stock while newer batches
-- arrive with their own COA — customers need to see all of them.
--
-- Modeled after variant_images (migration 011): one product → many rows,
-- ordered by sort_order. Optional label captions each COA (e.g. "Batch
-- 2024-11", "Original batch") so customers can match a vial to its COA.

CREATE TABLE IF NOT EXISTS public.product_coas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  image_url TEXT NOT NULL,
  label TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_product_coas_product_id
  ON public.product_coas(product_id);

CREATE INDEX IF NOT EXISTS idx_product_coas_product_sort
  ON public.product_coas(product_id, sort_order);

DROP TRIGGER IF EXISTS update_product_coas_updated_at ON public.product_coas;
CREATE TRIGGER update_product_coas_updated_at
  BEFORE UPDATE ON public.product_coas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Backfill: copy each existing products.coa_url into product_coas as a single
-- row per product. NULL/empty values are skipped.
INSERT INTO public.product_coas (product_id, image_url, sort_order)
SELECT id, coa_url, 0
FROM public.products
WHERE coa_url IS NOT NULL AND coa_url <> '';

-- Drop the legacy column. All app code is updated in the same change set.
ALTER TABLE public.products
  DROP COLUMN IF EXISTS coa_url;

-- RLS: public read (storefront needs it), admin-only writes (matches
-- variant_images policy in migration 011).
ALTER TABLE public.product_coas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Product COAs are viewable by everyone"
  ON public.product_coas FOR SELECT
  USING (true);

CREATE POLICY "Only admins can insert product COAs"
  ON public.product_coas FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Only admins can update product COAs"
  ON public.product_coas FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Only admins can delete product COAs"
  ON public.product_coas FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
