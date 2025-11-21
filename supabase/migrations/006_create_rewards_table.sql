create table if not exists public.rewards (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users (user_id) on delete cascade,
  action text not null check (action in ('onboarding', 'checkin', 'match', 'sale', 'rsvp', 'bonus', 'redeem', 'transfer')),
  points integer not null default 0,
  note text,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists rewards_user_idx on public.rewards (user_id);

alter table public.rewards enable row level security;

drop policy if exists rewards_select_self on public.rewards;
create policy rewards_select_self
  on public.rewards
  for select
  using (auth.uid() = user_id);
