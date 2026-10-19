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

## ADR-016: Both must give before a connection opens
Status: accepted (product owner, 2026-10-18).
Context: only the asker had to give a perspective; the person accepting could say yes without giving one, so chats often held a single perspective.
Decision: to accept a connect request the receiver must have given the asker a perspective (`evaluateAccept` in `apps/api/src/domain/connect.ts`). Ticking Connect while giving to someone who already asked accepts their request in the same step. The Inbox and profile explain what is needed, and the chat shows both perspectives (`Connection.reply`).
Consequences: more effort to accept, so some requests may sit unanswered or be declined; stronger give-to-get. Older connections have no `reply`. Declining is unchanged.
Alternatives: only show both when both exist (kept the old rule), or leave the chat showing one perspective (rejected).

## ADR-017: The boost slot spreads out and skips reported or inactive profiles
Status: accepted (product owner, 2026-10-19).
Context: every viewer's boost went to the single least-served profile, and "served" only counted perspectives already received, so everyone opening the app the same morning got the same person (a simulation showed about 44 sets for one profile at 200 users and about 250 at 1,000). The boost also ignored reports and whether the owner still used the app, and one reporter could apply the full report penalty. `PRODUCT.md` already lists an over-exposure penalty that was never built.
Decision:
- "Served" counts perspectives received in the lookback window plus mandatory slots already holding the profile today. Need in the ranking score uses the same count.
- The boost is chosen from up to 5 least-served profiles (those at most one above the lowest), at random with weight 0.5 + compatibility, seeded by viewer and day (`apps/api/src/domain/random.ts`), so a replay gives the same set.
- A soft cap of 6 mandatory slots per profile per day; an over-cap profile is used only when nobody else is left.
- The boost only goes to owners with a daily-progress row in the last 3 days, or accounts under 48 hours old.
- Reports count distinct reporters in the last 30 days (ignoring reports a reviewer allowed and reports whose reporter deleted their account). 2 or more keep a profile out of every mandatory slot; it may still appear as a bonus profile.
- When no profile qualifies for the boost, the slot becomes a relevance slot.
Consequences: one additive index (`daily_assignments(targetId, dayKey)`); six new config values. The cap is soft under concurrency (two sets built at the same instant can exceed it by one). Fit drops slightly at small pools because the boost spreads to less-matched people.
Alternatives: a hard received cap (kept as the existing optional config); a nightly batch allocator (later, once there is a job runner); a "needs it" threshold that leaves the boost empty (product owner to decide; it changes the "each set has a boost slot" rule).
Activation/rollback: set `BOOST_CANDIDATE_POOL=1`, `MAX_MANDATORY_ASSIGNMENTS_PER_PROFILE_PER_DAY=0`, `BOOST_ACTIVE_DAYS=0` and `REPORT_PAUSE_REPORTERS=0` to return to the old pick (counting today's sets stays).

## ADR-018: The beta product model (goal, one audience, rule-based matching, safety holds)
Status: accepted (product owner, 2026-10-20).
Context: an algorithm review (two external research reports, a speed-dating sandbox and our own simulation) found that at 50 to 200 users the pool size and gender balance matter more than ranking weights. Machine learning did not beat a constant guess on the sandbox data, and several profile fields conflicted with the "no intents or labels" rule.
Decision:
- A private onboarding goal (Get perspectives and/or Meet new people) replaces the "dating intention" and its dealbreaker. It only changes matching and never labels anyone.
- One audience setting, used both ways, worded by the goal. "Perspectives only" people start with all genders selected. Orientation becomes optional and private and is not used for matching during the beta; the beta decides whether orientation-based matching is needed (`BETA_PLAN.md`).
- Automatic age widening: 2 years at a time, at most 4 beyond the person's choice, never below 18, never gender, always with a notice.
- Rule-based matching only. Ranking starts at 0.45 shared interests, 0.20 need, 0.15 recently active, 0.10 new member and 0.10 giving quality, minus distinct-reporter penalties. Daily rhythm and social energy are not used.
- Mandatory count 1/2/3 by eligible people available; the boost goes to active people with no perspectives in 3 days or is not used; people inactive for 7 days are skipped; then 4 to 5 more profiles a day.
- Caps: 5 connect requests a day; a soft received limit of 10 a day; 6 mandatory sets per person per day.
- Safety: automatic steps only hold; admins decide every ban; banned people can always appeal.
Consequences: schema changes (goal, optional orientation, account hold and suspension state, admin tables), a new admin web app (ADR-019), and in-app notices. The "national launch" exclusion is replaced by a worldwide public launch after the beta.
Alternatives: two settings ("hear from" and "interested in"); an open perspective pool; an orientation-driven feed; logistic-regression ranking from the start (rejected for now: no data of our own, and no gain on the sandbox).
Activation/rollback criteria: reviewed after the 4-week beta using `BETA_PLAN.md`.

Step 1 built (2026-10-20): mandatory count 1/2/3, the new boost rule (no boost slot when nobody qualifies), inactive and soft-limit exclusions, 5 connect requests a day, 4 to 5 profiles after the set, the new ranking, reports on posts, perspectives and messages counted, and the relationship-goal dealbreaker removed from matching. Details the product owner settled while building: the after-set count is 5 at 15+ people left, 4 at 6 to 14, else as many as are left up to 3, with the last one a seeded random discovery pick; recently active = 1.0 today or yesterday, 0.5 at 2 to 3 days, 0.2 at 4 to 7, else 0; new member = 1.0 for the first 7 days; giving quality = (helpful + 2.5) / (marks + 5); need and the boost use a 3-day window; the count pool is everyone who could hold a set slot (6-set-cap profiles included). Weights and thresholds are config.

 Admin access through separate identities and a separate web page
Status: accepted (product owner, 2026-10-20); not built.
Context: bans need a human review tool. Giving normal accounts an admin role would put ban powers one stolen phone or missed role check away, and admin screens in the mobile app would ship to every user.
Decision: separate admin identities (own table, own password, created only by a server command), an authenticator-app code at each sign-in, a web-only `apps/admin` project, admin-only endpoints under `/v1/admin` with a separate token, short sessions, and an audit log of every admin action (`SECURITY.md` → Admin access and enforcement).
Consequences: one new app in the workspace and one new dependency (a TOTP library), both added to the stack table when built.
Alternatives: an admin role on user accounts with admin screens in the mobile app (rejected for the risk above); editing the database by hand (no audit trail, error-prone).

## ADR template
- ID/title
- Status: proposed/accepted/superseded
- Context
- Decision
- Consequences
- Alternatives
- Activation/rollback criteria
- Owners/date

