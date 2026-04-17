-- Enable pg_cron and pg_net extensions (pg_cron is available on Supabase by default)
create extension if not exists pg_cron;

-- Function: delete pending orders (and related payments/pending_checkouts)
-- that have not been completed within 3 days.
create or replace function public.cleanup_stale_pending_orders()
returns void
language plpgsql
security definer
as $$
declare
  _cutoff timestamptz := now() - interval '3 days';
  _order_ids uuid[];
begin
  -- Collect stale pending order IDs
  select array_agg(id) into _order_ids
  from orders
  where status = 'pending'
    and payment_status = 'pending'
    and created_at < _cutoff;

  -- Nothing to clean up
  if _order_ids is null or array_length(_order_ids, 1) is null then
    raise log 'cleanup_stale_pending_orders: no stale orders found';
    return;
  end if;

  -- Delete related payment rows
  delete from payments
  where order_id = any(_order_ids);

  -- Delete related pending checkouts
  delete from pending_checkouts
  where id = any(_order_ids);

  -- Delete the stale orders (re-check status to guard against race conditions)
  delete from orders
  where id = any(_order_ids)
    and status = 'pending'
    and payment_status = 'pending';

  raise log 'cleanup_stale_pending_orders: removed % stale orders', array_length(_order_ids, 1);
end;
$$;

-- Schedule: run daily at 3:00 AM UTC
select cron.schedule(
  'cleanup-stale-pending-orders',
  '0 3 * * *',
  $$select public.cleanup_stale_pending_orders()$$
);
