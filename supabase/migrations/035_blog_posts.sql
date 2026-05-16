-- ============================================================
-- Migration: blog posts (admin-managed CMS)
-- ============================================================
-- Replaces the static lib/blog/posts/*.tsx files with a DB-backed
-- model so the admin (and, in a future iteration, customers) can
-- create and edit posts without a code change.
--
-- Body is stored as sanitized HTML produced by the admin's Quill
-- editor; the API sanitizes on write. Render-side uses
-- dangerouslySetInnerHTML over the sanitized field — safe because
-- only admins write here in v1.

CREATE TABLE IF NOT EXISTS public.blog_posts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            TEXT UNIQUE NOT NULL,
  title           TEXT NOT NULL CHECK (length(title) BETWEEN 1 AND 200),
  description     TEXT NOT NULL CHECK (length(description) BETWEEN 1 AND 500),
  body_html       TEXT NOT NULL,
  featured_image  TEXT,
  -- author_name is the public byline (e.g. "PrimeHelix Labz Research Team");
  -- author_user_id ties to auth.users when a non-team account authored the
  -- post — null for v1 admin-only content. Schema-ready for customer
  -- submissions without another migration.
  author_name     TEXT NOT NULL DEFAULT 'PrimeHelix Labz Research Team',
  author_user_id  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status          TEXT NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft', 'published')),
  tags            TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  read_minutes    INTEGER NOT NULL DEFAULT 5 CHECK (read_minutes > 0),
  published_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_blog_posts_published
  ON public.blog_posts(published_at DESC)
  WHERE status = 'published';

CREATE INDEX IF NOT EXISTS idx_blog_posts_status_updated
  ON public.blog_posts(status, updated_at DESC);

DROP TRIGGER IF EXISTS update_blog_posts_updated_at ON public.blog_posts;
CREATE TRIGGER update_blog_posts_updated_at
  BEFORE UPDATE ON public.blog_posts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Auto-set published_at the first time status flips to 'published'.
CREATE OR REPLACE FUNCTION blog_set_published_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'published' AND NEW.published_at IS NULL THEN
    NEW.published_at := now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_blog_set_published_at ON public.blog_posts;
CREATE TRIGGER trigger_blog_set_published_at
  BEFORE INSERT OR UPDATE ON public.blog_posts
  FOR EACH ROW EXECUTE FUNCTION blog_set_published_at();

-- RLS: published posts are readable by anyone; everything else flows
-- through the admin API under the service role.
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Published blog posts are readable by everyone"
  ON public.blog_posts;
CREATE POLICY "Published blog posts are readable by everyone"
  ON public.blog_posts
  FOR SELECT
  TO anon, authenticated
  USING (status = 'published');

COMMENT ON TABLE public.blog_posts IS
  'Admin-authored blog posts. body_html is sanitized at write time by the API.';
