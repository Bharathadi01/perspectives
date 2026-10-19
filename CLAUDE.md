# Perspective Engineering Context

## Product
Perspective is an 18+ app where selfie-verified users give each other honest, text-only perspectives on how they look, dress, sound, and show up, and can then connect. It is a dating app at its core with a unique hook (perspectives), marketed perspectives-first and not as "a dating app." The same open Connect also serves friends, gym buddies, and networking.

The canonical business rules are in `docs/PRODUCT.md`. If any other doc, comment, or the current skeleton disagrees with it, `docs/PRODUCT.md` wins. In brief: a profile has basics plus 1 to 6 posts (photo or 15-second audio plus a prompt or question). Each day a user gives perspectives on a mandatory set of up to 3 profiles (one may be a boost slot for an active person who has had no perspectives in 3 days) to unlock the perspectives they received. A user may ask to connect only after giving the other person a perspective; the other person gives one back to accept, or declines; chat opens only on accept.

Hinge is the UI and structural reference. For the initial development phase, the UI should look and feel similar to Hinge: the same overall layout patterns, structure, and interaction model (deep profiles of photos and prompts, audio prompts, one-profile-at-a-time discovery, responding to a specific element, incoming review, mutual consent before chat, private outcome feedback). This is a temporary placeholder. The product owner will redesign the UI to Perspective's own look once all logic and algorithms are done, so keep UI code componentized and put styling in design tokens so the redesign is mostly a restyle. Limits that stay: never use Hinge's name or logo, never claim any affiliation, and never copy actual Hinge files (images, screenshots used as assets, exported icons, fonts, sounds, animation files). Write Perspective's own copy and use our own tokens. The Hinge-like UI must be replaced with Perspective's own design before any public release or store submission.

## Product rules
- A perspective is subjective; never present it as objective truth.
- Written context is more important than a numeric score.
- No public attractiveness scoring, leaderboards, public follower counts, or public comments. A perspective is visible only to the post owner and the giver.
- Perspectives are text-only, honest, and unfiltered. Criticism is allowed; body shaming, abuse, and sexual content are not.
- No nudity or sexual content. Shirtless, gym, and swimwear photos are allowed.
- Connect is open. There are no connection intents, modes, or labels (no "date," "friends," "networking" tags). The private onboarding goal ("Get perspectives" and/or "Meet new people", decided 2026-10-20) only changes matching; it is never shown and never labels a person or a connection. The old "dating intention" and its dealbreaker are removed. Orientation is optional and private, and not used for matching during the beta.
- A user may ask to connect only after giving the other person a perspective. The other person gives one back to accept, or declines. Chat opens only after accept. After a decline, the same sender cannot send another request to that person for 14 days (configurable).
- Only selfie-verified, 18+ users have an active profile.
- Audience (gender and age range) is one setting at profile level, used both ways: two people see each other only when each is inside the other's audience. Users are never forced to see profiles outside their own filters, blocks, or mutes. The one exception is the automatic age widening (2 years at a time, at most 4 beyond their choice, never below 18, never by gender), always with a notice.
- No profile should be left without perspectives; the daily assignment must push low-response profiles to others.
- Caps are server config values. Beta values (decided 2026-10-20): 5 connect requests sent per day; a person who received 10 perspectives today stops being put into mandatory sets (soft: chosen perspectives and give-backs still go through); at most 6 mandatory sets per person per day.
- Safety features are P0: moderation, report, block, age gate, selfie verification, contact information, and in-app account deletion. Automatic steps only put a profile on hold; every ban is decided by an admin on the separate admin dashboard, and banned people can always appeal (`docs/PRODUCT.md` → Reports, holds and bans).
- Optimize helpful perspectives and meaningful connections, not time spent.
- Precise location, phone, email, birthday, moderation notes, verification media, and private settings must never appear in public DTOs.

## Current state and how to continue (read before coding)
The core loop in `docs/PRODUCT.md` is implemented end to end (branch `feature/jana01`, 2026-10-16). The old skeleton logic is gone. See `docs/DEVELOPMENT_PLAN.md` for stubs and gaps, and ADR-012 for the v1 implementation choices.
- **Where the rules live:** business rules are pure functions in `apps/api/src/domain` (eligibility, daily set and unlock, assignment, ranking, connect gate) with unit tests; services in `apps/api/src/*` load data and call them. Change a rule there first, then its tests.
- **Contracts first:** types and validation live in `packages/contracts` (Zod). The API validates bodies with them; `packages/api-client` validates responses with them; mobile imports them. Rebuild contracts after editing.
- **Stubs:** selfie verification and text moderation (`apps/api/src/moderation/moderation.ts`) and local-disk media storage (`apps/api/src/media/media.storage.ts`). Replace the provider class, not the callers.
- **Schema:** the first migration exists, so schema changes are additive forward migrations only (`jana_claude.md` rule 4.2). Never edit an applied migration.
- **Do not reintroduce** connection intents or modes, relationship goals or dating intentions, structured responses, lens-based qualification, public scores or comments.
- **Do not invent business rules.** If `docs/PRODUCT.md` does not decide something, stop and ask the product owner (Jana). Assumptions already made are listed in `docs/PRODUCT.md` → Implementation assumptions.
- **Checks:** `pnpm build`, `pnpm typecheck`, `pnpm test` (unit), and `pnpm test:e2e` (needs PostgreSQL; see README). On 2026-10-19 all passed: 106 unit and 27 end-to-end tests.

