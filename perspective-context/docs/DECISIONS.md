# Architecture Decisions

## ADR-001: Modular monolith
Status: accepted. One NestJS app with clear modules; extract only from measured need.

## ADR-002: PostgreSQL is canonical
Status: accepted. Product truth, audit state, idempotency, and initial jobs reside in PostgreSQL.

## ADR-003: Cloudinary for v1 media
Status: accepted. Do not carry both S3 and Cloudinary during v1.

## ADR-004: Deferred complexity
Status: accepted. Redis, FastAPI, custom ML, active pgvector ranking, microservices, and Turborepo require a new ADR with evidence.

## ADR-006: Profile-first model with posts
Status: accepted (product owner, 2026-10-16).
Context: earlier docs centered on standalone Perspective Requests created from a Create tab.
Decision: the unit is a profile with 1 to 6 posts (photo or 15-second audio plus a prompt or question). The primary post is required and has a photo. A giver answers one post. Audience (gender and age range) is set on the profile, not per post.
Consequences: requests become posts owned by profiles; per-request audience rules and request expiry are not part of the core model. Skeleton names such as `PerspectiveRequest` may stay in code.

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
Status: proposed (implemented on feature/jana01, 2026-10-16; confirm when the stack is settled).
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

## ADR template
- ID/title
- Status: proposed/accepted/superseded
- Context
- Decision
- Consequences
- Alternatives
- Activation/rollback criteria
- Owners/date
