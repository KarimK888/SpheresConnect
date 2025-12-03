alter table if exists public.users
  add column if not exists role text;

alter table public.users
  alter column role set default 'member';

update public.users
   set role = coalesce(role, 'member');

alter table public.users
  alter column role set not null;

alter table public.users
  drop constraint if exists users_role_check;

alter table public.users
  add constraint users_role_check
  check (role in ('member','moderator','admin'));

alter table public.hubs
  alter column active_users set default array[]::text[];

update public.hubs
   set active_users = coalesce(active_users, array[]::text[]);

create index if not exists checkins_user_expiry_idx
  on public.checkins (user_id, expires_at desc);
