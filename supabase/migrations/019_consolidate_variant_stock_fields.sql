-- Consolidate duplicate stock fields in product_variants.
-- The table has both `stock` and `stock_quantity` which can drift out of sync.
-- This migration ensures they are in sync and designates `stock` as the primary field.

-- Sync stock_quantity -> stock where stock is null or zero but stock_quantity has a value
UPDATE public.product_variants
SET stock = stock_quantity
WHERE (stock IS NULL OR stock = 0) AND stock_quantity IS NOT NULL AND stock_quantity > 0;

-- Sync stock -> stock_quantity where stock_quantity is null or zero but stock has a value
UPDATE public.product_variants
SET stock_quantity = stock
WHERE (stock_quantity IS NULL OR stock_quantity = 0) AND stock IS NOT NULL AND stock > 0;

-- Ensure both fields stay in sync going forward with a trigger
CREATE OR REPLACE FUNCTION sync_variant_stock_fields()
RETURNS TRIGGER AS $$
BEGIN
  -- When stock changes, sync to stock_quantity
  IF NEW.stock IS DISTINCT FROM OLD.stock THEN
    NEW.stock_quantity := NEW.stock;
  -- When stock_quantity changes, sync to stock
  ELSIF NEW.stock_quantity IS DISTINCT FROM OLD.stock_quantity THEN
    NEW.stock := NEW.stock_quantity;
  END IF;

  -- Keep in_stock consistent with stock level
  NEW.in_stock := COALESCE(NEW.stock, 0) > 0;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sync_variant_stock ON public.product_variants;
CREATE TRIGGER sync_variant_stock
  BEFORE UPDATE ON public.product_variants
  FOR EACH ROW
  EXECUTE FUNCTION sync_variant_stock_fields();
