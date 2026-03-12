-- Pending checkouts table
-- Stores checkout data temporarily until Stripe confirms payment.
-- Orders are only created after successful payment (via webhook).

CREATE TABLE IF NOT EXISTS public.pending_checkouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  stripe_session_id TEXT,
  checkout_data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  -- Auto-expire old pending checkouts (Stripe sessions expire after 24h)
  expires_at TIMESTAMPTZ DEFAULT now() + INTERVAL '24 hours'
);

-- Index for quick lookup by stripe session id
CREATE INDEX IF NOT EXISTS idx_pending_checkouts_stripe_session
  ON public.pending_checkouts(stripe_session_id);

-- RLS: only service role should access this table (webhooks use admin client)
ALTER TABLE public.pending_checkouts ENABLE ROW LEVEL SECURITY;

-- Allow service role full access (admin client bypasses RLS anyway)
-- No user-facing policies needed since users never read this table directly.