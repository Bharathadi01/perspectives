# Development Plan

Two developers, both working across the whole stack. Business rules are in `PRODUCT.md`. The phases below describe the product slices; who builds which slice is decided per task and declared in `ACTIVE_CHANGES.md`.

## Where the build is now (2026-10-16, branch feature/jana01)
The core loop from `PRODUCT.md` is implemented end to end on PostgreSQL, and the legacy skeleton logic is gone:
- **Contracts:** profiles, posts (photo or 15s audio, category, focus areas, spark hints, chips), perspectives, daily status, open Connect, chat, safety, error codes.
- **API:** auth with rotating refresh tokens, default-deny guard, idempotency keys, profile completeness and selfie gate, posts, the daily mandatory set with boost slot and skip-replace, the daily unlock, perspectives with moderation, Inbox, feedback, the connect gate in both directions, accept/decline, 14-day cooldown, chat, unmatch, report, block, account deletion. Business rules are pure functions in `apps/api/src/domain`.
- **Mobile:** Hinge-style interim UI for every tab, onboarding, composer, Inbox, profile view, chat, posts, You.
- **Tests:** contracts 14, domain 19, api-client 6, mobile 6, end-to-end 17 against PostgreSQL 16.

### Decisions to revisit
- **Who sees whom (decided 2026-10-16: keep as is for now).** Today one audience setting (gender and age range) decides both who can see you and whose profiles you see; two people only meet when each is inside the other's audience. Revisit during development. Options: (A) keep it, (B) the setting controls only who can see you, (C) two separate settings, "who can see me" and "who I want to see" (recommended direction, one extra field). Why it matters: a person who shows their profile to women 18-25 can't also see men's profiles (for example a gym buddy), and narrow settings shrink the pool and weaken the "nobody is left out" guarantee. Code: `apps/api/src/domain/eligibility.ts` (`mutuallyVisible`) and `apps/api/src/daily/candidates.service.ts`.

### Stubs and gaps (next work)
- Selfie verification and text moderation are stubs (`apps/api/src/moderation/moderation.ts`); no media moderation or EXIF stripping yet.
- Media is stored on local disk (`MEDIA_STORAGE_DIR`); move to the canonical provider (ADR-003).
- No push notifications, rate limiting, moderation operations, admin tools, analytics, or audit logs.
- Chat is polled; messages are not cursor-paginated.
- Algorithms are simple v1 versions with placeholder weights (`apps/api/src/domain/ranking.ts`); the mandatory count is fixed at 3 (`domain/daily.ts`).
- No dark mode yet (tokens are light only), and the Hinge-like UI is temporary (ADR-011).
- Post reordering and editing a post's media are not built.

## Phase 0 — Validate
Prototype and user tests of the profile, give, and connect loop. Threat model and data map. Narrow launch community. Exit: profiles reliably receive useful perspectives, and people keep giving.

## Phase 1 — Foundation
Expo shell, routing, tokens and components, accessibility, auth, NestJS bootstrap, config validation, PostgreSQL/Prisma, Swagger (a generated OpenAPI client comes later), test database, CI, errors, environments, logging, agent docs.

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
Acceptance criteria pass; docs/contracts updated; authorization and failure paths tested; accessible states implemented; analytics contains no sensitive content; migrations reviewed; contracts and api-client rebuilt; CI green; human review complete.
