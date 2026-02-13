-- Create categories table
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  image TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for slug lookup
CREATE INDEX IF NOT EXISTS idx_categories_slug ON public.categories(slug);
CREATE INDEX IF NOT EXISTS idx_categories_active ON public.categories(is_active);

-- Add category_id column to products table
ALTER TABLE public.products 
  ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL;

-- Create index for category_id
CREATE INDEX IF NOT EXISTS idx_products_category_id ON public.products(category_id);

-- Function to generate slug from name
CREATE OR REPLACE FUNCTION generate_category_slug(category_name TEXT)
RETURNS TEXT AS $$
DECLARE
  slug TEXT;
BEGIN
  -- Convert to lowercase, replace spaces with hyphens, remove special chars
  slug := lower(trim(category_name));
  slug := regexp_replace(slug, '[^a-z0-9]+', '-', 'g');
  slug := regexp_replace(slug, '^-+|-+$', '', 'g');
  
  -- Ensure uniqueness
  WHILE EXISTS (SELECT 1 FROM public.categories WHERE categories.slug = slug) LOOP
    slug := slug || '-' || floor(random() * 1000)::text;
  END LOOP;
  
  RETURN slug;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate slug for categories
CREATE OR REPLACE FUNCTION auto_generate_category_slug()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := generate_category_slug(NEW.name);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER category_slug_trigger
  BEFORE INSERT OR UPDATE ON public.categories
  FOR EACH ROW
  WHEN (NEW.slug IS NULL OR NEW.slug = '')
  EXECUTE FUNCTION auto_generate_category_slug();

-- Trigger to update updated_at for categories
CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON public.categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS on categories
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- Categories policies: Everyone can view active categories, only admins can manage
CREATE POLICY "Categories are viewable by everyone"
  ON public.categories FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can view all categories"
  ON public.categories FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Only admins can insert categories"
  ON public.categories FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Only admins can update categories"
  ON public.categories FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Only admins can delete categories"
  ON public.categories FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Insert default categories (migrate from existing product categories)
-- This will be run after existing categories are migrated
-- For now, we'll create some common peptide categories
INSERT INTO public.categories (name, slug, description, display_order) VALUES
  ('Repair & Recovery', 'repair-recovery', 'Peptides for tissue repair and recovery', 1),
  ('Growth Hormone', 'growth-hormone', 'Growth hormone releasing peptides', 2),
  ('Cognitive Enhancement', 'cognitive-enhancement', 'Peptides for brain health and cognitive function', 3),
  ('Anti-Aging', 'anti-aging', 'Peptides for anti-aging and longevity', 4),
  ('Immune Support', 'immune-support', 'Peptides for immune system support', 5),
  ('Weight Management', 'weight-management', 'Peptides for weight loss and metabolism', 6)
ON CONFLICT (name) DO NOTHING;
