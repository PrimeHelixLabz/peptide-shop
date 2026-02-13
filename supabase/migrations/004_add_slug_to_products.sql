-- Add slug column to products table
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;

-- Create index on slug for faster lookups
CREATE INDEX IF NOT EXISTS idx_products_slug ON public.products(slug);

-- Function to generate slug from product name
CREATE OR REPLACE FUNCTION generate_slug(input_text TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN lower(
    regexp_replace(
      regexp_replace(
        trim(input_text),
        '[^a-zA-Z0-9\s-]', '', 'g'  -- Remove special characters
      ),
      '\s+', '-', 'g'  -- Replace spaces with hyphens
    )
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to ensure unique slug
CREATE OR REPLACE FUNCTION ensure_unique_slug(base_slug TEXT, product_id UUID DEFAULT NULL)
RETURNS TEXT AS $$
DECLARE
  final_slug TEXT;
  counter INTEGER := 0;
BEGIN
  final_slug := base_slug;
  
  -- Check if slug exists (excluding current product if updating)
  WHILE EXISTS (
    SELECT 1 FROM public.products 
    WHERE slug = final_slug 
    AND (product_id IS NULL OR id != product_id)
  ) LOOP
    counter := counter + 1;
    final_slug := base_slug || '-' || counter;
  END LOOP;
  
  RETURN final_slug;
END;
$$ LANGUAGE plpgsql;

-- Trigger function to auto-generate slug on insert/update
CREATE OR REPLACE FUNCTION auto_generate_product_slug()
RETURNS TRIGGER AS $$
BEGIN
  -- Only generate slug if it's not already set
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := ensure_unique_slug(generate_slug(NEW.name));
  ELSE
    -- If slug is manually set, ensure it's unique
    NEW.slug := ensure_unique_slug(NEW.slug, NEW.id);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_auto_generate_slug ON public.products;
CREATE TRIGGER trigger_auto_generate_slug
  BEFORE INSERT OR UPDATE OF name, slug ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION auto_generate_product_slug();

-- Update existing products to have slugs (if any exist)
UPDATE public.products
SET slug = ensure_unique_slug(generate_slug(name))
WHERE slug IS NULL OR slug = '';
