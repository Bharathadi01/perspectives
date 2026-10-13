# Development Plan

## Phase 0 — Validate
A: prototype and user tests. B: threat model and data map. Both: narrow launch community, concierge test, policy, v1 freeze. Exit: repeated clear requests and useful responses.

## Phase 1 — Foundation
A: Expo shell, routing, tokens/components, accessibility, auth/onboarding UI, fixtures/tests. B: NestJS bootstrap, config validation, PostgreSQL/Prisma, auth interfaces, OpenAPI, test containers, CI. Pair: errors, environments, logging, agent docs.

## Phase 2 — Profiles and requests
A: profile editor, request composer, picker/upload states. B: profile/request modules, signed media, moderation state, activation, migrations. Pair: validation and policy.

## Phase 3 — Explore and responses
A: request card, finite batch, response composer, Inbox, retries/offline. B: eligibility, weighted ranking, impressions, skips, idempotent submission, zero-response metrics. Pair: event taxonomy.

## Phase 4 — Connections and chat
A: intent UX, connection list, chat, notification deep links, block UX. B: transactional mutual intent, Socket.IO authorization, messages, push jobs, rate limits, block enforcement. Pair: concurrency tests.

## Phase 5 — Safety and beta
A: report UX, policy education, account controls, accessibility audit, instrumentation. B: moderation operations, enforcement/audits, deletion, backups, monitoring, runbooks. Both: 100–200-person concentrated beta and weekly interviews.

## Phase 6 — Evidence-based scale
Redis only for measured horizontal realtime/queue/cache need. pgvector only after a semantic ranking experiment. FastAPI only for Python-only/GPU/independent model workloads. S3 only if Cloudinary economics/control justify migration.

## Definition of done
Acceptance criteria pass; docs/contracts updated; authorization and failure paths tested; accessible states implemented; analytics contains no sensitive content; migrations reviewed; API client regenerated; CI green; human review complete.
