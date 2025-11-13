create table if not exists public.checkins (
  checkin_id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users (user_id) on delete cascade,
  hub_id uuid references public.hubs (hub_id),
  location jsonb,
  status text not null check (status in ('online', 'offline')),
  expires_at timestamptz not null,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists checkins_user_idx on public.checkins (user_id);
create index if not exists checkins_hub_idx on public.checkins (hub_id);
create index if not exists checkins_expires_idx on public.checkins (expires_at);

alter table public.checkins enable row level security;

drop policy if exists checkins_service_access on public.checkins;
create policy checkins_service_access
  on public.checkins
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

