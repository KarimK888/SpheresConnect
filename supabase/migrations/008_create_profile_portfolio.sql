create table if not exists public.profile_projects (
  project_id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users (user_id) on delete cascade,
  title text not null,
  summary text,
  link text,
  status text check (status in ('draft','live')),
  tags text[] default '{}',
  year int,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.profile_media (
  media_id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users (user_id) on delete cascade,
  project_id uuid references public.profile_projects (project_id) on delete cascade,
  type text not null check (type in ('image','video','document')),
  title text,
  description text,
  url text not null,
  thumbnail_url text,
  tags text[] default '{}',
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.profile_socials (
  social_id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users (user_id) on delete cascade,
  platform text not null,
  handle text,
  url text,
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.profile_projects enable row level security;
alter table public.profile_media enable row level security;
alter table public.profile_socials enable row level security;

drop policy if exists profile_projects_owner on public.profile_projects;
create policy profile_projects_owner
  on public.profile_projects
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists profile_media_owner on public.profile_media;
create policy profile_media_owner
  on public.profile_media
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists profile_socials_owner on public.profile_socials;
create policy profile_socials_owner
  on public.profile_socials
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
