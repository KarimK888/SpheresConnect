create table if not exists public.notifications (
  notification_id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users (user_id) on delete cascade,
  kind text not null default 'system',
  title text not null,
  body text,
  link text,
  link_label text,
  secondary_link text,
  secondary_link_label text,
  metadata jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  read_at timestamptz
);

create index if not exists notifications_user_idx on public.notifications (user_id, created_at desc);

alter table public.notifications enable row level security;

drop policy if exists notifications_owner_select on public.notifications;
drop policy if exists notifications_owner_write on public.notifications;

create policy notifications_owner_select
  on public.notifications
  for select using (auth.uid() = user_id);

create policy notifications_owner_write
  on public.notifications
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
