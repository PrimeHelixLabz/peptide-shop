-- Variant Images + Product Thumbnails Migration
-- Refactors image architecture to:
-- - products.thumbnail_url (single image for listing)
-- - product_variants (variants with independent images)
-- - variant_images (multiple images per variant, one primary, sortable)

-- 1) Add product thumbnail_url
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;

-- Backfill thumbnail_url from legacy fields (image -> first images[])
UPDATE public.products
SET thumbnail_url = COALESCE(
  NULLIF(thumbnail_url, ''),
  NULLIF(image, ''),
  CASE
    WHEN jsonb_typeof(images) = 'array' AND jsonb_array_length(images) > 0 THEN NULLIF(images->>0, '')
    ELSE NULL
  END
)
WHERE thumbnail_url IS NULL OR thumbnail_url = '';

-- 2) Extend product_variants to support the new variant model
ALTER TABLE public.product_variants
  ADD COLUMN IF NOT EXISTS sku TEXT,
  ADD COLUMN IF NOT EXISTS stock INTEGER,
  ADD COLUMN IF NOT EXISTS color TEXT,
  ADD COLUMN IF NOT EXISTS size TEXT,
  ADD COLUMN IF NOT EXISTS is_default BOOLEAN NOT NULL DEFAULT false;

-- Backfill sku/stock from legacy columns if present
UPDATE public.product_variants
SET sku = COALESCE(NULLIF(sku, ''), NULLIF(name, ''), id::text)
WHERE sku IS NULL OR sku = '';

UPDATE public.product_variants
SET stock = COALESCE(stock, stock_quantity, 0)
WHERE stock IS NULL;

-- Ensure each product has exactly one default variant (best-effort backfill)
WITH ranked AS (
  SELECT
    id,
    product_id,
    row_number() OVER (
      PARTITION BY product_id
      ORDER BY display_order ASC, created_at ASC
    ) AS rn
  FROM public.product_variants
),
products_without_default AS (
  SELECT pv.product_id
  FROM public.product_variants pv
  GROUP BY pv.product_id
  HAVING COALESCE(bool_or(pv.is_default), false) = false
)
UPDATE public.product_variants pv
SET is_default = true
FROM ranked r
WHERE pv.id = r.id
  AND r.rn = 1
  AND pv.product_id IN (SELECT product_id FROM products_without_default);

-- Enforce only one default variant per product
CREATE UNIQUE INDEX IF NOT EXISTS idx_product_variants_one_default_per_product
  ON public.product_variants(product_id)
  WHERE is_default = true;

-- 3) Create variant_images table
CREATE TABLE IF NOT EXISTS public.variant_images (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  variant_id UUID REFERENCES public.product_variants(id) ON DELETE CASCADE NOT NULL,
  image_url TEXT NOT NULL,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_variant_images_variant_id
  ON public.variant_images(variant_id);

CREATE INDEX IF NOT EXISTS idx_variant_images_variant_sort
  ON public.variant_images(variant_id, sort_order);

-- Enforce only one primary image per variant
CREATE UNIQUE INDEX IF NOT EXISTS idx_variant_images_one_primary_per_variant
  ON public.variant_images(variant_id)
  WHERE is_primary = true;

-- updated_at trigger
DROP TRIGGER IF EXISTS update_variant_images_updated_at ON public.variant_images;
CREATE TRIGGER update_variant_images_updated_at
  BEFORE UPDATE ON public.variant_images
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 4) Migrate legacy variant image fields into variant_images (best-effort)
-- Rules:
-- - If product_variants.image exists -> primary sort_order 0
-- - Else first element of product_variants.images -> primary sort_order 0
-- - Remaining images are inserted preserving their existing order
WITH pv AS (
  SELECT
    id AS variant_id,
    NULLIF(image, '') AS legacy_primary,
    CASE
      WHEN jsonb_typeof(images) = 'array' THEN images
      ELSE '[]'::jsonb
    END AS legacy_images
  FROM public.product_variants
),
arr AS (
  SELECT
    pv.variant_id,
    pv.legacy_primary,
    a.img,
    a.idx
  FROM pv
  CROSS JOIN LATERAL jsonb_array_elements_text(pv.legacy_images) WITH ORDINALITY AS a(img, idx)
),
to_insert AS (
  -- Primary image from legacy_primary
  SELECT
    variant_id,
    legacy_primary AS img,
    true AS is_primary,
    0 AS sort_order
  FROM pv
  WHERE legacy_primary IS NOT NULL

  UNION ALL

  -- Images from legacy_images array
  SELECT
    arr.variant_id,
    NULLIF(arr.img, '') AS img,
    CASE
      WHEN arr.legacy_primary IS NULL AND arr.idx = 1 THEN true
      ELSE false
    END AS is_primary,
    CASE
      WHEN arr.legacy_primary IS NULL THEN (arr.idx - 1)
      ELSE arr.idx
    END AS sort_order
  FROM arr
  WHERE NULLIF(arr.img, '') IS NOT NULL
    AND (arr.legacy_primary IS NULL OR arr.img <> arr.legacy_primary)
)
INSERT INTO public.variant_images (variant_id, image_url, is_primary, sort_order)
SELECT variant_id, img, is_primary, sort_order
FROM to_insert
WHERE img IS NOT NULL
ON CONFLICT DO NOTHING;

-- 5) RLS for variant_images
ALTER TABLE public.variant_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Variant images are viewable by everyone"
  ON public.variant_images FOR SELECT
  USING (true);

CREATE POLICY "Only admins can insert variant images"
  ON public.variant_images FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Only admins can update variant images"
  ON public.variant_images FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Only admins can delete variant images"
  ON public.variant_images FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

