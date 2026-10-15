# Development Plan

Two developers, both working across the whole stack. Business rules are in `PRODUCT.md`. The phases below describe the product slices; who builds which slice is decided per task and declared in `ACTIVE_CHANGES.md`.

## Where the skeleton is now
A mock-backed skeleton exists. Mobile calls `InMemoryPerspectiveClient` directly, each NestJS service wraps its own separate in-memory client, the Prisma schema is not used, and auth is a stub. The skeleton reflects an earlier product (standalone requests, structured responses, intent-matched connections). The list below is what has to change to reach the product in `PRODUCT.md`.

## Skeleton to target: what changes
**Contracts (`packages/contracts`)**
- Remove `ConnectionMode` and every use of it: `allowedConnectionModes`, `allowsConnection`, `connectionIntent`, `connectionModes` on profiles, `MUTUAL_INTENT_REQUIRED`.
- Profile: add gender, height, orientation/preference, birthdate-derived age, selfie-verification status, and profile-level audience (gender and age range). Lenses and helpfulness tiers are not part of the core model.
- Replace the request with a post (photo or audio, prompt, category, focus areas); a profile holds 1 to 6; audio is at most 15 seconds.
- Replace the structured response (first impression, reason, suggestion, tags, tone) with: required comment, optional quick-pick chips, text only.
- Add connect requests (sender, receiver, attached perspective, status, cooldown) and the daily assignment and unlock types.
- Update the error codes to match `API_CONTRACTS.md`.

**API (`apps/api`)**
- Real persistence in place of the per-service in-memory clients, and real authentication in place of the default `usr_me_001`.
- Daily assignment, boost slot, mandatory count, and unlock logic.
- The connect gate (must have given a perspective first), accept/decline, 14-day cooldown.
- Selfie verification, audio upload, and moderation before delivery.
- Config values for caps (connects per day, perspectives received per profile per day), defaulting to unlimited.
- Replace the placeholder ranking formula with the three algorithms in `PRODUCT.md`.

**Mobile (`apps/mobile`)**
- Profile creation flow: selfie verification, basics, primary post with photo, audience.
- Profile with up to six posts, audio recording and playback, and a profile view for givers.
- Explore built around the mandatory set; locked Inbox until the daily unlock; incoming connect requests.
- Perspective composer with required comment, optional chips, and per-post spark hints.
- Replace `ConnectionIntentSheet` and the intent pickers in onboarding and Create with the open Connect flow.
- Skeleton screens use some raw hex colors that must move to design tokens.

## Phase 0 — Validate
Prototype and user tests of the profile, give, and connect loop. Threat model and data map. Narrow launch community. Exit: profiles reliably receive useful perspectives, and people keep giving.

## Phase 1 — Foundation
Expo shell, routing, tokens and components, accessibility, auth, NestJS bootstrap, config validation, PostgreSQL/Prisma, OpenAPI, test containers, CI, errors, environments, logging, agent docs.

## Phase 2 — Profile and posts
Selfie verification, profile basics, audience, posts with photo and 15-second audio, signed media, moderation state, activation, migrations.

## Phase 3 — Explore, daily give, and perspectives
Eligibility, the three algorithms (feed ranking, daily assignment with boost slot, mandatory count), impressions and skips, perspective composer with spark hints, comment moderation before delivery, daily unlock, Inbox, helpful feedback, zero-response metrics.

## Phase 4 — Connect and chat
The connect gate, giver-initiated and owner-initiated requests, accept/decline, 14-day cooldown, connections list, chat, notifications and deep links, block enforcement, rate limits, concurrency tests.

## Phase 5 — Safety and beta
Report UX, policy education, account controls, accessibility audit, instrumentation, moderation operations, enforcement and audits, deletion, backups, monitoring, runbooks. A 100–200-person concentrated beta with weekly interviews. Tune caps and the algorithms.

## Phase 6 — Evidence-based scale
Redis only for measured horizontal realtime/queue/cache need. pgvector only after a semantic ranking experiment. FastAPI only for Python-only/GPU/independent model workloads. S3 only if Cloudinary economics/control justify migration. Monetization is designed in this phase around the connect economy (see `PRODUCT.md`).

## Phase 7 — UI redesign
Once the logic and algorithms are done, redesign the interim Hinge-like UI into Perspective's own look. This must happen before any public release or store submission. Because styling lives in design tokens and components are small and reusable, this should be mostly a restyle, not a rewrite.

## Definition of done
Acceptance criteria pass; docs/contracts updated; authorization and failure paths tested; accessible states implemented; analytics contains no sensitive content; migrations reviewed; API client regenerated; CI green; human review complete.
