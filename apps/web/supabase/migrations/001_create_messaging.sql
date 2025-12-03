-- SpheraConnect Supabase schema

create extension if not exists "uuid-ossp";

create table if not exists public.users (
  user_id uuid primary key,
  email text not null unique,
  display_name text,
  bio text,
  skills text[] default '{}',
  profile_picture_url text,
  connections text[] default '{}',
  is_verified boolean default false,
  language text default 'en',
  location jsonb,
  joined_at timestamptz default timezone('utc', now())
);

create table if not exists public.chats (
  chat_id uuid primary key default uuid_generate_v4(),
  member_ids text[] not null,
  is_group boolean not null default false,
  title text,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.hubs (
  hub_id uuid primary key default uuid_generate_v4(),
  name text not null,
  location jsonb not null,
  active_users text[] default '{}'
);

create table if not exists public.messages (
  message_id uuid primary key default uuid_generate_v4(),
  chat_id uuid not null references public.chats (chat_id) on delete cascade,
  sender_id text not null,
  content text,
  attachments jsonb,
  metadata jsonb,
  is_silent boolean default false,
  scheduled_for timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz,
  deleted_at timestamptz,
  delivered_to text[] default '{}',
  read_by text[] default '{}',
  pinned boolean default false
);

create table if not exists public.message_reactions (
  reaction_id uuid primary key default uuid_generate_v4(),
  chat_id uuid not null references public.chats (chat_id) on delete cascade,
  message_id uuid not null references public.messages (message_id) on delete cascade,
  user_id text not null,
  emoji text not null,
  created_at timestamptz not null default timezone('utc', now()),
  unique (message_id, user_id, emoji)
);

create table if not exists public.message_reads (
  chat_id uuid not null references public.chats (chat_id) on delete cascade,
  message_id uuid not null references public.messages (message_id) on delete cascade,
  user_id text not null,
  read_at timestamptz not null default timezone('utc', now()),
  primary key (message_id, user_id)
);

create table if not exists public.artworks (
  artwork_id uuid primary key default uuid_generate_v4(),
  artist_id text not null,
  title text not null,
  description text,
  media_urls text[] not null,
  price bigint not null,
  currency text not null,
  is_sold boolean default false,
  tags text[] not null,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.orders (
  order_id uuid primary key default uuid_generate_v4(),
  artwork_id uuid not null references public.artworks (artwork_id) on delete cascade,
  buyer_id text not null,
  seller_id text not null,
  amount bigint not null,
  currency text not null,
  status text not null check (status in ('pending', 'paid', 'failed', 'refunded')),
  stripe_payment_intent_id text,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.events (
  event_id uuid primary key default uuid_generate_v4(),
  title text not null,
  description text,
  starts_at timestamptz not null,
  ends_at timestamptz,
  location jsonb,
  host_user_id text not null,
  attendees text[] default '{}',
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists chats_member_ids_idx on public.chats using gin (member_ids);
create index if not exists messages_chat_id_idx on public.messages (chat_id, created_at);
create index if not exists messages_sender_id_idx on public.messages (sender_id);
create index if not exists message_reactions_message_idx on public.message_reactions (message_id);
create index if not exists message_reads_message_idx on public.message_reads (message_id);
create index if not exists artworks_artist_idx on public.artworks (artist_id);
create index if not exists artworks_tags_idx on public.artworks using gin (tags);
create index if not exists orders_seller_idx on public.orders (seller_id);
create index if not exists orders_artwork_idx on public.orders (artwork_id);
create index if not exists events_host_idx on public.events (host_user_id);
create index if not exists events_starts_idx on public.events (starts_at);

alter table public.users enable row level security;
alter table public.chats enable row level security;
alter table public.hubs enable row level security;
alter table public.messages enable row level security;
alter table public.message_reactions enable row level security;
alter table public.message_reads enable row level security;
alter table public.artworks enable row level security;
alter table public.orders enable row level security;
alter table public.events enable row level security;

drop policy if exists "Allow service role full access users" on public.users;
create policy "Allow service role full access users" on public.users
  using (true) with check (true);
drop policy if exists "Users can view profiles" on public.users;
create policy "Users can view profiles" on public.users
  for select
  using (true);
drop policy if exists "Users can insert their profile" on public.users;
create policy "Users can insert their profile" on public.users
  for insert
  with check (auth.uid() = user_id);
drop policy if exists "Users can update their profile" on public.users;
create policy "Users can update their profile" on public.users
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
drop policy if exists "Allow service role full access chats" on public.chats;
create policy "Allow service role full access chats" on public.chats
  using (true) with check (true);
drop policy if exists "Members can manage chats" on public.chats;
create policy "Members can manage chats" on public.chats
  for all
  using (auth.uid()::text = any(member_ids))
  with check (auth.uid()::text = any(member_ids));
drop policy if exists "Allow service role full access hubs" on public.hubs;
create policy "Allow service role full access hubs" on public.hubs
  using (true) with check (true);
drop policy if exists "Anyone can view hubs" on public.hubs;
create policy "Anyone can view hubs" on public.hubs
  for select
  using (true);
drop policy if exists "Allow service role full access messages" on public.messages;
create policy "Allow service role full access messages" on public.messages
  using (true) with check (true);
drop policy if exists "Chat members can read messages" on public.messages;
create policy "Chat members can read messages" on public.messages
  for select
  using (
    exists (
      select 1
      from public.chats c
      where c.chat_id = messages.chat_id
        and auth.uid()::text = any(c.member_ids)
    )
  );
drop policy if exists "Chat members can send messages" on public.messages;
create policy "Chat members can send messages" on public.messages
  for insert
  with check (
    sender_id = auth.uid()::text
    and exists (
      select 1
      from public.chats c
      where c.chat_id = messages.chat_id
        and auth.uid()::text = any(c.member_ids)
    )
  );
drop policy if exists "Senders can update their messages" on public.messages;
create policy "Senders can update their messages" on public.messages
  for update
  using (sender_id = auth.uid()::text)
  with check (sender_id = auth.uid()::text);
drop policy if exists "Allow service role full access reactions" on public.message_reactions;
create policy "Allow service role full access reactions" on public.message_reactions
  using (true) with check (true);
drop policy if exists "Chat members can manage reactions" on public.message_reactions;
create policy "Chat members can manage reactions" on public.message_reactions
  for all
  using (
    exists (
      select 1
      from public.messages m
      join public.chats c on c.chat_id = m.chat_id
      where m.message_id = message_reactions.message_id
        and auth.uid()::text = any(c.member_ids)
    )
  )
  with check (user_id = auth.uid()::text);
drop policy if exists "Allow service role full access reads" on public.message_reads;
create policy "Allow service role full access reads" on public.message_reads
  using (true) with check (true);
drop policy if exists "Chat members can track reads" on public.message_reads;
create policy "Chat members can track reads" on public.message_reads
  for all
  using (
    exists (
      select 1
      from public.messages m
      join public.chats c on c.chat_id = m.chat_id
      where m.message_id = message_reads.message_id
        and auth.uid()::text = any(c.member_ids)
    )
  )
  with check (user_id = auth.uid()::text);
drop policy if exists "Allow service role full access artworks" on public.artworks;
create policy "Allow service role full access artworks" on public.artworks
  using (true) with check (true);
drop policy if exists "Anyone can view artworks" on public.artworks;
create policy "Anyone can view artworks" on public.artworks
  for select
  using (true);
drop policy if exists "Artists can manage their artworks" on public.artworks;
create policy "Artists can manage their artworks" on public.artworks
  for all
  using (artist_id = auth.uid()::text)
  with check (artist_id = auth.uid()::text);
drop policy if exists "Allow service role full access orders" on public.orders;
create policy "Allow service role full access orders" on public.orders
  using (true) with check (true);
drop policy if exists "Allow service role full access events" on public.events;
create policy "Allow service role full access events" on public.events
  using (true) with check (true);
drop policy if exists "Anyone can view events" on public.events;
create policy "Anyone can view events" on public.events
  for select
  using (true);
drop policy if exists "Hosts can manage events" on public.events;
create policy "Hosts can manage events" on public.events
  for all
  using (host_user_id = auth.uid()::text)
  with check (host_user_id = auth.uid()::text);
