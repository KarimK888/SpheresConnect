create table if not exists public.order_milestones (
  milestone_id uuid primary key default uuid_generate_v4(),
  order_id uuid not null references public.orders (order_id) on delete cascade,
  title text not null,
  amount bigint not null,
  due_date timestamptz,
  status text not null check (status in ('pending','submitted','approved','paid')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz
);

create table if not exists public.payouts (
  payout_id uuid primary key default uuid_generate_v4(),
  order_id uuid not null references public.orders (order_id) on delete cascade,
  milestone_id uuid references public.order_milestones (milestone_id) on delete set null,
  payee_id uuid not null,
  amount bigint not null,
  currency text not null default 'usd',
  status text not null check (status in ('initiated','processing','paid','failed')),
  metadata jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.order_milestones enable row level security;
alter table public.payouts enable row level security;

drop policy if exists order_milestones_service_role on public.order_milestones;
create policy order_milestones_service_role
  on public.order_milestones
  using (auth.role() = 'service_role');

drop policy if exists payouts_service_role on public.payouts;
create policy payouts_service_role
  on public.payouts
  using (auth.role() = 'service_role');
