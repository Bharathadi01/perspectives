# Perspective Engineering Context

## Product
Perspective is an 18+ app where selfie-verified users give each other honest, text-only perspectives on how they look, dress, sound, and show up, and can then connect. It is a dating app at its core with a unique hook (perspectives), marketed perspectives-first and not as "a dating app." The same open Connect also serves friends, gym buddies, and networking.

The canonical business rules are in `docs/PRODUCT.md`. If any other doc, comment, or the current skeleton disagrees with it, `docs/PRODUCT.md` wins. In brief: a profile has basics plus 1 to 6 posts (photo or 15-second audio plus a prompt or question). Each day a user gives perspectives on a mandatory set of profiles (default 3, including one boost slot for a low-response profile) to unlock the perspectives they received. A user may ask to connect only after giving the other person a perspective; the other person accepts or declines; chat opens only on accept.

Hinge is a structural UX reference: deep profiles of photos and prompts, audio prompts, one-profile-at-a-time discovery, responding to a specific element, incoming review, mutual consent before chat, and private outcome feedback. Never copy Hinge assets, strings, iconography, brand, visual identity, screenshots, animations, or pixel layouts.

## Product rules
- A perspective is subjective; never present it as objective truth.
- Written context is more important than a numeric score.
- No public attractiveness scoring, leaderboards, public follower counts, or public comments. A perspective is visible only to the post owner and the giver.
- Perspectives are text-only, honest, and unfiltered. Criticism is allowed; body shaming, abuse, and sexual content are not.
- No nudity or sexual content. Shirtless, gym, and swimwear photos are allowed.
- Connect is open. There are no connection intents, modes, or labels (no "date," "friends," "networking" tags).
- A user may ask to connect only after giving the other person a perspective. The other person accepts or declines. Chat opens only after accept. After a decline, the same sender cannot send another request to that person for 14 days (configurable).
- Only selfie-verified, 18+ users have an active profile.
- Audience (gender and age range) is set at profile level. Users are never forced to see profiles outside their own filters, blocks, or mutes.
- No profile should be left without perspectives; the daily assignment must push low-response profiles to others.
- Caps (connects per day, perspectives received per profile per day) are config values that default to unlimited until tuned.
- Safety features are P0: moderation, report, block, age gate, selfie verification, contact information, and in-app account deletion.
- Optimize helpful perspectives and meaningful connections, not time spent.
- Precise location, phone, email, birthday, moderation notes, verification media, and private settings must never appear in public DTOs.

## Building on the skeleton (read before coding)
The repo is a working skeleton of an earlier version of the product. Its shell and infrastructure are worth keeping; its business logic is not trusted. Build the product in `docs/PRODUCT.md` on top of it.
- **Remove or replace legacy code; do not adapt or preserve it.** Anything that does not serve `docs/PRODUCT.md` goes: types, enums, contracts, fixtures and mock data, services, controllers, routes, screens, components, Prisma models, and the tests that assert old behavior. Examples: `ConnectionMode` and every intent picker, structured responses (first impression, reason, suggestion, tags, tone), lens-based qualification and ranking, standalone request expiry. No dead code, compatibility shims, deprecated aliases, or "legacy" branches.
- **Keep what is still relevant:** the monorepo wiring, design tokens and theme, generic atoms (buttons, EmptyState, banners, safety menu), the Expo Router shell, the NestJS bootstrap, the error filter and the typed client boundary. Rework the auth guard and the in-memory clients, which are stubs.
- **Work in vertical slices** in the order in `docs/DEVELOPMENT_PLAN.md`, deleting the legacy code each slice replaces. Keep build, typecheck, and tests green after every slice. Delete tests for removed behavior and write tests for the new rules (the connect gate, the 14-day cooldown, the daily unlock, the boost slot, selfie-verified access).
- **Authorized for this work:** replacing `packages/contracts`, the Prisma schema, `packages/api-client`, and the mobile screens and components. No migrations exist yet, so the skeleton schema may be replaced wholesale; once the first migration is created, the additive-only rules in `jana_claude.md` apply. Adding a dependency is allowed when a `docs/PRODUCT.md` feature needs one (for example audio recording and playback, image picking, camera for selfie verification); pick Expo-compatible libraries, add them deliberately, and list them in the final report.
- **Do not invent business rules.** If `docs/PRODUCT.md` does not decide something, stop and ask the product owner (Jana).
- **Baseline on 2026-10-16:** `pnpm install --frozen-lockfile`, `pnpm build`, `pnpm typecheck`, and `pnpm test` all passed (16 tests). Re-check before starting.

## Stack
- React Native + TypeScript + Expo Development Builds
- Expo Router for navigation
- TanStack Query for server state; Zustand for minimal client state
- React Hook Form + Zod for forms and runtime validation
- NestJS + TypeScript modular monolith with REST/OpenAPI and Socket.IO gateways
- Prisma + PostgreSQL + pgvector
- Redis + BullMQ
- S3-compatible storage or Cloudinary; use one canonical provider in v1
- Python + FastAPI for isolated AI/ML, LLM, embeddings, moderation, and vision workloads
- Docker Compose for local PostgreSQL, Redis, API, workers, and AI service

## Architecture
Use these boundaries:
- mobile presentation: Expo Router screens, feature components, hooks, typed API client
- NestJS application: controllers/gateways, DTO validation, use-case services, domain events
- infrastructure: Prisma repositories, Redis/BullMQ adapters, storage adapter, push adapter
- FastAPI: model adapters and inference endpoints only; it does not authorize users or commit state

React components must not call storage, PostgreSQL, Redis, or AI providers directly.

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
- Use short-lived JWT access tokens, rotating hashed refresh tokens, Redis-backed rate limits.
- Use signed, short-lived media uploads; strip EXIF and do not expose permanent public download URLs.
- AI/ML outputs are untrusted inputs that NestJS must validate before changing canonical state.
- Analytics must never contain UGC text, message text, phone, email, exact birthday, or raw moderation evidence.

## Testing
- Unit-test domain logic and controller/view-model state transitions.
- Test loading, content, empty, error, and accessibility behavior.
- Test authorization: allow, deny, owner, non-owner, blocked, suspended.
- Integration tests for critical cross-feature paths.
