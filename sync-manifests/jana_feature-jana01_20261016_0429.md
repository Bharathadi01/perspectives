# Sync Manifest: Profile-first core loop (feature/jana01)

- **Author / Agent:** Jana / Claude Code (Sonnet for docs, Opus for the build)
- **Branch:** feature/jana01
- **Date & Time:** 2026-10-16T04:29+05:30
- **Base Commit:** f44ebce (main)

## 1. Summary of Changes
Rewrote the product docs around the product owner's decisions (profile-first posts, daily give-to-get with a boost slot, open Connect gated by a perspective, verified adults only), then rebuilt the skeleton on them. The API now runs on PostgreSQL with real auth, the business rules live in tested pure functions, the in-memory mock client is replaced by a typed HTTP client, and the mobile app has a temporary Hinge-style UI for the whole core loop.

## 2. Modified & Created Files
- `docs/*`, `perspective-context/*`, `CLAUDE.md`, `README.md`, `jana_claude.md`: product rules, ADR-006 to ADR-012, implemented endpoints and tables, current state, assumptions to confirm.
- `packages/contracts/src/*`: replaced every legacy schema (requests, structured responses, `ConnectionMode`) with profiles, posts, perspectives, daily status, connect, chat, safety, error codes.
- `packages/api-client/src/client.ts`: new typed HTTP client (replaces `mockClient.ts`, `fixtures.ts`, `interfaces.ts`).
- `packages/design-tokens/src/{colors,radius}.ts`: added interim tokens (border, surfaceMuted, brandSoft, tabBar, scrims, media radius, icon button sizes).
- `apps/api/src/**`: new modules auth, profiles (with posts), media, daily, explore, perspectives, connect, safety, social, moderation; `domain/*` business rules; guard, idempotency interceptor, error filter, Zod pipe, config.
- `apps/api/prisma/*`: new schema, first migration, seed script, generated placeholder media.
- `apps/api/test/{unit,e2e}/*`: domain unit tests and end-to-end tests.
- `apps/mobile/app/**`, `apps/mobile/src/**`: every screen and component rewritten; legacy components removed.
- `.env.example`, `.gitignore`, `package.json` (root scripts `test:e2e`, `db:migrate`, `db:seed`).

## 3. Database & Schema Changes
- **Prisma Schema Modified:** Yes (replaced wholesale; no migrations existed before).
- **New Tables:** users, refresh_tokens, profiles, media, posts, perspectives, daily_progress, daily_assignments, profile_skips, connect_requests, connections, messages, blocks, reports, idempotency_keys, deletion_jobs.
- **New Columns Added:** n/a (first migration).
- **Migration Name:** `20261016000000_core_loop_jana_init`. From now on, schema changes are additive only.

## 4. Contract & API Impact
- **New Endpoints:** see `docs/API_CONTRACTS.md` → Endpoints (implemented).
- **DTO Updates:** all of `@perspective/contracts` (see section 2).
- **Breaking Changes:** Yes, intentionally. The skeleton's endpoints, types, and in-memory client were removed. Nothing outside this repo depended on them.

## 5. UI & Design System Adherence
- [x] All colors imported from `@perspective/design-tokens` (via `apps/mobile/src/theme`)
- [x] Minimum 48px touch targets preserved
- [x] Reused shared components (`src/components/ui`, `profile`, `perspective`, `forms`)
- Interim Hinge-like layout per ADR-011; no Hinge assets, names, or logos.

## 6. Verification & Test Evidence
- [x] `pnpm build` succeeded (tokens, contracts, api-client, api)
- [x] `pnpm typecheck` succeeded (all 5 packages, strict mode)
- [x] `pnpm test`: 45 passing (contracts 14, api domain 19, api-client 6, mobile 6)
- [x] `pnpm test:e2e`: 17 passing against PostgreSQL 16
- [x] Swagger served at `/docs`
- [x] Mobile web verified in headless Chrome: sign in, locked inbox, giving the daily set, unlock, accepting a connect request, chat, owner-initiated connect, decline and cooldown, new-user signup and onboarding with photo uploads. No page or console errors.
- [ ] Not verified on a physical phone (no Xcode; Expo Go not tried). Audio recording was not exercised in the browser run.

## 7. Potential Overlap / Conflict Warning
Every shared file changed: `schema.prisma` and the migration, `packages/contracts`, `packages/api-client`, `packages/design-tokens`, `pnpm-lock.yaml`, `CLAUDE.md`, `.env.example`, all `docs/`. Anyone branching from `main` before this merges should rebase onto it rather than merge; the old skeleton code no longer exists.

## 8. Addendum: stack reconciliation (docs only)
README, CLAUDE.md (both copies), `perspective-context/README.md`, `docs/ARCHITECTURE.md`, `docs/BLUEPRINT.md`, `docs/DECISIONS.md` (ADR-013, ADR-012 accepted), and `jana_claude.md` now point to one stack table in `docs/ARCHITECTURE.md`. `docker-compose.yml` only gained a comment; the Redis service is still there, unused. No code changed.
