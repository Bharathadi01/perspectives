# Architecture Decisions

## ADR-001: Modular monolith
Status: accepted. One NestJS app with clear modules; extract only from measured need.

## ADR-002: PostgreSQL is canonical
Status: accepted. Product truth, audit state, idempotency, and initial jobs reside in PostgreSQL.

## ADR-003: Cloudinary for v1 media
Status: accepted. Do not carry both S3 and Cloudinary during v1.

## ADR-004: Deferred complexity
Status: accepted. Redis, FastAPI, custom ML, active pgvector ranking, microservices, and Turborepo require a new ADR with evidence.

## ADR-005: Client boundary and in-memory test harness
Status: superseded by ADR-012 (the in-memory client was removed; mobile uses the typed HTTP client, and tests use a real PostgreSQL database). All mobile mutations route through the typed `PerspectiveApiClient` interface. An in-memory client backed by authentic fixtures guarantees that the mobile skeleton compiles, runs, and tests independently of active database or backend containers.

## ADR-006: Profile-first model with posts
Status: accepted (product owner, 2026-10-16).
Context: earlier docs centered on standalone Perspective Requests created from a Create tab.
Decision: the unit is a profile with 1 to 6 posts (photo or 15-second audio plus a prompt or question). The primary post is required and has a photo. A giver answers one post. Audience (gender and age range) is set on the profile, not per post.
Consequences: requests become posts owned by profiles; per-request audience rules and request expiry are not part of the core model. The code uses `Post` (the old `PerspectiveRequest` name is gone).

## ADR-007: Open Connect with no intents
Status: accepted (product owner, 2026-10-16).
Context: earlier docs required compatible connection modes (chat, friends, date, collaborate, network) before chat. Labels feel creepy and narrow the product.
Decision: Connect is open and unlabeled. A user may ask to connect only after giving the other person a perspective (the gate). It works in both directions: the giver ticks Connect while giving, or the owner gives a perspective back and then requests. The receiver accepts or declines. Chat opens only on accept. After a decline, the same sender cannot send another request to that person for 14 days (configurable).
Consequences: the `ConnectionMode` enum, allowed-modes fields, intent pickers, and mutual-intent error codes are removed. Safety relies on the gate, accept/decline, the cooldown, configurable caps, and report/block.

## ADR-008: Daily give-to-get and nobody-left-out
Status: accepted (product owner, 2026-10-16).
Context: users need a reason to give perspectives, and profiles that receive none cause churn.
Decision: each day every user gets a mandatory set of profiles (default 3 different people) to give perspectives on. Doing so unlocks the perspectives they received that day. The set always includes one boost slot for a low-response profile that is eligible for the viewer. The mandatory count is decided per user by an algorithm (v1 fixed at 3 behind a function). Three tunable algorithms: feed ranking, daily assignment, mandatory count.
Consequences: perspectives stay hidden until the owner's daily unlock. No caps on connects or perspectives received for now; build them as config values defaulting to unlimited.

## ADR-009: Positioning
Status: accepted (product owner, 2026-10-16).
Decision: the product is a dating app at its core with a unique perspectives hook, marketed perspectives-first rather than as "a dating app." Open Connect also serves friends, gym buddies, and networking. Dating drives revenue, but nothing in the product is labeled dating. Monetization is excluded from v1 and will be designed around the connect economy.

## ADR-010: Verified adults only
Status: accepted (product owner, 2026-10-16).
Decision: selfie verification is required at profile creation, so only verified 18+ users exist. Content rules: no nudity or sexual content; shirtless, gym, and swimwear photos are allowed; body shaming and abuse are not allowed in posts or perspectives.

## ADR-011: Temporary Hinge-like UI
Status: accepted (product owner, 2026-10-16).
Context: earlier docs forbade copying Hinge's visuals and pixel layouts.
Decision: for initial development the UI looks and feels similar to Hinge in layout, structure, and interaction, using our own tokens and copy. It is a placeholder; the product owner will redesign the UI once all logic and algorithms are done. Still forbidden: Hinge's name or logo, claiming affiliation, and copying actual Hinge files (images, exported icons, fonts, sounds, animations).
Consequences: keep UI code componentized with styling in design tokens so the redesign is mostly a restyle. The Hinge-like UI must be replaced before any public release or store submission.

