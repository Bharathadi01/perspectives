# Perspective Engineering Context

## Product
Perspective is an 18+ social feedback and connection app. Users create a Perspective Request (a photo, situation, idea, or question); qualified users give structured perspectives; compatible mutual intent can open a private connection.

Hinge is a structural UX reference: deep profiles, one-card-at-a-time discovery, responding to a specific element, incoming review, mutual consent before chat, and private outcome feedback. Never copy Hinge assets, strings, iconography, brand, visual identity, screenshots, animations, or pixel layouts.

## Product rules
- A perspective is subjective; never present it as objective truth.
- Written context is more important than a numeric score.
- No public attractiveness scoring, leaderboards, public follower counts, or public comments.
- Chat opens only after mutual compatible connection intent.
- Safety features are P0: moderation, report, block, age gate, contact information, and in-app account deletion.
- Optimize helpful perspectives and meaningful connections, not time spent.
- Precise location, phone, email, birthday, moderation notes, and private settings must never appear in public DTOs.

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
