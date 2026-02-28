-- Add Certificate of Analysis (COA) image URL to products table
-- This allows products to have an optional COA image that can be displayed
-- on the product detail page in a dedicated COA tab.

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS coa_url TEXT;

-- Add comment to document the column
COMMENT ON COLUMN public.products.coa_url IS 'Optional URL to the Certificate of Analysis image for this product. When present, a COA tab will appear on the product detail page.';
