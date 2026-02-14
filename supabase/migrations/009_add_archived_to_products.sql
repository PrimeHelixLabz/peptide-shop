-- Add is_archived field to products table
-- This allows soft-deleting products while keeping order history intact

ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false NOT NULL;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_products_is_archived ON public.products(is_archived);

-- Update existing products to ensure they're not archived
UPDATE public.products 
SET is_archived = false 
WHERE is_archived IS NULL;
