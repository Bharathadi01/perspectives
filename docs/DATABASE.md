# Database

## Source of truth
PostgreSQL is canonical. Use Prisma migrations and explicit repository/application boundaries.

The business rules behind these tables are in `PRODUCT.md`. The names below describe the target model; the current Prisma schema is an earlier skeleton and needs additive migrations to reach it (see `DEVELOPMENT_PLAN.md`).

## Principal tables
`users`, `auth_identities`, `refresh_token_families`, `profiles` (basics: gender, height, orientation/preference, city, birthdate), `profile_audience` (gender and age range, one per profile), `selfie_verifications`, `posts` (1 to 6 per profile; the earlier skeleton calls these `perspective_requests`), `post_media` (photo or audio, audio capped at 15 seconds), `post_focus_areas`, `post_categories`, `daily_assignments` (the mandatory set per user per day, including the boost slot), `daily_unlocks` (per user per day), `explore_impressions`, `post_skips`, `perspectives` (the earlier skeleton calls these `responses`), `perspective_feedback`, `connect_requests` (sender, receiver, attached perspective, status, decline cooldown), `connections`, `connection_members`, `messages`, `blocks`, `reports`, `moderation_cases`, `moderation_actions`, `device_tokens`, `notifications`, `idempotency_keys`, `audit_logs`, `deletion_jobs`, and `job` tables managed by pg-boss.

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
- Received perspectives are visible to the owner only after that day's mandatory set is completed (or the user has given to every eligible profile available).
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
