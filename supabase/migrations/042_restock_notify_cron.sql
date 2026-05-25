-- Restock-notification email fan-out via pg_cron + pg_net.
--
-- Replaces the prior Vercel Cron entry. The Next.js route at
--   /api/cron/restock-notify
-- still does all the real work (joining restock_notifications against
-- product_variants, composing emails via Resend, stamping notified_at).
-- This migration only schedules the HTTP call from inside Postgres so the
-- entire scheduled-job catalog lives in one place — alongside the existing
-- cleanup_stale_pending_orders job in migration 023.
--
-- ── Required setup BEFORE this cron will fire successfully ──
--
-- Two values must be present in Supabase Vault. Run these SQL statements
-- ONCE in the Supabase SQL editor (or anywhere with admin access):
--
--   select vault.create_secret(
--     'https://www.primehelixlabz.com',   -- production site origin (no trailing slash)
--     'site_url'
--   );
--   select vault.create_secret(
--     '<paste CRON_SECRET value here>',   -- must match Vercel env CRON_SECRET
--     'cron_secret'
--   );
--
-- The CRON_SECRET value must be IDENTICAL to the one stored in Vercel's
-- environment variables — the Next.js route reads it from process.env and
-- validates the Authorization header against it. Mismatch → every cron tick
-- returns 401 and no emails ship.
--
-- Until both secrets exist, the cron function logs a warning and returns
-- without making the HTTP call (no-op, never errors). Once you add them,
-- the next 15-minute tick takes effect — no redeploy needed.

create extension if not exists pg_cron;
create extension if not exists pg_net;

create or replace function public.trigger_restock_notify_cron()
returns void
language plpgsql
security definer
as $$
declare
  v_site_url    text;
  v_cron_secret text;
begin
  -- Pull configuration from Vault. Both must exist or we skip — failing
  -- closed prevents an unauthenticated call that would 401 anyway.
  select decrypted_secret into v_site_url
    from vault.decrypted_secrets
    where name = 'site_url'
    limit 1;

  select decrypted_secret into v_cron_secret
    from vault.decrypted_secrets
    where name = 'cron_secret'
    limit 1;

  if v_site_url is null or v_cron_secret is null then
    raise log
      'restock-notify cron: vault secrets missing (site_url=%, cron_secret=%) — skipping',
      v_site_url is not null,
      v_cron_secret is not null;
    return;
  end if;

  -- Fire-and-forget POST to the Next.js cron handler. pg_net returns a
  -- request id immediately and queues delivery; we don't block on the
  -- response. The handler's own logging + return value is the source of
  -- truth for what happened — inspect via Vercel function logs.
  perform net.http_get(
    url     := v_site_url || '/api/cron/restock-notify',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || v_cron_secret,
      'Content-Type',  'application/json'
    ),
    timeout_milliseconds := 60000
  );
end;
$$;

-- Make the migration safely re-runnable: unschedule any prior version
-- before re-scheduling. cron.unschedule errors if the job is missing,
-- so guard the call.
do $$
begin
  if exists (select 1 from cron.job where jobname = 'restock-notify') then
    perform cron.unschedule('restock-notify');
  end if;
end $$;

-- Schedule: every 15 minutes. Matches the prior Vercel cron cadence.
select cron.schedule(
  'restock-notify',
  '*/15 * * * *',
  $$select public.trigger_restock_notify_cron()$$
);