## Business logic document (MANDATORY after every change)
`business-logic/BUSINESS_LOGIC.md` explains, in plain words, everything the app does today: every screen flow, rule, number, error and edge case, plus what is fake or missing. The product owner reads it to know what is happening instead of asking.
- **After every successful build, feature, rule change or behavior-changing bug fix, update it in the same commit.** Not "later". A change is not finished until it is updated. This applies to every developer and every AI agent, whoever is working.
- Update the section that describes the behavior, the numbers table, the error table and the "fake or missing" list if they changed, add a dated entry at the top of its change log, and update "Last updated".
- It describes what is **built**, never what is planned. Keep the tags ([Built], [Placeholder], [Not built], [Conflict]) accurate. Write for a non-programmer.
- If your change disagrees with `docs/PRODUCT.md`, list it under the file's conflicts section and tell the product owner. Do not change `docs/PRODUCT.md` without approval.
- Before you finish any task, say in your report that you updated it (or why nothing needed updating).

## Working as two developers (read before every session)
- **Branches:** work on your own branch (`jana` or `bharath`). Never push to `main` or `dev` directly. Merge your branch into `dev` by pull request, and the other developer reviews it. `main` is updated from `dev` by pull request when `dev` is stable.
- **Start of every session:** make sure `git status` is clean, then `git pull origin dev`. After pulling, run `pnpm install`, `pnpm db:migrate`, and rebuild.
- **Migrations ship with the schema.** Every change to `apps/api/prisma/schema.prisma` must come with its migration folder in the same commit (`prisma migrate dev --name <task>_<developer>_<description>`). Never use `prisma db push` for work you commit. Never commit a schema change without a migration.
- **Do not change product rules on your own.** New profile fields, labels (for example relationship goals), matching factors, or renamed terms need a decision from Jana first (see `docs/PRODUCT.md`). If you think one is a good idea, write it up as a proposal and stop. Connect has no intents or labels. "Perspective" always means the feedback a giver writes on a post; the question attached to a post is called a "prompt" or "question".
- **Docs and code must agree.** If you change behavior, update the matching doc in the same change (`docs/PRODUCT.md` only after Jana confirms) and the `perspective-context/` copy.
- **Shared files:** `schema.prisma`, `packages/contracts/src/index.ts`, `packages/api-client/src/client.ts`, `apps/mobile/src/features/hooks.ts`, `pnpm-lock.yaml`. Add new files instead of editing old ones where you can, and add a row to `docs/ACTIVE_CHANGES.md` before touching `schema.prisma`. Never hand-merge the lockfile; run `pnpm install` after a merge.
- **Before you push:** `pnpm build`, `pnpm typecheck`, `pnpm test` and `pnpm test:e2e` pass, you updated `business-logic/BUSINESS_LOGIC.md`, and you wrote a sync manifest in `sync-manifests/`.
- **Build tips:** stop the API before rebuilding (a running API locks `apps/api/dist`). If `pnpm build` is killed for lack of memory, run `pnpm -r --workspace-concurrency=1 run build`.

## Stack
The stack table in `docs/ARCHITECTURE.md` ("Stack: built now vs planned", ADR-013) is the single source. Built now: Expo SDK 58 + Expo Router, TanStack Query, Zustand, React Hook Form + Zod; NestJS + Prisma + PostgreSQL; Zod contracts; pnpm workspaces. Planned and not built: Cloudinary, pg-boss, Socket.IO, Redis/BullMQ, pgvector, FastAPI, Development Builds. Choose from this stack, and say so when you see a better alternative.
- When you add, switch on, or replace a stack item (dependency, service, provider), update the stack table in `docs/ARCHITECTURE.md` and add or amend an ADR in the same change.

## Architecture
Use these boundaries:
- mobile presentation: Expo Router screens, feature components, hooks, typed API client
- NestJS application: controllers/gateways, DTO validation, use-case services, domain events
- infrastructure: Prisma repositories, storage adapter, and later job, cache, and push adapters
- FastAPI (planned, not wired): model adapters and inference endpoints only; it does not authorize users or commit state

React components must not call storage, PostgreSQL, or AI providers directly.

## Code quality
- Null-safe, formatted, analyzer-clean code.
- Prefer small composable widgets and typed domain models.
- No `dynamic` or `any` unless interacting with an untyped boundary and immediately validating.
- No secrets, API keys, or service-account material in source control.
- Use server timestamps for canonical times.
- Every mutation needs loading, success, retry-safe error handling, and idempotency key.
- Never swallow exceptions. Map infrastructure failures to typed app failures and log.
- Avoid speculative abstractions; implement the smallest clean boundary that supports the feature.

## UI
- Warm editorial design, accessible contrast, calm motion, large question typography.
- Minimum 44–48px tap targets.
- Support screen readers, dynamic text, reduced motion, dark mode, loading/empty/error states.
- Use design tokens from `@perspective/design-tokens`, never scattered raw colors, spacing, or radii.

## Security
- Default-deny NestJS routes and WebSocket events, with explicit guards and policy checks.
- Enforce ownership, participant membership, account status, block state, eligibility.
- Use short-lived JWT access tokens, rotating hashed refresh tokens, and rate limits (not built yet; see ARCHITECTURE.md).
- Use signed, short-lived media uploads; strip EXIF and do not expose permanent public download URLs.
- AI/ML outputs are untrusted inputs that NestJS must validate before changing canonical state.
- Analytics must never contain UGC text, message text, phone, email, exact birthday, or raw moderation evidence.

## Testing
- Unit-test domain logic and controller/view-model state transitions.
- Test loading, content, empty, error, and accessibility behavior.
- Test authorization: allow, deny, owner, non-owner, blocked, suspended.
- Integration tests for critical cross-feature paths.
