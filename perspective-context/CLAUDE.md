# Perspective Agent Contract

## Product
Perspective is an 18+ structured human-feedback and mutual-connection app. Users publish a photo, situation, idea, profile element, or decision with a specific question; qualified users give structured perspectives; compatible mutual intent can open a private connection.

Hinge is an interaction reference only: deep profiles, one focused card at a time, responding to a specific element, incoming review, mutual consent before chat, and private outcome feedback. Never copy Hinge assets, strings, iconography, brand, visual identity, screenshots, animations, or pixel layouts.

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
