# Architecture

## V1 topology
`Expo mobile -> NestJS API/Socket.IO -> PostgreSQL`

NestJS also issues signed Cloudinary operations and runs PostgreSQL-backed workers. Start as one modular monolith, one database, one media provider, and one deployment pipeline.

## Repository
```text
apps/mobile
apps/api
packages/api-client
packages/contracts
packages/design-tokens
packages/config
docs
```

## Backend modules
`auth`, `users`, `profiles`, `requests`, `responses`, `recommendations`, `connections`, `chat`, `media`, `moderation`, `notifications`, `privacy`, `admin`.

A module exports application services, not Prisma repositories. Cross-module workflows use an orchestrating service or durable domain event. Circular dependencies are prohibited.

## Mobile structure
```text
apps/mobile/app                 # Expo Router routes only
apps/mobile/src/features       # feature UI/hooks/schemas
apps/mobile/src/components     # shared presentational components
apps/mobile/src/api            # generated client wrapper/query keys
apps/mobile/src/store          # client-only Zustand state
apps/mobile/src/theme          # consumes design tokens
```
Routes remain thin. Feature hooks call the generated client through TanStack Query. Server truth does not live in Zustand.

## Integration boundaries
- API contract: generated OpenAPI document and generated mobile client.
- Media: API issues short-lived signed instructions; client never receives Cloudinary secret.
- Jobs: pg-boss/PostgreSQL; handlers are idempotent.
- Chat: PostgreSQL is canonical; Socket.IO is transport only.
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
| CLOUDINARY_CLOUD_NAME | api | No | Cloudinary account name |
| CLOUDINARY_API_KEY | api | Yes | server operations |
| CLOUDINARY_API_SECRET | api | Yes | signing operations |
| EXPO_ACCESS_TOKEN | api/CI | Yes | push/build operations |
