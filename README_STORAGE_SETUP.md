# Supabase Storage Setup for Product Images

This guide explains how to set up Supabase Storage for product images.

## Prerequisites

- Supabase project created
- Database migrations run (including `005_setup_storage.sql`)

## Step 1: Create Storage Bucket

1. Go to your Supabase Dashboard
2. Navigate to **Storage** in the left sidebar
3. Click **Create Bucket**
4. Configure the bucket:
   - **Name**: `products`
   - **Public**: ✅ Yes (for public image access)
   - **File size limit**: 5MB (or as needed)
   - **Allowed MIME types**: `image/jpeg`, `image/png`, `image/webp`

## Step 2: Set Up Storage Policies

Run the SQL from `supabase/migrations/005_setup_storage.sql` in your Supabase SQL Editor:

```sql
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

-- Allow authenticated users to update product images
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
```

## Step 3: Upload Product Images

### Option A: Via Supabase Dashboard

1. Go to **Storage** > **products** bucket
2. Click **Upload file**
3. Upload your product images:
   - `product-bpc157.jpg`
   - `product-tb500.jpg`
   - `product-ghkcu.jpg`
   - `product-ipamorelin.jpg`
   - `product-cjc1295.jpg`
   - `product-ll37.jpg`

### Option B: Via Admin Panel

1. Log in as admin
2. Go to **Admin** > **Products** > **New Product**
3. Use the image upload feature in the product form

## Step 4: Update Seed Data

After uploading images, you can either:

1. **Use the new seed file** (`supabase/seed_products_storage.sql`) which uses relative paths
2. **Update existing products** to use Supabase Storage paths

The application will automatically convert storage paths to full URLs using the `getStorageUrl()` utility.

## Image Path Format

### In Database
Store relative paths in the database:
- `product-bpc157.jpg` (recommended)
- Or full URLs: `https://your-project.supabase.co/storage/v1/object/public/products/product-bpc157.jpg`

### Automatic Conversion
The application automatically converts paths to full Supabase Storage URLs:
- Path: `product-bpc157.jpg`
- Becomes: `https://your-project.supabase.co/storage/v1/object/public/products/product-bpc157.jpg`

## API Endpoint

The upload API endpoint (`/api/upload`) handles image uploads:

- **Method**: POST
- **Authentication**: Required (authenticated users)
- **Content-Type**: multipart/form-data
- **Field name**: `file`
- **Max size**: 5MB
- **Allowed types**: JPEG, PNG, WebP

### Example Upload

```typescript
const formData = new FormData()
formData.append('file', file)

const response = await fetch('/api/upload', {
  method: 'POST',
  body: formData,
})

const { url, filename, path } = await response.json()
// url: Full public URL
// filename: Generated filename
// path: Storage path (use this in database)
```

## Components Updated

All components now use Supabase Storage:

- ✅ `components/product-card.tsx`
- ✅ `components/product-detail.tsx`
- ✅ `components/related-products.tsx`
- ✅ `components/cart-item.tsx`
- ✅ `components/search-modal.tsx`
- ✅ `components/admin/admin-products-table.tsx`

## Utilities

### `lib/storage/supabase-storage.ts`
- `getStorageUrl(path)` - Convert path to full Supabase Storage URL
- `getStorageUrls(paths)` - Convert array of paths to URLs
- `extractStoragePath(url)` - Extract path from full URL
- `isStorageUrl(url)` - Check if URL is a Supabase Storage URL

### `lib/storage/image-utils.ts`
- `getProductImageUrl(image, images)` - Get primary product image URL
- `getProductImageUrls(image, images)` - Get all product image URLs

## Migration from Local Images

If you have existing products with local image paths:

1. Upload images to Supabase Storage
2. Update product records in database:
   ```sql
   UPDATE products 
   SET image = 'product-bpc157.jpg',
       images = '["product-bpc157.jpg"]'::jsonb
   WHERE slug = 'bpc-157';
   ```

The application will automatically handle the conversion to full URLs.

## Troubleshooting

### Images not loading
1. Check bucket is public
2. Verify storage policies are set correctly
3. Check image paths in database match uploaded files
4. Verify `NEXT_PUBLIC_SUPABASE_URL` is set correctly

### Upload fails
1. Check file size (max 5MB)
2. Verify file type (JPEG, PNG, WebP only)
3. Check user is authenticated
4. Verify storage policies allow uploads

### CORS issues
Supabase Storage handles CORS automatically for public buckets. If you encounter issues, check:
1. Bucket is set to public
2. Storage policies allow public read access
