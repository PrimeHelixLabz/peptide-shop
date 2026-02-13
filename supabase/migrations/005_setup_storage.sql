-- Setup Supabase Storage for Product Images
-- This migration creates the storage bucket and sets up policies

-- Create storage bucket for products (if it doesn't exist)
-- Note: Buckets must be created via Supabase Dashboard or Storage API
-- This is a reference migration - run the SQL commands in Supabase Dashboard

-- 1. Create bucket via Supabase Dashboard:
--    - Go to Storage > Create Bucket
--    - Name: "products"
--    - Public: true (for public image access)
--    - File size limit: 5MB (or as needed)
--    - Allowed MIME types: image/jpeg, image/png, image/webp

-- 2. Set up Storage Policies (run these in SQL Editor):

-- Allow public read access to product images
CREATE POLICY "Public product images are viewable by everyone"
ON storage.objects FOR SELECT
USING (bucket_id = 'products');

-- Allow authenticated users to upload product images
CREATE POLICY "Authenticated users can upload product images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'products' 
  AND auth.role() = 'authenticated'
);

-- Allow authenticated users to update their uploaded images
CREATE POLICY "Authenticated users can update product images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'products' 
  AND auth.role() = 'authenticated'
);

-- Allow authenticated users to delete product images
CREATE POLICY "Authenticated users can delete product images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'products' 
  AND auth.role() = 'authenticated'
);

-- Note: For admin-only uploads, you can add additional checks:
-- AND EXISTS (
--   SELECT 1 FROM public.profiles 
--   WHERE id = auth.uid() AND role = 'admin'
-- )
