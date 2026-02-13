-- Update Product Images with UUID Directories
-- Run this AFTER products are created and images are uploaded to Supabase Storage
-- This script updates image paths to use product UUID directories

-- Format: {product-uuid}/{filename}
-- Example: a1b2c3d4-e5f6-7890-abcd-ef1234567890/product-bpc157.jpg

-- Update each product's image paths using their UUID
UPDATE public.products 
SET 
  image = id || '/product-bpc157.jpg',
  images = jsonb_build_array(id || '/product-bpc157.jpg')
WHERE slug = 'bpc-157';

UPDATE public.products 
SET 
  image = id || '/product-tb500.jpg',
  images = jsonb_build_array(id || '/product-tb500.jpg')
WHERE slug = 'tb-500';

UPDATE public.products 
SET 
  image = id || '/product-ghkcu.jpg',
  images = jsonb_build_array(id || '/product-ghkcu.jpg')
WHERE slug = 'ghk-cu';

UPDATE public.products 
SET 
  image = id || '/product-ipamorelin.jpg',
  images = jsonb_build_array(id || '/product-ipamorelin.jpg')
WHERE slug = 'ipamorelin';

UPDATE public.products 
SET 
  image = id || '/product-cjc1295.jpg',
  images = jsonb_build_array(id || '/product-cjc1295.jpg')
WHERE slug = 'cjc-1295';

UPDATE public.products 
SET 
  image = id || '/product-ll37.jpg',
  images = jsonb_build_array(id || '/product-ll37.jpg')
WHERE slug = 'll-37';

-- Verify the updates
SELECT id, name, slug, image, images FROM public.products ORDER BY created_at;

-- Instructions:
-- 1. Upload images to Supabase Storage in the format: products/{product-uuid}/{filename}
-- 2. Get product UUIDs from the SELECT query above
-- 3. Create directories in Storage: products/{uuid}/
-- 4. Upload images to those directories
-- 5. Run this script to update the database paths
