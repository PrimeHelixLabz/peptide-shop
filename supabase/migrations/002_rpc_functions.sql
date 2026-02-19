-- RPC Functions for common operations

-- Function to search products with full-text search
CREATE OR REPLACE FUNCTION public.search_products(search_query TEXT, category_filter TEXT DEFAULT NULL, limit_count INTEGER DEFAULT 50)
RETURNS TABLE (
  id UUID,
  slug TEXT,
  name TEXT,
  price DECIMAL,
  description TEXT,
  long_description TEXT,
  image TEXT,
  images JSONB,
  category TEXT,
  in_stock BOOLEAN,
  stock_quantity INTEGER,
  specifications JSONB,
  usage TEXT,
  shipping TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  rank REAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.slug,
    p.name,
    p.price,
    p.description,
    p.long_description,
    p.image,
    p.images,
    p.category,
    p.in_stock,
    p.stock_quantity,
    p.specifications,
    p.usage,
    p.shipping,
    p.created_at,
    p.updated_at,
    ts_rank(to_tsvector('english', p.name || ' ' || COALESCE(p.description, '') || ' ' || COALESCE(p.long_description, '')), plainto_tsquery('english', search_query)) AS rank
  FROM public.products p
  WHERE
    (category_filter IS NULL OR p.category = category_filter)
    AND (
      to_tsvector('english', p.name || ' ' || COALESCE(p.description, '') || ' ' || COALESCE(p.long_description, '')) @@ plainto_tsquery('english', search_query)
      OR p.name ILIKE '%' || search_query || '%'
      OR p.description ILIKE '%' || search_query || '%'
      OR p.category ILIKE '%' || search_query || '%'
    )
  ORDER BY rank DESC, p.created_at DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get cart total
CREATE OR REPLACE FUNCTION public.get_cart_total(user_uuid UUID)
RETURNS TABLE (
  subtotal DECIMAL,
  item_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(SUM(p.price * ci.quantity), 0)::DECIMAL AS subtotal,
    COUNT(ci.id)::INTEGER AS item_count
  FROM public.cart_items ci
  INNER JOIN public.products p ON ci.product_id = p.id
  WHERE ci.user_id = user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get related products
CREATE OR REPLACE FUNCTION public.get_related_products(product_uuid UUID, limit_count INTEGER DEFAULT 3)
RETURNS TABLE (
  id UUID,
  name TEXT,
  price DECIMAL,
  description TEXT,
  image TEXT,
  images JSONB,
  category TEXT,
  in_stock BOOLEAN,
  specifications JSONB
) AS $$
DECLARE
  product_category TEXT;
BEGIN
  -- Get the category of the current product
  SELECT category INTO product_category
  FROM public.products
  WHERE id = product_uuid;

  RETURN QUERY
  SELECT
    p.id,
    p.name,
    p.price,
    p.description,
    p.image,
    p.images,
    p.category,
    p.in_stock,
    p.specifications
  FROM public.products p
  WHERE
    p.id != product_uuid
    AND (
      (product_category IS NOT NULL AND p.category = product_category)
      OR (product_category IS NULL)
    )
  ORDER BY
    CASE WHEN p.category = product_category THEN 0 ELSE 1 END,
    p.created_at DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get order statistics (admin only)
CREATE OR REPLACE FUNCTION public.get_order_stats(start_date TIMESTAMPTZ DEFAULT NULL, end_date TIMESTAMPTZ DEFAULT NULL)
RETURNS TABLE (
  total_orders BIGINT,
  total_revenue DECIMAL,
  average_order_value DECIMAL,
  pending_orders BIGINT,
  completed_orders BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT AS total_orders,
    COALESCE(SUM(total), 0)::DECIMAL AS total_revenue,
    COALESCE(AVG(total), 0)::DECIMAL AS average_order_value,
    COUNT(*) FILTER (WHERE status = 'pending')::BIGINT AS pending_orders,
    COUNT(*) FILTER (WHERE status = 'delivered')::BIGINT AS completed_orders
  FROM public.orders
  WHERE
    (start_date IS NULL OR created_at >= start_date)
    AND (end_date IS NULL OR created_at <= end_date);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
