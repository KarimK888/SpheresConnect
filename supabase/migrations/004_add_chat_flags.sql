alter table if exists public.chats
  add column if not exists archived_by text[] default '{}'::text[];

alter table if exists public.chats
  add column if not exists hidden_by text[] default '{}'::text[];
