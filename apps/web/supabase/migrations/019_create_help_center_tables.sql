-- Help Center tables used by the Supabase backend adapter.
-- These tables intentionally use quoted identifiers to preserve camelCase column names that match the generated types in src/lib/supabase-database.ts.

create table if not exists public."User" (
  "id" text primary key,
  "email" text not null unique,
  "fullName" text,
  "avatarUrl" text,
  "phoneVerified" boolean not null default false,
  "idVerified" boolean not null default false,
  "trustLevel" text not null default 'MEMBER',
  "createdAt" timestamptz not null default timezone('utc', now()),
  "updatedAt" timestamptz not null default timezone('utc', now()),
  "about" text,
  "aboutGenerated" text,
  "location" text,
  "phone" text,
  "preferredCategories" text[] not null default '{}'::text[],
  "profileTags" text[] not null default '{}'::text[],
  "pronouns" text,
  "publicProfile" boolean not null default true,
  "radiusPreference" numeric not null default 5
);

create table if not exists public."HelpRequest" (
  "id" text primary key,
  "requesterId" text not null references public."User" ("id") on delete cascade,
  "title" text not null,
  "description" text not null,
  "summary" text,
  "category" text not null,
  "urgency" text not null,
  "location" jsonb,
  "status" text not null default 'PUBLISHED',
  "aiChecklist" jsonb,
  "aiRiskScore" numeric,
  "createdAt" timestamptz not null default timezone('utc', now()),
  "updatedAt" timestamptz not null default timezone('utc', now())
);

create table if not exists public."HelpOffer" (
  "id" text primary key,
  "helperId" text not null references public."User" ("id") on delete cascade,
  "requestId" text not null references public."HelpRequest" ("id") on delete cascade,
  "message" text not null,
  "status" text not null default 'PENDING',
  "createdAt" timestamptz not null default timezone('utc', now()),
  "updatedAt" timestamptz not null default timezone('utc', now())
);

create table if not exists public."Chat" (
  "id" text primary key,
  "requestId" text not null references public."HelpRequest" ("id") on delete cascade,
  "helperId" text not null references public."User" ("id") on delete cascade,
  "requesterId" text not null references public."User" ("id") on delete cascade,
  "consentLevel" text not null default 'OFF',
  "createdAt" timestamptz not null default timezone('utc', now()),
  "updatedAt" timestamptz not null default timezone('utc', now())
);

create table if not exists public."Message" (
  "id" text primary key,
  "chatId" text not null references public."Chat" ("id") on delete cascade,
  "authorId" text not null references public."User" ("id") on delete cascade,
  "content" text not null,
  "aiRewrite" text,
  "createdAt" timestamptz not null default timezone('utc', now())
);

create table if not exists public."Rating" (
  "id" text primary key,
  "score" numeric not null,
  "feedback" text,
  "helperId" text not null references public."User" ("id") on delete cascade,
  "requesterId" text not null references public."User" ("id") on delete cascade,
  "requestId" text not null references public."HelpRequest" ("id") on delete cascade,
  "createdAt" timestamptz not null default timezone('utc', now())
);

create table if not exists public."Verification" (
  "id" text primary key,
  "userId" text not null references public."User" ("id") on delete cascade,
  "type" text not null,
  "status" text not null default 'PENDING',
  "metadata" jsonb,
  "createdAt" timestamptz not null default timezone('utc', now()),
  "updatedAt" timestamptz not null default timezone('utc', now())
);

create table if not exists public."ModerationLog" (
  "id" text primary key,
  "entityType" text not null,
  "entityId" text not null,
  "action" text not null,
  "notes" text,
  "createdAt" timestamptz not null default timezone('utc', now()),
  "reviewedBy" text references public."User" ("id"),
  "metadata" jsonb
);

create index if not exists help_request_requester_idx on public."HelpRequest" ("requesterId");
create index if not exists help_request_status_idx on public."HelpRequest" ("status");
create index if not exists help_offer_request_idx on public."HelpOffer" ("requestId");
create index if not exists help_offer_helper_idx on public."HelpOffer" ("helperId");
create index if not exists help_chat_request_idx on public."Chat" ("requestId");
create index if not exists help_message_chat_idx on public."Message" ("chatId");
create index if not exists help_rating_helper_idx on public."Rating" ("helperId");
create index if not exists help_verification_status_idx on public."Verification" ("status");
create index if not exists help_moderation_entity_idx on public."ModerationLog" ("entityType", "entityId");

alter table public."User" enable row level security;
alter table public."HelpRequest" enable row level security;
alter table public."HelpOffer" enable row level security;
alter table public."Chat" enable row level security;
alter table public."Message" enable row level security;
alter table public."Rating" enable row level security;
alter table public."Verification" enable row level security;
alter table public."ModerationLog" enable row level security;

drop policy if exists "service role full access User" on public."User";
create policy "service role full access User"
  on public."User"
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop policy if exists "service role full access HelpRequest" on public."HelpRequest";
create policy "service role full access HelpRequest"
  on public."HelpRequest"
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop policy if exists "service role full access HelpOffer" on public."HelpOffer";
create policy "service role full access HelpOffer"
  on public."HelpOffer"
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop policy if exists "service role full access Chat" on public."Chat";
create policy "service role full access Chat"
  on public."Chat"
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop policy if exists "service role full access Message" on public."Message";
create policy "service role full access Message"
  on public."Message"
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop policy if exists "service role full access Rating" on public."Rating";
create policy "service role full access Rating"
  on public."Rating"
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop policy if exists "service role full access Verification" on public."Verification";
create policy "service role full access Verification"
  on public."Verification"
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop policy if exists "service role full access ModerationLog" on public."ModerationLog";
create policy "service role full access ModerationLog"
  on public."ModerationLog"
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
