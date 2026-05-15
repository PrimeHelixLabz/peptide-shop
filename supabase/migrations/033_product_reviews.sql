-- ============================================================
-- Migration: product reviews
-- ============================================================
-- Customer-submitted reviews for products. To prevent spam/sabotage
-- in the research-peptide niche we enforce verified-purchase by
-- requiring that each review reference a paid order containing the
-- product. Status defaults to 'published' (auto-approved when verified)
-- but can be flipped to 'hidden' manually via the Supabase dashboard
-- without deleting evidence.

CREATE TABLE IF NOT EXISTS public.product_reviews (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id      UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  order_id        UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  user_id         UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  customer_name   TEXT NOT NULL,
  customer_email  TEXT NOT NULL,
  rating          SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title           TEXT NOT NULL CHECK (length(title) BETWEEN 1 AND 120),
  body            TEXT NOT NULL CHECK (length(body) BETWEEN 1 AND 4000),
  is_verified_purchase BOOLEAN NOT NULL DEFAULT false,
  status          TEXT NOT NULL DEFAULT 'published'
                    CHECK (status IN ('pending', 'published', 'hidden')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Enforce one review per (user, product). If user_id is null we allow
  -- multiple — but the API will only ever insert with a user_id present,
  -- so this is a defense-in-depth constraint not a hard guarantee.
  UNIQUE (user_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_product_reviews_product_status_created
  ON public.product_reviews(product_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_product_reviews_user
  ON public.product_reviews(user_id);

-- updated_at trigger reusing the function defined in 001_initial_schema.sql
DROP TRIGGER IF EXISTS update_product_reviews_updated_at ON public.product_reviews;
CREATE TRIGGER update_product_reviews_updated_at
  BEFORE UPDATE ON public.product_reviews
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS: published reviews are readable by anyone; writes go through the
-- API route under the service role (which bypasses RLS).
ALTER TABLE public.product_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Published reviews are readable by everyone"
  ON public.product_reviews;
CREATE POLICY "Published reviews are readable by everyone"
  ON public.product_reviews
  FOR SELECT
  TO anon, authenticated
  USING (status = 'published');

-- Authenticated users can read their own reviews regardless of status,
-- so they can see "pending" or "hidden" entries on their own account.
DROP POLICY IF EXISTS "Users can read their own reviews"
  ON public.product_reviews;
CREATE POLICY "Users can read their own reviews"
  ON public.product_reviews
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- No client INSERT/UPDATE/DELETE policies — all writes flow through the
-- service-role API route which performs verified-purchase checks.

COMMENT ON TABLE public.product_reviews IS
  'Customer reviews for products. Verified-purchase enforced by API; status managed via Supabase dashboard for moderation.';
