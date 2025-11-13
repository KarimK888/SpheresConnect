create table if not exists public.match_actions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (user_id) on delete cascade,
  target_id uuid not null references public.users (user_id) on delete cascade,
  action text not null check (action in ('connected', 'skipped')),
  created_at timestamptz not null default now()
);

create index if not exists match_actions_user_idx on public.match_actions (user_id);
create index if not exists match_actions_target_idx on public.match_actions (target_id);

alter table public.match_actions enable row level security;

drop policy if exists match_actions_select_self on public.match_actions;
create policy match_actions_select_self
  on public.match_actions
  for select
  using (auth.uid() = user_id);

drop policy if exists match_actions_insert_self on public.match_actions;
create policy match_actions_insert_self
  on public.match_actions
  for insert
  with check (auth.uid() = user_id);

