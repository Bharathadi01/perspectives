# Perspective Agent Contract

## Product
Perspective is an 18+ app where selfie-verified users give each other honest, text-only perspectives on how they look, dress, sound, and show up, and can then connect. It is a dating app at its core with a unique hook (perspectives), marketed perspectives-first and not as "a dating app." Open Connect also serves friends, gym buddies, and networking.

The canonical business rules are in `docs/PRODUCT.md`, which wins over any other doc. In brief: a profile has basics plus 1 to 6 posts (photo or 15-second audio plus a prompt or question). Each day a user gives perspectives on a mandatory set of up to 3 profiles (one may be a boost slot for an active person who has had no perspectives in 3 days) to unlock the perspectives they received. Connect is open, with no intents, modes, or labels; the private onboarding goal ("Get perspectives" and/or "Meet new people") only changes matching. One audience setting is used both ways. Automatic steps only put a profile on hold; an admin decides every ban (decided 2026-10-20, see `docs/PRODUCT.md`). A user may ask to connect only after giving the other person a perspective; the other person gives one back to accept, or declines; chat opens only on accept. No nudity or sexual content (shirtless, gym, and swimwear photos are allowed). Perspectives are visible only to the post owner and the giver.

Hinge is the UI and structural reference. For the initial development phase, the UI should look and feel similar to Hinge: the same overall layout patterns, structure, and interaction model (deep profiles of photos and prompts, audio prompts, one-profile-at-a-time discovery, responding to a specific element, incoming review, mutual consent before chat, private outcome feedback). This is a temporary placeholder. The product owner will redesign the UI to Perspective's own look once all logic and algorithms are done, so keep UI code componentized and put styling in design tokens so the redesign is mostly a restyle. Limits that stay: never use Hinge's name or logo, never claim any affiliation, and never copy actual Hinge files (images, screenshots used as assets, exported icons, fonts, sounds, animation files). Write Perspective's own copy and use our own tokens. The Hinge-like UI must be replaced with Perspective's own design before any public release or store submission.

## Current state and how to continue (read before coding)
The core loop in `docs/PRODUCT.md` is implemented end to end (branch `feature/jana01`, 2026-10-16). The old skeleton logic is gone. See `docs/DEVELOPMENT_PLAN.md` for stubs and gaps, and ADR-012 for the v1 implementation choices.
- **Where the rules live:** business rules are pure functions in `apps/api/src/domain` (eligibility, daily set and unlock, assignment, ranking, connect gate) with unit tests; services in `apps/api/src/*` load data and call them. Change a rule there first, then its tests.
- **Contracts first:** types and validation live in `packages/contracts` (Zod). The API validates bodies with them; `packages/api-client` validates responses with them; mobile imports them. Rebuild contracts after editing.
- **Stubs:** selfie verification and text moderation (`apps/api/src/moderation/moderation.ts`) and local-disk media storage (`apps/api/src/media/media.storage.ts`). Replace the provider class, not the callers.
- **Schema:** the first migration exists, so schema changes are additive forward migrations only (`jana_claude.md` rule 4.2). Never edit an applied migration.
- **Do not reintroduce** connection intents or modes, relationship goals or dating intentions, structured responses, lens-based qualification, public scores or comments.
- **Do not invent business rules.** If `docs/PRODUCT.md` does not decide something, stop and ask the product owner (Jana). Assumptions already made are listed in `docs/PRODUCT.md` → Implementation assumptions.
- **Checks:** `pnpm build`, `pnpm typecheck`, `pnpm test` (unit), and `pnpm test:e2e` (needs PostgreSQL; see README). On 2026-10-20 all passed: 119 unit and 46 end-to-end tests.

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
The stack table in `docs/ARCHITECTURE.md` ("Stack: built now vs planned", ADR-013) is the single source. Built now: Expo SDK 58 + Expo Router, TanStack Query, React Hook Form + Zod, minimal Zustand; NestJS + TypeScript; PostgreSQL + Prisma; pnpm workspaces. Planned and activated by ADR: Cloudinary, pg-boss, Socket.IO, Redis/BullMQ, pgvector, FastAPI, Development Builds, S3.
- When you add, switch on, or replace a stack item (dependency, service, provider), update the stack table in `docs/ARCHITECTURE.md` and add or amend an ADR in the same change.

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
