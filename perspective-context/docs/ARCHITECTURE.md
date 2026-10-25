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
| Mobile | Expo SDK 58 (React 19, React Native 0.88), Expo Router 58, expo-audio, expo-haptics, expo-notifications and expo-device (push, ADR-020), expo-font with bundled Fraunces and Inter from `@expo-google-fonts` (editorial look, ADR-021), Phosphor icons on Explore via `phosphor-react-native` + `react-native-svg` (ADR-021; Ionicons from `@expo/vector-icons` elsewhere), a custom floating glass tab bar using `expo-glass-effect` on iOS 26 (ADR-021), TanStack Query, Zustand, React Hook Form + Zod, run in Expo Go | Expo Development Builds, needed now to receive pushes, and for a real selfie SDK |
| API | NestJS 10, Zod validation (no class-validator), Swagger at `/docs`, JWT + rotating refresh tokens | Rate limiting: `@nestjs/throttler` in-process first; Redis-backed only with several API instances |
| Database | PostgreSQL 16 + Prisma 6 (Homebrew or Docker) | pgvector only after a ranking experiment |
| Media | Local disk behind `MediaStorage`, HMAC-signed URLs | Cloudinary (ADR-003) for signed upload and EXIF stripping; S3 + CDN only if cost or control demands |
| Jobs | None, except in-process timers every 15 minutes (`EXPIRY_SWEEP_MINUTES`): one closes quiet connections, one ends temporary bans whose date passed, one sends the daily push |
| Push | Expo's push service over HTTPS from the API (`PushSender`), tokens in `push_tokens` (ADR-020) | Receipt checks, quiet hours and in-app push settings | pg-boss on PostgreSQL; Redis/BullMQ only at measured queue pressure |
| Chat | Polling (`GET /v1/connections/:id/messages` every 4 s; new connections every 15 s) | Socket.IO (or SSE) as transport; PostgreSQL stays canonical |
| Moderation, selfie verification | Stubs (`TextModerator`, `SelfieVerifier`) | A vendor API for text and image moderation and for liveness selfie checks, rather than building ML |
| AI service | `apps/ai-service` FastAPI skeleton, not called by anything | Activate only for Python-only models, GPU inference, or independent AI scaling |
| Local infra | PostgreSQL only | Redis only with its first real use |
| Matching | Rule-based formulas in `apps/api/src/domain` (no machine learning) | After the beta: a Python batch job (scikit-learn logistic regression) trained on our own outcomes, used only as an input to the formula and only if it beats the formula in a shadow test (ADR-018) |
| Admin | `apps/admin`, a web-only Expo Router project (port 8082); separate admin identities created by `pnpm admin:create`, password plus a 6-digit authenticator code (RFC 6238 on `node:crypto`, no library), 8-hour admin tokens, admin-only API under `/v1/admin`, audit log (ADR-019) | Hosting with allow-listing or a VPN, and admin sign-in rate limits, before public launch |

## Repository
```text
apps/mobile
apps/api
packages/api-client
packages/contracts
packages/design-tokens
packages/config
apps/ai-service     # FastAPI skeleton, not wired in v1
apps/admin          # planned: admin web page (ADR-019)
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
| APP_TIMEZONE, DAILY_MANDATORY_COUNT, POOL_FULL_AT, POOL_PARTIAL_AT, AUDIENCE_WIDEN_*, REPORT_HOLD_REPORTERS, BAN_TEMPORARY_DAYS, WEAK_GIVER_*, MARK_FADE_DAYS, HARSH_MARKER_*, ADMIN_SESSION_HOURS, ADMIN_JWT_SECRET (optional, secret), ADMIN_REQUIRE_CODE, PUSH_SENDER, PUSH_DAILY_HOUR, EXPO_ACCESS_TOKEN (optional, secret), CONNECT_DECLINE_COOLDOWN_DAYS, MAX_CONNECT_REQUESTS_PER_DAY, MAX_PERSPECTIVES_RECEIVED_PER_DAY, RECEIVED_SOFT_LIMIT_PER_DAY, MANDATORY_INACTIVE_DAYS, SKIP_HIDE_DAYS, BOOST_*, REPORT_*, RANK_WEIGHT_*, quiet-connection values | api | No | product configuration (see `.env.example` for every value and default); an empty cap means unlimited |
