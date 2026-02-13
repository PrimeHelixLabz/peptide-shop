-- Migrate existing category text to category_id
-- This script migrates products with existing category text to the new category_id system

-- First, create categories from existing product categories
INSERT INTO public.categories (name, slug, description, display_order)
SELECT DISTINCT
  category AS name,
  lower(regexp_replace(category, '[^a-z0-9]+', '-', 'g')) AS slug,
  NULL AS description,
  0 AS display_order
FROM public.products
WHERE category IS NOT NULL 
  AND category != ''
  AND NOT EXISTS (
    SELECT 1 FROM public.categories WHERE categories.name = products.category
  );

-- Update products to reference category_id
UPDATE public.products p
SET category_id = c.id
FROM public.categories c
WHERE p.category = c.name
  AND p.category_id IS NULL;

-- Note: We keep the old category column for now to allow rollback if needed
-- You can drop it later with: ALTER TABLE public.products DROP COLUMN category;
