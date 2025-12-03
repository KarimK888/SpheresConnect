alter table public.productivity_cards
  add column if not exists priority text not null default 'medium';

alter table public.productivity_todos
  add column if not exists priority text not null default 'medium';

create table if not exists public.productivity_comments (
  comment_id uuid primary key default uuid_generate_v4(),
  entity_type text not null check (entity_type in ('card','todo')),
  entity_id uuid not null,
  user_id uuid not null references public.users (user_id) on delete cascade,
  author_name text,
  body text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists productivity_comments_entity_idx on public.productivity_comments (entity_type, entity_id);

alter table public.productivity_comments enable row level security;

drop policy if exists productivity_comments_owner on public.productivity_comments;

create policy productivity_comments_owner
  on public.productivity_comments
  using (
    user_id = auth.uid()
    and (
      (entity_type = 'card' and exists (
        select 1
        from public.productivity_cards pc
        join public.productivity_columns pcol on pcol.column_id = pc.column_id
        join public.productivity_boards pb on pb.board_id = pcol.board_id
        where pc.card_id = entity_id and pb.user_id = auth.uid()
      ))
      or
      (entity_type = 'todo' and exists (
        select 1 from public.productivity_todos pt
        where pt.todo_id = entity_id and pt.user_id = auth.uid()
      ))
    )
  )
  with check (
    user_id = auth.uid()
    and (
      (entity_type = 'card' and exists (
        select 1
        from public.productivity_cards pc
        join public.productivity_columns pcol on pcol.column_id = pc.column_id
        join public.productivity_boards pb on pb.board_id = pcol.board_id
        where pc.card_id = entity_id and pb.user_id = auth.uid()
      ))
      or
      (entity_type = 'todo' and exists (
        select 1 from public.productivity_todos pt
        where pt.todo_id = entity_id and pt.user_id = auth.uid()
      ))
    )
  );