## ADR-012: v1 implementation choices
Status: accepted (implemented on feature/jana01, 2026-10-16; stack settled in ADR-013).
Context: the docs disagree on parts of the stack; the first build needed the simplest option that runs.
Decision:
- `packages/contracts` (Zod) is the single source of types; the API validates bodies with it and `packages/api-client` is a typed HTTP client that validates responses with it (no generated OpenAPI client yet).
- PostgreSQL + Prisma only. No Redis, BullMQ, FastAPI, pgvector features, or pg-boss yet; nothing in v1 needs them.
- Auth: email + password (scrypt), 15-minute JWT access tokens, rotating hashed refresh tokens with family revocation.
- Media: base64 JSON upload to a `MediaStorage` interface with a local-disk implementation for development; delivery through short-lived HMAC-signed URLs. EXIF stripping and media moderation wait for the canonical provider (Cloudinary or S3, ADR-003).
- Selfie verification and text moderation are stubs behind `SelfieVerifier` and `TextModerator` interfaces.
- Chat is polled; Socket.IO comes later.
- "Today" for the daily set is computed in `APP_TIMEZONE` (default Asia/Kolkata).
Consequences: replacing storage, moderation, or verification touches one provider class each. Rate limiting is not implemented yet.

## ADR-013: Stack reconciliation
Status: accepted (product owner, 2026-10-16).
Context: README, CLAUDE.md, BLUEPRINT.md, jana_claude.md, and docker-compose.yml listed Redis, BullMQ, FastAPI, pgvector, and Socket.IO as required, while ADR-004, ADR-012, and the build use PostgreSQL and Prisma only. The initial tech list was a first idea, not a decision.
Decision: `ARCHITECTURE.md` → "Stack: built now vs planned" is the single stack source. The lean stack is what we build on. Anything else is planned and activates through its own ADR when its trigger is met. The developers may choose the stack during development and must flag a better alternative when they see one.
Consequences: stack mentions elsewhere are labelled built or planned. Recommended picks when needed: pg-boss for jobs, `@nestjs/throttler` for rate limits, Cloudinary for media, a moderation and liveness vendor instead of custom ML, Development Builds before the first native feature.
Alternatives: keep the full original stack (rejected: infrastructure with no user today); drop the Python service entirely (deferred: it stays as an unwired skeleton).
Activation/rollback criteria: see the trigger column in `ARCHITECTURE.md`.

## ADR-014: Upgrade to Expo SDK 58
Status: accepted (product owner, 2026-10-16).
Context: SDK 52's Expo Go crashed on the iOS 27 simulator and could not open on a phone with the current App Store Expo Go. Fixing it later, with a bigger app, would cost more.
Decision: upgrade to SDK 58 (React 19.3, React Native 0.88, Expo Router 58, TypeScript 6 in `apps/mobile`). `expo-av` is replaced by `expo-audio`. `newArchEnabled` is removed (always on) and the splash screen uses the `expo-splash-screen` plugin. The pnpm workspace file lists the newly released Expo packages under `minimumReleaseAgeExclude`.
Consequences: Expo Go 58.0.4 runs on the iOS 27 simulator. The App Store Expo Go supports SDK 57 until the SDK 58 build ships, so a real phone needs that update or a development build. Other packages stay on TypeScript 5.
Alternatives: SDK 57 (the App Store Expo Go works today, but needs an opt-in for Xcode 27 builds); staying on SDK 52 (rejected).
Activation/rollback criteria: revert the `chore/jana01-expo-58` merge.

## ADR-015: The Connect experience (connected moment, conversation ideas, quiet connections, 11 categories)
Status: accepted (product owner, 2026-10-18).
Context: connecting ended in a toast and an empty chat; dead connections piled up; six post categories were too narrow for what people ask about.
Decision:
- A connected moment with our own generated chime, a vibration (`expo-haptics`, new dependency) and simple motion, then straight into the chat with the keyboard up. Unseen connections are tracked per side on the server and picked up on open, on foreground and by 15-second polling until push exists.
- Conversation ideas are hard-coded guidance per post category and role (`packages/contracts/src/conversationIdeas.ts`), not drafts and not generated by an LLM, so no private perspective text is reused or sent anywhere.
- Quiet connections close on their own (rules and numbers in `PRODUCT.md`), as a pure rule with unit tests, applied lazily when read plus an in-process 15-minute sweep (background jobs later).
- Post categories grow from 6 to 11; career/networking was left out.
Consequences: additive migrations (enum values; new `connections` columns); two endpoints and one error code (`CONNECTION_CLOSED`, 410); a closed connection reuses status `unmatched` with a `closedReason`. The sweep runs in every API process until pg-boss exists.
Alternatives: an LLM writing openers (rejected for privacy, cost and safety); closing on every one-day gap (rejected as too harsh); a cooldown after a quiet closure (kept as a config value, default 0).

## ADR template
- ID/title
- Status: proposed/accepted/superseded
- Context
- Decision
- Consequences
- Alternatives
- Activation/rollback criteria
- Owners/date

