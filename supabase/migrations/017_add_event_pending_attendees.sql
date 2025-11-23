alter table if exists public.events
  add column if not exists pending_attendees text[] default '{}'::text[];

update public.events
set pending_attendees = coalesce(pending_attendees, '{}'::text[]);
