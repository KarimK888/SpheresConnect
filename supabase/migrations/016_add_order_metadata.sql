alter table if exists public.orders
  add column if not exists metadata jsonb;
