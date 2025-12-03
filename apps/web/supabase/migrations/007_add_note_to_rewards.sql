alter table if exists public.rewards
  add column if not exists note text;
