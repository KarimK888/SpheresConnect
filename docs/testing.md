# Testing & Release Prep

This checklist keeps the workspace ready for release. Run through the automated commands before hand testing. If any step fails, fix the regressions before shipping.

## Automated suite

```bash
pnpm install
pnpm lint --filter=@spheresconnect/web
pnpm test --filter=@spheresconnect/web     # optional until more Vitest suites land
pnpm build --filter=@spheresconnect/web    # validates Next.js + service worker bundles
```

## Manual QA

1. **Auth**
   - Email/password signup + login, OAuth redirect (Google/GitHub/Apple), password reset flow.
2. **Hub map**
   - Toggle presence, verify check-ins update in real time and that the hourly chart/active hubs list reflects the latest data.
   - Turn Wi‑Fi off, perform a check-in, then go back online and confirm it syncs + rewards update.
3. **Rewards**
   - Create reward entries (bonus, redeem, transfer). While offline, submit another entry and confirm it queues then syncs.
4. **Marketplace checkout**
   - Start checkout, confirm payment, and ensure the order detail page shows the updated status; repeat once offline to verify queuing.
5. **Events & invites**
   - Schedule/edit/delete an event, export the hub CSV, and copy an invite link.
6. **Mobile and tablet**
   - Use dev tools device emulation to confirm the new mobile action sheet, sticky presence controls, and scrollable hub cards behave correctly.

## Release checklist

- [ ] Supabase migrations applied via `pnpm db:migrate`.
- [ ] Service worker (`/sw.js`) bumped if caching logic changed.
- [ ] Environment variables verified (Supabase keys, Mapbox token, Stripe secrets).
- [ ] Storybook/marketing collateral updated if UI shifted.
- [ ] Production smoke test: login → hub map → rewards → checkout.

## QA log

- Manual verification (hub map → rewards) – Checked check-in flow with Supabase rewards auto-award (online/offline), ensured balances update instantly in the workspace and persist after navigation.
- Marketplace checkout – Started checkout, confirmed payment, then retried offline to ensure the order + confirmation queue flush when back online.
