create table if not exists public.productivity_boards (
  board_id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users (user_id) on delete cascade,
  title text not null,
  description text,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.productivity_columns (
  column_id uuid primary key default uuid_generate_v4(),
  board_id uuid not null references public.productivity_boards (board_id) on delete cascade,
  title text not null,
  position integer not null default 0,
  color text,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.productivity_cards (
  card_id uuid primary key default uuid_generate_v4(),
  column_id uuid not null references public.productivity_columns (column_id) on delete cascade,
  title text not null,
  description text,
  labels text[] default '{}'::text[],
  due_date timestamptz,
  assignees uuid[] default '{}'::uuid[],
  metadata jsonb,
  position integer not null default 0,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.productivity_todos (
  todo_id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users (user_id) on delete cascade,
  title text not null,
  completed boolean not null default false,
  due_date timestamptz,
  tags text[] default '{}'::text[],
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.productivity_events (
  event_id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users (user_id) on delete cascade,
  title text not null,
  description text,
  start_at timestamptz not null,
  end_at timestamptz,
  location text,
  color text,
  metadata jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.productivity_boards enable row level security;
alter table public.productivity_columns enable row level security;
alter table public.productivity_cards enable row level security;
alter table public.productivity_todos enable row level security;
alter table public.productivity_events enable row level security;

drop policy if exists productivity_boards_owner on public.productivity_boards;
drop policy if exists productivity_columns_owner on public.productivity_columns;
drop policy if exists productivity_cards_owner on public.productivity_cards;
drop policy if exists productivity_todos_owner on public.productivity_todos;
drop policy if exists productivity_events_owner on public.productivity_events;

create policy productivity_boards_owner
  on public.productivity_boards
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy productivity_columns_owner
  on public.productivity_columns
  using (
    exists (
      select 1 from public.productivity_boards b
      where b.board_id = board_id and b.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.productivity_boards b
      where b.board_id = board_id and b.user_id = auth.uid()
    )
  );

create policy productivity_cards_owner
  on public.productivity_cards
  using (
    exists (
      select 1
      from public.productivity_columns c
      join public.productivity_boards b on b.board_id = c.board_id
      where c.column_id = column_id and b.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.productivity_columns c
      join public.productivity_boards b on b.board_id = c.board_id
      where c.column_id = column_id and b.user_id = auth.uid()
    )
  );

create policy productivity_todos_owner
  on public.productivity_todos
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy productivity_events_owner
  on public.productivity_events
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
