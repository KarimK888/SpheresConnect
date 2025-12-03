# SpheraConnect

SpheraConnect is a hybrid ecosystem where artists and buyers connect, collaborate, and transact. The scaffold covers authentication, professional profiles, hub map presence, AI-assisted matching, messaging, marketplace, events, rewards, and an admin surface.

## Tech Stack

- **Frontend**: Next.js 15 (App Router), TypeScript, Tailwind CSS, shadcn-inspired UI
- **State**: React Context + Zustand stubs for session, theme, and i18n
- **Backend Abstraction**: Switchable Firebase/Supabase adapters via `NEXT_PUBLIC_BACKEND=fire|supabase`
- **Realtime & Storage**: In-memory mocks plus Supabase SQL schema and realtime channels
- **AI Flows**: Genkit-style stubs for smart matching, translation, auto-tagging, voice-to-text
- **Payments**: Stripe helpers plus webhook endpoint
- **Maps**: Mapbox GL JS
- **Auth & Security**: Supabase Auth + OAuth/OIDC, roles, optional gateway middleware

## Monorepo Layout

```
apps/
  web/         # Next.js app
  storybook/   # Storybook playground for shared UI
packages/
  ui/          # shared component library
  config/      # eslint/tailwind presets
  types/       # shared TypeScript contracts
```

## Getting Started

```bash
pnpm install
cp apps/web/.env.example apps/web/.env.local
# fill in your keys
pnpm dev --filter=web
```

By default the app uses the in-memory backend. Set `NEXT_PUBLIC_BACKEND=supabase` to run against Supabase using the schema provided in `supabase/migrations`.

## Environment Variables

See `.env.example` for the complete list. At minimum configure:

- `NEXT_PUBLIC_BACKEND` - choose `fire` or `supabase`
- `NEXT_PUBLIC_APP_URL` - base URL for invite links (defaults to `http://localhost:3000`)
- `NEXT_PUBLIC_MAPBOX_TOKEN` - Mapbox public token for hub map
- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET` (optional, defaults to `artwork-media`) for Supabase Storage uploads
- `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` - Stripe test keys
- `PROFILE_INVITE_SECRET` / `PROFILE_INVITE_TTL_MS` - signing secret + TTL for profile-invite tokens
- `RESEND_API_KEY` / `PROFILE_INVITE_FROM` - optional email delivery via Resend (logs to console if unset)
- `API_GATEWAY_SECRET` - optional shared secret required on mutating `/api` requests (header `x-spheraconnect-gateway`)

Add the Firebase keys (`FIREBASE_*`) only if you plan to wire that provider.

## Available Scripts

| Command | Description |
| --- | --- |
| `pnpm dev --filter=web` | Start Next.js dev server |
| `pnpm build --filter=web` | Production build |
| `pnpm start --filter=web` | Start production server |
| `pnpm lint --filter=web` | ESLint across the repo |
| `pnpm typecheck --filter=web` | TypeScript project check |
| `pnpm test --filter=web` | Vitest placeholder suite |
| `pnpm seed --filter=web` | Prints sample data counts (hook into your DB of choice) |
| `pnpm export:supabase --filter=web` | Emits SQL insert statements from `sample-data.ts` for Supabase seeding |
| `pnpm db:migrate` | Applies every SQL file in `apps/web/supabase/migrations` to your Supabase project |

## Stripe Webhook (Test Mode)

Run Stripe CLI to forward webhook events to the Next route:

```bash
stripe listen --events payment_intent.succeeded --forward-to localhost:3000/api/orders/stripe-webhook
```

The in-memory backend will mark orders as paid when the webhook fires.

## Feature Overview

- **Auth & Onboarding** – Email/password, OAuth stubs, create-profile wizard with file uploads
- **Profiles & Portfolio** – Public pages, dashboard for seller stats, sample listings & rewards
- **Hub Map & Presence** – Mapbox map with hubs + active check-ins, toggle online/offline
- **AI Smart Matching** – Swipe-style matcher powered by Genkit-style flow stub
- **Messaging** – Rich threads with reactions, polls, scheduled/silent sends, attachments, pinned messages
- **Marketplace** – Listings, seller dashboard, Stripe payment intent creation and webhook handler
- **Events & Rewards** – Event listings with RSVP patch, rewards summary with logs
- **Admin Panel** – Verification queue placeholder with stats surface
- **Offline-first & Sync** – Service worker + IndexedDB cache the hub map (hubs, check-ins, profiles, events, rewards) and a shared queue replays `/api/checkin`, `/api/rewards`, and `/api/orders*` mutations once connectivity returns.

## Data & Seeding

Sample data lives in `apps/web/src/lib/sample-data.ts` (users, artworks, hubs, check-ins, events, rewards, chats, match actions). Run `pnpm seed --filter=web` to print counts or adapt the script to push into Firebase/Supabase.

To bootstrap Supabase quickly, run:

```bash
npm run export:supabase > supabase-seed.sql
psql "$DATABASE_URL" -f supabase-seed.sql
```

The generated SQL upserts into `users`, `hubs`, `artworks`, `events`, `checkins`, `rewards`, and `match_actions`. Tweak the script if you only want specific tables.

Keep your schema current with the bundled migrations:

```bash
pnpm db:migrate      # runs supabase migration up inside apps/web
```

Each run picks up the next file under `apps/web/supabase/migrations`, so version-control any local edits before applying them to staging/production.

### Offline-first architecture

- `packages/offline` exposes a shared IndexedDB helper used by the web app (and reusable for native clients). It keeps mirrored object stores for `checkins`, `events`, `hubs`, `profiles`, `rewards`, plus a lightweight mutation queue.
- A service worker (`apps/web/public/sw.js`) caches the Next.js shell and API GET calls so hub map + workspace pages open instantly when returning to the app.
- `useCheckin`, the hub map gate, rewards UI, and marketplace checkout now hydrate from the cache, enqueue mutations when the browser is offline, and listen for the sync hook (`useOfflineSync`) to refresh data after replay.
- `/api/checkin`, `/api/rewards`, `/api/orders`, and `/api/orders/confirm` requests are added to the queue automatically when offline so users can continue working. The hook flushes them when the browser regains connectivity and emits a client event to refresh live queries.

## Deploying

### Web (Vercel)

1. Create a Vercel project and connect the repository.
2. Set environment variables from `.env.example` in the Vercel dashboard.
3. Deploy – Vercel handles builds via `npm run build`.

### Firebase Backend

1. Wire `src/lib/firebase.ts` to initialize Firebase SDKs (Auth, Firestore, Functions, Storage).
2. Replace the in-memory adapter with live Firebase calls.
3. Deploy Firebase rules/functions using `firebase deploy`.

### Supabase Backend

1. Create a Supabase project and run the SQL migrations under `supabase/migrations` (apply them in order).
2. Set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`.
3. Set `NEXT_PUBLIC_BACKEND=supabase` and restart `npm run dev`.
4. (Optional) Extend the supplied schema/rules for storage, hubs, marketplace, etc.

