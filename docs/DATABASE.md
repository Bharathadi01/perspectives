# Database

## Source of truth
PostgreSQL is canonical. Use Prisma migrations and explicit repository/application boundaries.

The business rules behind these tables are in `PRODUCT.md`. The schema is `apps/api/prisma/schema.prisma`; the first migration is `20261016000000_core_loop_jana_init`. From now on, schema changes are additive forward migrations (see `jana_claude.md` rule 4.2).

## Tables (implemented)
`users` (email, password hash, birth date, status) · `refresh_tokens` (hashed, rotating families) · `profiles` (basics, audience genders and age range, selfie status, `is_live`) · `media` (photo or audio, purpose `post` or `selfie`, storage key) · `posts` (1 to 6 active per profile; position 0 is the primary photo) · `perspectives` (comment, chips, status, owner feedback: verdict, reason, thanked; `received_day_key` drives the daily unlock) · `daily_progress` (required count and unlock time per user per day) · `daily_assignments` (the mandatory set, `boost` or `mandatory` slot, status) · `profile_skips` · `connect_requests` (sender, receiver, the perspective that earned it, status, response time) · `connections` (normalized pair, status, origin request) · `messages` · `blocks` · `reports` · `idempotency_keys` · `deletion_jobs` (no personal data).

Not built yet: `notifications`, `device_tokens`, `moderation_cases`, `moderation_actions`, `audit_logs`, pg-boss job tables.

Not in the model: connection intents or connection modes. A connection has no label.

## Invariants
- One perspective per `(post_id, giver_id)`.
- A perspective is always on a post owned by someone other than the giver.
- A profile has between 1 and 6 active posts; the primary post requires a photo.
- Audio post media is at most 15 seconds.
- One directed block per `(blocker_id, blocked_id)`.
- A connect request can be created only if the sender has already given the receiver a perspective (on one of the receiver's posts).
- A connect request cannot be re-sent by the same sender to the same receiver within the decline cooldown (default 14 days, configurable).
- One active connection per normalized user pair.
- Chat opens only on an accepted connect request.
- A received perspective or connect request is revealed once the owner has completed the daily set on the day it arrived or any later day (or gave to every eligible profile that day).
- One idempotency result per `(actor_id, scope, key)`.
- State changes occur through application services and validated transitions.
- Messages require active connection membership at write time.
- A blocked pair cannot create perspectives, connect requests, or messages.
- Only selfie-verified, 18+ users may have an active profile.
- Counters are server-maintained; authorization never trusts a counter.
- Limits such as connect requests per day and perspectives received per profile per day are config values that default to unlimited until tuned.

## DTO rule
Do not return Prisma entities. Build allowlisted public/private/admin DTOs.
- Public profiles may show: display name, age or age band, height, gender, orientation/preference, city-level location, verification badge, and posts. Givers need this context.
- Public profiles must never expose: phone, email, exact birthday, precise location, tokens, devices, internal reputation, moderation notes, or selfie-verification media.
- A perspective DTO is visible only to the post owner and the giver.

## Migration workflow
1. Pull/rebase main and apply all existing migrations.
2. Only the assigned migration owner edits `schema.prisma`.
3. Create one narrowly named migration using development migration tooling.
4. Inspect generated SQL and add constraints/indexes deliberately.
5. Test forward migration on a fresh database and an existing fixture database.
6. Commit schema and migration directory together.
7. Never edit or delete an applied migration.
8. CI/staging/production use deploy-mode migration commands, never development mode.

## Index baseline
Composite indexes for eligible-profile selection (audience, status, verification), daily assignments and unlocks by user and day, impressions and skips by user and time, perspectives by post and time, connect requests by receiver and status and by sender-receiver pair (cooldown lookups), connections by member and status, messages by connection/time/id, reports by status/severity/time, and deletion jobs by state/run time.
