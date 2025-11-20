create table if not exists public.verification_requests (
  request_id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users (user_id) on delete cascade,
  portfolio_url text,
  statement text,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  reviewer_id uuid,
  reviewed_at timestamptz,
  notes text,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.moderation_queue (
  queue_id uuid primary key default uuid_generate_v4(),
  resource_type text not null,
  resource_id text not null,
  reported_by uuid references public.users (user_id),
  reason text,
  status text not null default 'open' check (status in ('open','in_review','resolved')),
  reviewer_id uuid,
  reviewed_at timestamptz,
  resolution text,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.support_tickets (
  ticket_id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.users (user_id),
  subject text not null,
  body text,
  status text not null default 'open' check (status in ('open','in_progress','closed')),
  assigned_to uuid,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz
);

alter table public.verification_requests enable row level security;
alter table public.moderation_queue enable row level security;
alter table public.support_tickets enable row level security;

drop policy if exists verification_requests_owner_select on public.verification_requests;
drop policy if exists verification_requests_owner_write on public.verification_requests;
drop policy if exists verification_requests_admin on public.verification_requests;
drop policy if exists moderation_queue_admin on public.moderation_queue;
drop policy if exists support_tickets_owner_select on public.support_tickets;
drop policy if exists support_tickets_owner_write on public.support_tickets;
drop policy if exists support_tickets_admin on public.support_tickets;

create policy verification_requests_owner_select
  on public.verification_requests
  for select using (auth.uid() = user_id);

create policy verification_requests_owner_write
  on public.verification_requests
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy verification_requests_admin
  on public.verification_requests
  using (auth.role() = 'service_role');

create policy moderation_queue_admin
  on public.moderation_queue
  using (auth.role() = 'service_role');

create policy support_tickets_owner_select
  on public.support_tickets
  for select using (auth.uid() = user_id);

create policy support_tickets_owner_write
  on public.support_tickets
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy support_tickets_admin
  on public.support_tickets
  using (auth.role() = 'service_role');
