# Supabase Storage Directory Structure

## Overview
Product images are now organized in directories by product UUID for better organization and management.

## Directory Structure

```
products/
  {product-uuid-1}/
    product-image-1.jpg
    product-image-2.jpg
  {product-uuid-2}/
    product-image-1.jpg
  temp/
    (temporary uploads before product creation)
```

## Image Path Format

### In Database
Store paths in format: `{product-uuid}/{filename}`
- Example: `a1b2c3d4-e5f6-7890-abcd-ef1234567890/product-bpc157.jpg`

### Full URL
Application converts to: `https://your-project.supabase.co/storage/v1/object/public/products/{product-uuid}/{filename}`

## Upload Flow

### For New Products
1. Admin uploads image → stored in `temp/` directory
2. Product created → UUID generated
3. Image moved from `temp/` to `{product-uuid}/` directory
4. Database updated with correct path

### For Existing Products
1. Admin uploads image with `productId` parameter
2. Image stored directly in `{product-uuid}/` directory
3. Database updated with new path

## API Usage

### Upload Image (New Product)
```typescript
const formData = new FormData()
formData.append('file', file)
// No productId - will be stored in temp/

const response = await fetch('/api/upload', {
  method: 'POST',
  body: formData,
})

const { url, path } = await response.json()
// path: "temp/1234567890-abcdef.jpg"
```

### Upload Image (Existing Product)
```typescript
const formData = new FormData()
formData.append('file', file)
formData.append('productId', productId) // UUID of product

const response = await fetch('/api/upload', {
  method: 'POST',
  body: formData,
})

const { url, path } = await response.json()
// path: "{product-uuid}/1234567890-abcdef.jpg"
```

### Move Image from Temp to Product Directory
```typescript
// After product creation
const response = await fetch('/api/upload/move', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    sourcePath: 'temp/1234567890-abcdef.jpg',
    productId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
  })
})

const { url, path } = await response.json()
// path: "{product-uuid}/1234567890-abcdef.jpg"
```

## Product Deletion

When a product is deleted:
1. Product record removed from database
2. All images in `{product-uuid}/` directory are automatically deleted
3. Directory is cleaned up

## Seed Data

### Initial Setup
1. Create products using `seed_products_storage.sql` (images in `temp/`)
2. Get product UUIDs from database
3. Upload images to `products/{uuid}/` directories in Supabase Storage
4. Run `update_product_images.sql` to update database paths

### Alternative: Manual Upload
1. Create products first (get UUIDs)
2. Upload images directly to `products/{uuid}/` directories
3. Update database with correct paths

## Benefits

1. **Organization**: Each product's images are grouped together
2. **Cleanup**: Easy to delete all images when product is deleted
3. **Scalability**: No flat file structure that becomes unmanageable
4. **Isolation**: Product images don't conflict with each other
5. **Management**: Easy to see which images belong to which product

## Migration from Flat Structure

If you have existing products with flat image paths:

```sql
-- Update all products to use UUID directories
UPDATE public.products
SET 
  image = id || '/' || substring(image from '[^/]+$'),
  images = (
    SELECT jsonb_agg(id || '/' || substring(value::text from '[^/]+$'))
    FROM jsonb_array_elements(images)
  )
WHERE image NOT LIKE id || '/%';
```

Then move images in Supabase Storage:
1. For each product, create directory `{product-uuid}/`
2. Move image files from root to `{product-uuid}/` directory
