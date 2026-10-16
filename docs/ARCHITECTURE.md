# Architecture

## V1 topology
Today: `Expo mobile -> NestJS API (REST, polled chat) -> PostgreSQL`
Planned: signed Cloudinary media, pg-boss jobs on PostgreSQL, and Socket.IO chat transport are added by ADR when needed (table below).

Start as one modular monolith, one database, one media provider, and one deployment pipeline.

## Stack: built now vs planned
This table is the single source for the stack. If README, CLAUDE.md, BLUEPRINT.md, or jana_claude.md disagree, this table wins (ADR-013).

| Area | Built and used now | Planned (switch on by ADR when the trigger is met) |
|---|---|---|
| Monorepo | pnpm workspaces, TypeScript; `turbo.json` exists but scripts use `pnpm -r` | Turborepo only if build times need caching |
| Mobile | Expo SDK 52, Expo Router 4, TanStack Query, Zustand, React Hook Form + Zod, run in Expo Go | SDK upgrade (deferred), Expo Development Builds before the first native feature (real selfie SDK, push) |
| API | NestJS 10, Zod validation (no class-validator), Swagger at `/docs`, JWT + rotating refresh tokens | Rate limiting: `@nestjs/throttler` in-process first; Redis-backed only with several API instances |
| Database | PostgreSQL 16 + Prisma 6 (Homebrew or Docker) | pgvector only after a ranking experiment |
| Media | Local disk behind `MediaStorage`, HMAC-signed URLs | Cloudinary (ADR-003) for signed upload and EXIF stripping; S3 + CDN only if cost or control demands |
| Jobs | None | pg-boss on PostgreSQL; Redis/BullMQ only at measured queue pressure |
| Chat | Polling (`GET /v1/connections/:id/messages`) | Socket.IO (or SSE) as transport; PostgreSQL stays canonical |
| Moderation, selfie verification | Stubs (`TextModerator`, `SelfieVerifier`) | A vendor API for text and image moderation and for liveness selfie checks, rather than building ML |
| AI service | `apps/ai-service` FastAPI skeleton, not called by anything | Activate only for Python-only models, GPU inference, or independent AI scaling |
| Local infra | PostgreSQL only | Redis only with its first real use |

## Repository
```text
apps/mobile
apps/api
packages/api-client
packages/contracts
packages/design-tokens
packages/config
apps/ai-service     # FastAPI skeleton, not wired in v1
docs
```

## Backend modules
Built: `auth`, `profiles` (with posts), `posts`, `media`, `daily`, `explore`, `perspectives`, `connect` (with chat), `safety`, `social`, `moderation`, `health`, plus pure business rules in `domain/`. Planned: `notifications`, `privacy`, `admin`.

A module exports application services, not Prisma repositories. Cross-module workflows use an orchestrating service or durable domain event. Circular dependencies are prohibited.

## Mobile structure
```text
apps/mobile/app                 # Expo Router routes only
apps/mobile/src/features       # feature UI/hooks/schemas
apps/mobile/src/components     # shared presentational components
apps/mobile/src/api            # typed api-client instance
apps/mobile/src/store          # client-only Zustand state
apps/mobile/src/theme          # consumes design tokens
```
Routes remain thin. Feature hooks (`src/features/hooks.ts`) call the typed api-client through TanStack Query. Server truth does not live in Zustand.

## Integration boundaries
- API contract: Zod schemas in `packages/contracts` are the source; `packages/api-client` is a typed HTTP client that validates responses. Swagger is served at `/docs`. A generated OpenAPI client is planned.
- Media (now: local disk with signed URLs; planned: Cloudinary): API issues short-lived signed instructions; client never receives the provider secret.
- Jobs (planned, none built): pg-boss/PostgreSQL; handlers are idempotent.
- Chat (now: polling; planned: Socket.IO): PostgreSQL is canonical; the socket is transport only.
- Recommendations: NestJS SQL eligibility and weighted score.

## Activation triggers
- Redis/BullMQ: horizontal realtime instances or measured queue/cache pressure.
- pgvector ranking: A/B test shows semantic retrieval improves helpful-response rate.
- FastAPI/Python: Python-only models, GPU inference, or independent AI scaling.
- S3/CDN: Cloudinary cost/control no longer meets requirements.
- Service extraction: independent scale, deployment, or ownership—not code size alone.

## Environment registry
Only `EXPO_PUBLIC_*` may enter the mobile bundle, and none may be secret. Server secrets live in the deployment secret manager.

| Variable | Owner | Secret | Purpose |
|---|---|---:|---|
| EXPO_PUBLIC_API_URL | mobile | No | API base URL |
| EXPO_PUBLIC_ENV | mobile | No | dev/staging/prod label |
| DATABASE_URL | api | Yes | PostgreSQL connection |
| JWT_ACCESS_SECRET | api | Yes | access-token signing |
| JWT_REFRESH_SECRET | api | Yes | refresh-token signing/pepper |
| CLOUDINARY_CLOUD_NAME (planned) | api | No | Cloudinary account name |
| CLOUDINARY_API_KEY (planned) | api | Yes | server operations |
| CLOUDINARY_API_SECRET (planned) | api | Yes | signing operations |
| EXPO_ACCESS_TOKEN | api/CI | Yes | push/build operations |
| MEDIA_SIGNING_SECRET | api | Yes | signs short-lived media URLs |
| MEDIA_STORAGE_DIR | api | No | development media storage folder |
| TEST_DATABASE_URL | api tests | Yes | database truncated by e2e tests |
| APP_TIMEZONE, DAILY_MANDATORY_COUNT, DAILY_BATCH_SIZE, CONNECT_DECLINE_COOLDOWN_DAYS, MAX_CONNECT_REQUESTS_PER_DAY, MAX_PERSPECTIVES_RECEIVED_PER_DAY, SKIP_HIDE_DAYS, BOOST_LOOKBACK_DAYS | api | No | product configuration (see `.env.example`); empty caps mean unlimited |
