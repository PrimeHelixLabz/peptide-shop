-- Product Variants Migration
-- This migration adds support for product variants (e.g., different strengths like 10mg, 20mg, 60mg)

-- Create product_variants table
CREATE TABLE IF NOT EXISTS public.product_variants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL, -- e.g., "10mg", "20mg", "60mg"
  price DECIMAL(10, 2) NOT NULL CHECK (price > 0),
  stock_quantity INTEGER DEFAULT 0 CHECK (stock_quantity >= 0),
  in_stock BOOLEAN DEFAULT true,
  image TEXT, -- Optional variant-specific image
  images JSONB DEFAULT '[]'::jsonb, -- Optional variant-specific images array
  display_order INTEGER DEFAULT 0, -- Order for displaying variants
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(product_id, name) -- Ensure unique variant names per product
);

-- Add variant_id to cart_items (nullable for backward compatibility)
ALTER TABLE public.cart_items 
  ADD COLUMN IF NOT EXISTS variant_id UUID REFERENCES public.product_variants(id) ON DELETE CASCADE;

-- Update cart_items unique constraint to include variant_id
-- First, drop the old unique constraint if it exists
ALTER TABLE public.cart_items 
  DROP CONSTRAINT IF EXISTS cart_items_user_id_product_id_key;

-- Add new unique constraint that includes variant_id
-- This allows same product with different variants in cart
CREATE UNIQUE INDEX IF NOT EXISTS cart_items_user_product_variant_unique 
  ON public.cart_items(user_id, product_id, COALESCE(variant_id, '00000000-0000-0000-0000-000000000000'::uuid));

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_product_variants_product_id ON public.product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_product_variants_in_stock ON public.product_variants(in_stock);
CREATE INDEX IF NOT EXISTS idx_cart_items_variant_id ON public.cart_items(variant_id);

-- Trigger to automatically update updated_at for variants
CREATE TRIGGER update_product_variants_updated_at BEFORE UPDATE ON public.product_variants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) Policies for product_variants

-- Enable RLS on product_variants table
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;

-- Product variants policies
CREATE POLICY "Product variants are viewable by everyone"
  ON public.product_variants FOR SELECT
  USING (true);

CREATE POLICY "Only admins can insert product variants"
  ON public.product_variants FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Only admins can update product variants"
  ON public.product_variants FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Only admins can delete product variants"
  ON public.product_variants FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