### Supabase Match Actions Table

Migration `005_create_match_actions.sql` creates the `public.match_actions` table the matcher uses to store likes/skips and detect mutual matches. If you need to recreate it manually, use:

```sql
create table if not exists public.match_actions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (user_id) on delete cascade,
  target_id uuid not null references public.users (user_id) on delete cascade,
  action text not null check (action in ('connected','skipped')),
  created_at timestamptz not null default now()
);

alter table public.match_actions enable row level security;

create policy "match_actions_select_self"
  on public.match_actions
  for select
  using (auth.uid() = user_id);

create policy "match_actions_insert_self"
  on public.match_actions
  for insert
  with check (auth.uid() = user_id);
```

Grant your service role full access so the `/api/match/actions` route can issue writes server-side. After applying the migrations, seed Supabase (or load your real data) and run through signup → invite → create profile → hub map → matcher to verify likes, notifications, and messaging end-to-end.

## Testing & Release

- Automated commands and manual QA flows live in [`docs/testing.md`](./docs/testing.md).
- Unit/integration stubs: Vitest config ready – extend with schema tests and API route checks.
- E2E: Add Playwright to cover onboarding → match → message → marketplace → rewards once APIs are wired.
- Accessibility: Use `@axe-core/playwright` or similar for WCAG 2.2 AA benchmarking.

## Roadmap Notes

- Harden Supabase integration (storage uploads, hubs, marketplace, events, rewards) or swap in Firebase as needed.
- Expand moderation/admin tooling beyond the verification queue.
- Integrate Genkit or preferred AI provider for matching, translation, and tagging.
- Harden security (JWT sessions, rate limiting, CSRF) once moving beyond prototype.
- **Auth & Security**
  - Supabase Auth with OAuth/OIDC providers (Google, Apple, GitHub)
  - Users carry roles (member, moderator, admin) surfaced via shared RBAC helpers
  - Sensitive API routes use `requireApiRole(...)` and the optional gateway middleware enforces `API_GATEWAY_SECRET` on write requests
