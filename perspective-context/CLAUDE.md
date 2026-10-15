# Perspective Agent Contract

## Product
Perspective is an 18+ app where selfie-verified users give each other honest, text-only perspectives on how they look, dress, sound, and show up, and can then connect. It is a dating app at its core with a unique hook (perspectives), marketed perspectives-first and not as "a dating app." Open Connect also serves friends, gym buddies, and networking.

The canonical business rules are in `docs/PRODUCT.md`, which wins over any other doc. In brief: a profile has basics plus 1 to 6 posts (photo or 15-second audio plus a prompt or question). Each day a user gives perspectives on a mandatory set of profiles (default 3, including one boost slot for a low-response profile) to unlock the perspectives they received. Connect is open, with no intents, modes, or labels. A user may ask to connect only after giving the other person a perspective; the other person accepts or declines; chat opens only on accept. No nudity or sexual content (shirtless, gym, and swimwear photos are allowed). Perspectives are visible only to the post owner and the giver.

Hinge is the UI and structural reference. For the initial development phase, the UI should look and feel similar to Hinge: the same overall layout patterns, structure, and interaction model (deep profiles of photos and prompts, audio prompts, one-profile-at-a-time discovery, responding to a specific element, incoming review, mutual consent before chat, private outcome feedback). This is a temporary placeholder. The product owner will redesign the UI to Perspective's own look once all logic and algorithms are done, so keep UI code componentized and put styling in design tokens so the redesign is mostly a restyle. Limits that stay: never use Hinge's name or logo, never claim any affiliation, and never copy actual Hinge files (images, screenshots used as assets, exported icons, fonts, sounds, animation files). Write Perspective's own copy and use our own tokens. The Hinge-like UI must be replaced with Perspective's own design before any public release or store submission.

## Building on the skeleton (read before coding)
The repo is a working skeleton of an earlier version of the product. Its shell and infrastructure are worth keeping; its business logic is not trusted. Build the product in `docs/PRODUCT.md` on top of it.
- **Remove or replace legacy code; do not adapt or preserve it.** Anything that does not serve `docs/PRODUCT.md` goes: types, enums, contracts, fixtures and mock data, services, controllers, routes, screens, components, Prisma models, and the tests that assert old behavior. Examples: `ConnectionMode` and every intent picker, structured responses (first impression, reason, suggestion, tags, tone), lens-based qualification and ranking, standalone request expiry. No dead code, compatibility shims, deprecated aliases, or "legacy" branches.
- **Keep what is still relevant:** the monorepo wiring, design tokens and theme, generic atoms (buttons, EmptyState, banners, safety menu), the Expo Router shell, the NestJS bootstrap, the error filter and the typed client boundary. Rework the auth guard and the in-memory clients, which are stubs.
- **Work in vertical slices** in the order in `docs/DEVELOPMENT_PLAN.md`, deleting the legacy code each slice replaces. Keep build, typecheck, and tests green after every slice. Delete tests for removed behavior and write tests for the new rules (the connect gate, the 14-day cooldown, the daily unlock, the boost slot, selfie-verified access).
- **Authorized for this work:** replacing `packages/contracts`, the Prisma schema, `packages/api-client`, and the mobile screens and components. No migrations exist yet, so the skeleton schema may be replaced wholesale; once the first migration is created, the additive-only rules in `jana_claude.md` apply. Adding a dependency is allowed when a `docs/PRODUCT.md` feature needs one (for example audio recording and playback, image picking, camera for selfie verification); pick Expo-compatible libraries, add them deliberately, and list them in the final report.
- **Do not invent business rules.** If `docs/PRODUCT.md` does not decide something, stop and ask the product owner (Jana).
- **Baseline on 2026-10-16:** `pnpm install --frozen-lockfile`, `pnpm build`, `pnpm typecheck`, and `pnpm test` all passed (16 tests). Re-check before starting.

## Authoritative v1 stack
- React Native, Expo Development Builds, TypeScript, Expo Router
- TanStack Query; React Hook Form + Zod; minimal Zustand
- NestJS modular monolith, TypeScript, REST/OpenAPI, Socket.IO when chat ships
- PostgreSQL + Prisma
- Cloudinary for signed upload, transformation, delivery, and media workflow
- pg-boss/PostgreSQL for durable background jobs
- pnpm workspaces

Deferred unless an approved ADR activates them: Redis, BullMQ, FastAPI, Python ML, active pgvector recommendations, S3, microservices, Turborepo, or extra AI SDKs.

## Required reading
Before coding, read `docs/PRODUCT.md`, `docs/ARCHITECTURE.md`, and the relevant domain document. Read `docs/DATABASE.md` for schema work, `docs/API_CONTRACTS.md` for network work, `docs/SECURITY.md` for user/data operations, `docs/DESIGN_SYSTEM.md` for UI, and `docs/COLLABORATION.md` before changing shared files.

## Hard boundaries
- Mobile components never call PostgreSQL, Cloudinary, or AI providers directly.
- NestJS is the authorization and business-policy boundary.
- PostgreSQL is canonical. Caches and queues are never canonical.
- Never serialize Prisma entities directly to clients; use explicit response DTOs.
- Every endpoint/event checks authentication, object authorization, account state, block state, eligibility, and quota where relevant.
- AI and moderation outputs are untrusted inputs; validate before committing state.
- Do not add a dependency, environment variable, enum, endpoint, table, or shared component without task authorization.
- Do not modify Prisma schema/migrations, generated API client, design tokens, lockfile, CI, or this file outside an explicitly assigned task.
- No public numeric attractiveness scores, public comments, follower counts, popularity leaderboards, or anonymous responses.

## Task workflow
1. Restate acceptance criteria.
2. List files to change and files intentionally untouched.
3. Identify contract, schema, security, design, analytics, and migration impact.
4. Stop if a required decision is missing; do not invent one.
5. Implement the smallest complete vertical slice.
6. Run formatting, lint, typecheck, and targeted tests.
7. Return changed files, commands/results, assumptions, risks, and follow-up work.
8. Stop when assigned scope is complete.
