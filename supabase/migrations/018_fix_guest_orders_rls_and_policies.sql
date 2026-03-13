-- Fix overly permissive guest orders RLS policy.
-- Previously, ANY user could SELECT all guest orders (user_id IS NULL).
-- Now guest orders are only accessible via the admin client (service role)
-- or by authenticated admins. The application layer verifies email before
-- returning guest order data, so we remove the public-facing SELECT policy.

-- Drop the overly permissive guest orders policy
DROP POLICY IF EXISTS "Guest orders are viewable by order number" ON public.orders;

-- Add admin DELETE policy (was missing entirely)
DROP POLICY IF EXISTS "Admins can delete orders" ON public.orders;
CREATE POLICY "Admins can delete orders"
  ON public.orders FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Fix archived products: add RLS policy to hide archived products from non-admins
DROP POLICY IF EXISTS "Everyone can view products" ON public.products;
CREATE POLICY "Everyone can view active products"
  ON public.products FOR SELECT
  USING (
    is_archived = false
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
