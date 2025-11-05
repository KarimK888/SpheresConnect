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

## Getting Started

```bash
npm install
cp .env.example .env.local
# fill in your keys
npm run dev
```

By default the app uses the in-memory backend. Set `NEXT_PUBLIC_BACKEND=supabase` to run against Supabase using the schema provided in `supabase/migrations`.

## Environment Variables

See `.env.example` for the complete list. At minimum configure:

- `NEXT_PUBLIC_BACKEND` — choose `fire` or `supabase`
- `NEXT_PUBLIC_MAPBOX_TOKEN` — Mapbox public token for hub map
- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY`
- `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` — Stripe test keys

Add the Firebase keys (`FIREBASE_*`) only if you plan to wire that provider.

## Available Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start Next.js dev server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | ESLint across the repo |
| `npm run typecheck` | TypeScript project check |
| `npm run test` | Vitest placeholder suite |
| `npm run seed` | Prints sample data counts (hook into your DB of choice) |

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

## Data & Seeding

Sample data lives in `src/lib/sample-data.ts` (users, artworks, hubs, check-ins, events, rewards, chats). Run `npm run seed` to print counts or adapt the script to push into Firebase/Supabase.

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

1. Create a Supabase project and run the SQL in `supabase/migrations/001_create_messaging.sql`.
2. Set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`.
3. Set `NEXT_PUBLIC_BACKEND=supabase` and restart `npm run dev`.
4. (Optional) Extend the supplied schema/rules for storage, hubs, marketplace, etc.

## Testing

- Unit/integration stubs: Vitest config ready – extend with schema tests and API route checks.
- E2E: Add Playwright to cover onboarding → match → message → marketplace → rewards once APIs are wired.
- Accessibility: Use `@axe-core/playwright` or similar for WCAG 2.2 AA benchmarking.

## Roadmap Notes

- Harden Supabase integration (storage uploads, hubs, marketplace, events, rewards) or swap in Firebase as needed.
- Expand moderation/admin tooling beyond the verification queue.
- Integrate Genkit or preferred AI provider for matching, translation, and tagging.
- Harden security (JWT sessions, rate limiting, CSRF) once moving beyond prototype.
