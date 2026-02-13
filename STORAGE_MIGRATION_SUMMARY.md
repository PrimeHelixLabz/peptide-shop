# Supabase Storage Migration Summary

## Overview
All product images have been migrated to use Supabase Storage instead of local/static images.

## Changes Made

### 1. New Storage Utilities

#### `lib/storage/supabase-storage.ts`
- `getStorageUrl(path)` - Converts storage paths to full Supabase Storage URLs
- `getStorageUrls(paths)` - Converts array of paths to URLs
- `extractStoragePath(url)` - Extracts path from full URL (for saving to DB)
- `isStorageUrl(url)` - Checks if URL is a Supabase Storage URL

#### `lib/storage/image-utils.ts`
- `getProductImageUrl(image, images)` - Gets primary product image URL
- `getProductImageUrls(image, images)` - Gets all product image URLs

### 2. Database Layer Updates

#### `lib/db/supabase.ts`
- **`rowToProduct()`**: Automatically converts storage paths to full URLs when reading from database
- **`productToRow()`**: Converts full URLs back to storage paths when saving to database
- This ensures the database stores clean paths (e.g., `product-bpc157.jpg`) while components receive full URLs

### 3. Upload API Updates

#### `app/api/upload/route.ts`
- Changed bucket from `"uploads"` to `"products"`
- Returns both full URL and storage path
- Files are stored directly in bucket root (not in subfolder)

### 4. Components Updated

All components now use Supabase Storage utilities:

- ✅ `components/product-card.tsx` - Uses `getProductImageUrl()`
- ✅ `components/product-detail.tsx` - Uses `getProductImageUrls()` for gallery
- ✅ `components/related-products.tsx` - Uses `getProductImageUrl()`
- ✅ `components/cart-item.tsx` - Uses `getProductImageUrl()`
- ✅ `components/search-modal.tsx` - Uses `getProductImageUrl()`
- ✅ `components/admin/admin-products-table.tsx` - Uses `getProductImageUrl()`

### 5. Database Migrations

#### `supabase/migrations/005_setup_storage.sql`
- Storage policies for public read access
- Authenticated user upload/update/delete policies
- Instructions for creating the `products` bucket

### 6. Seed Data

#### `supabase/seed_products_storage.sql`
- New seed file with Supabase Storage paths
- Uses relative paths (e.g., `product-bpc157.jpg`)
- Application automatically converts to full URLs

## How It Works

### Storage Path Format
- **In Database**: `product-bpc157.jpg` (relative path)
- **In Application**: `https://your-project.supabase.co/storage/v1/object/public/products/product-bpc157.jpg` (full URL)

### Automatic Conversion
1. **Reading from DB**: `rowToProduct()` converts paths → full URLs
2. **Saving to DB**: `productToRow()` converts full URLs → paths
3. **Components**: Always receive full URLs, ready to use

### Image Upload Flow
1. User uploads image via `/api/upload`
2. Image saved to Supabase Storage bucket `products`
3. API returns full URL and storage path
4. Admin saves storage path to database
5. Application converts path to URL when displaying

## Setup Instructions

See `README_STORAGE_SETUP.md` for detailed setup instructions.

### Quick Setup:
1. Create `products` bucket in Supabase Dashboard (public)
2. Run storage policies from `005_setup_storage.sql`
3. Upload product images to the bucket
4. Use `seed_products_storage.sql` for seed data

## Benefits

1. **Scalability**: Images stored in cloud storage, not in codebase
2. **Performance**: CDN delivery via Supabase Storage
3. **Flexibility**: Easy to update/replace images without code changes
4. **Cost-effective**: Supabase Storage is included in most plans
5. **Security**: Storage policies control access

## Backward Compatibility

- Components handle both full URLs and paths
- Existing local image paths will still work (but should be migrated)
- Database can store either format (paths recommended)

## Next Steps

1. Upload product images to Supabase Storage
2. Update existing products to use storage paths
3. Remove local image files from codebase (optional)
4. Test image uploads via admin panel
