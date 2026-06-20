-- ============================================================
-- Migration: blog post announcement email
-- ============================================================
-- Lets the admin send a one-time "new article" email to all active
-- newsletter subscribers from the blog editor. announcement_sent_at
-- records when that blast went out so the button can't double-send.
-- Null = not yet announced. The send itself is also logged as a row in
-- email_campaigns (audience = 'all_active') for the usual audit trail.

ALTER TABLE public.blog_posts
  ADD COLUMN IF NOT EXISTS announcement_sent_at TIMESTAMPTZ;

COMMENT ON COLUMN public.blog_posts.announcement_sent_at IS
  'When the new-post announcement email was sent to the newsletter list. Null = never sent.';
