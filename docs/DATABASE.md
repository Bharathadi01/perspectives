# Database

## Source of truth
PostgreSQL is canonical. Use Prisma migrations and explicit repository/application boundaries.

## Principal tables
`users`, `auth_identities`, `refresh_token_families`, `profiles`, `profile_media`, `profile_prompts`, `user_lenses`, `user_preferences`, `consents`, `perspective_requests`, `request_media`, `request_audience_rules`, `explore_impressions`, `request_skips`, `responses`, `response_feedback`, `connection_interests`, `connections`, `connection_members`, `messages`, `blocks`, `reports`, `moderation_cases`, `moderation_actions`, `device_tokens`, `notifications`, `idempotency_keys`, `audit_logs`, `deletion_jobs`, `job` tables managed by pg-boss.

## Invariants
- One response per `(request_id, responder_id)`.
- One directed block per `(blocker_id, blocked_id)`.
- One active connection for normalized user pair and origin context.
- One idempotency result per `(actor_id, scope, key)`.
- State changes occur through application services and validated transitions.
- Messages require active connection membership at write time.
- A blocked pair cannot create responses, interests, or messages.
- Counters are server-maintained; authorization never trusts a counter.

## DTO rule
Do not return Prisma entities. Build allowlisted public/private/admin DTOs. Public profiles exclude phone, email, exact birthday, precise location, tokens, devices, internal reputation, and moderation notes.

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
Composite indexes for active request eligibility, impressions/skips by user and time, responses by request/time, connections by member/status, messages by connection/time/id, reports by status/severity/time, and deletion jobs by state/run time.
