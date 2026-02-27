-- Improve product slug generation to handle more edge cases
-- including names with parentheses, slashes, and other punctuation.
-- Example: "cjc(no-dac)/ipa" -> "cjc-no-dac-ipa"

CREATE OR REPLACE FUNCTION generate_slug(input_text TEXT)
RETURNS TEXT AS $$
DECLARE
  slug TEXT;
BEGIN
  -- Gracefully handle NULL input
  IF input_text IS NULL THEN
    RETURN NULL;
  END IF;

  -- Normalize: trim and lowercase
  slug := lower(trim(input_text));

  -- Replace any run of non-alphanumeric characters with a single hyphen.
  -- This converts spaces, parentheses, slashes, etc. into clean separators.
  slug := regexp_replace(slug, '[^a-z0-9]+', '-', 'g');

  -- Trim leading/trailing hyphens
  slug := regexp_replace(slug, '^-+|-+$', '', 'g');

  -- If the result is empty (e.g. name was only symbols), return NULL
  IF slug = '' THEN
    RETURN NULL;
  END IF;

  RETURN slug;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Backfill existing product slugs using the improved generator.
-- This will recompute slugs for all products based on their current name
-- while preserving uniqueness via ensure_unique_slug.
-- NOTE: This will change existing product URLs; run only when you're
-- ready to migrate fully to the new slug format.
UPDATE public.products
SET slug = ensure_unique_slug(generate_slug(name), id)
WHERE name IS NOT NULL;

