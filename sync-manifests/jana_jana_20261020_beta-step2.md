# Sync Manifest: Beta step 2, goal, audience wording, private orientation, widening, notices (branch jana)

- **Author / Agent:** Jana / Claude Code (Opus)
- **Branch:** jana
- **Date & Time:** 2026-10-20
- **Base Commit:** 8c2f77b (beta step 1, committed locally)

## 1. Summary of Changes
Builds step 2 of `docs/BETA_PLAN.md` as `docs/PRODUCT.md` (2026-10-20) describes: a private onboarding goal (Get perspectives and/or Meet new people), required to go live; the audience step worded by the goal, with perspectives-only starting on every gender plus a hint; orientation optional and private (out of public DTOs, never used for matching); the dating intention and its dealbreaker removed from contracts, API and app; automatic age widening; the in-app notices list. Details the product owner settled: the goal does not change matching in the beta; widening starts when fewer than 6 people could fill a set slot and widens both ends 2 years per step, at most 4 beyond the chosen range. No admin, holds, bans, blocked list or push.

## 2. Modified & Created Files
- **Contracts:** `packages/contracts/src/profile.ts` (`Goal`, `GoalsSchema`, `goal` requirement; `orientation` and `datingIntention` out of `PublicProfileSchema`; `goals` in `MyProfile` and the update input; orientation nullable; intention fields removed), `personality.ts` (`DatingIntention` and `DATING_INTENTION_CONFIG` removed), new `notice.ts`, `index.ts`.
- **API domain:** new `apps/api/src/domain/widening.ts` (`nextWidening`, `needsWidening`); `eligibility.ts` (goal required, orientation optional).
- **API services:** `daily/daily.service.ts` (`widenIfNeeded` on the first visit of the day, before the count), new `notices/notices.service.ts` and `notices/notices.controller.ts` (`GET /v1/notices`, `POST /v1/notices/read`), `profiles/profiles.service.ts` (goals; the chosen range is kept when the range in use is saved again), `profiles/profile.mapper.ts`, `social/social.service.ts` (intention fields dropped), `app.module.ts`, `config/app-config.ts` and `.env.example` (`AUDIENCE_WIDEN_STEP_YEARS=2`, `AUDIENCE_WIDEN_MAX_YEARS=4`).
- **API client:** `notices.list`, `notices.markAllRead`.
- **Mobile:** new `StepGoal`, `forms/GoalPicker`, `forms/GoalForm`, `app/me/notices.tsx`; `StepAudienceIntentions` renamed to `StepAudience` (goal wording, no intention or dealbreaker); `StepAboutYou` and `BasicsForm` (orientation optional, can be cleared); `StepReview` (goal card, shifted step links, new matching text); `onboarding/index.tsx` (7 steps, starts at the goal step when only the goal is missing); `onboardingStore` (`goals`, `setGoals`, `audienceTouched`); `AudienceForm` (goal wording and hint); `BasicsRow` and `ProfileView` (no orientation, no intention pill); `me/edit.tsx` (goal section and row); `(tabs)/you.tsx` (goal and Notices buttons); `lib/labels.ts` (`GOAL_LABEL`, `audienceQuestion`, `perspectivesOnly`); `features/hooks.ts` (`useNotices`, `useMarkNoticesRead`); `api/queryKeys.ts`.
- **Seed and tests:** `prisma/seed.ts` (goals and chosen range for every seed person), `test/e2e/harness.ts` (live users get a goal and no orientation), new `test/e2e/beta-step2.e2e-spec.ts` (5 tests), `test/e2e/auth-and-profile.e2e-spec.ts`, `test/unit/domain.spec.ts` (widening and completeness), `packages/contracts/test/contracts.test.ts`, `apps/mobile/test/onboarding.test.ts`.
- **Docs:** `business-logic/BUSINESS_LOGIC.md` (sections 1, 2, 5, 8 with new 8.1 and 8.2, 9.3, 9.4, 15, 16, 17, 19, 20), `docs/PRODUCT.md` (two detail lines the product owner settled), `docs/DECISIONS.md` (ADR-018 step-2 note), `docs/DATABASE.md`, `docs/ARCHITECTURE.md`, `docs/ACTIVE_CHANGES.md`, `CLAUDE.md` (check counts), mirrors in `perspective-context/`.

### Audience change during the day (added after Jana's review of widening)
- `daily/daily.service.ts`: new `onAudienceChanged` (rebuild when nothing is given, otherwise widen only; waiting slots are re-checked lazily); `ensureDay` now keeps today's skipped and given-to people out of a rebuilt set. `profiles/profiles.service.ts` calls it after saving an audience. Mobile: `useUpdateProfile` refreshes Explore (a stale card could stay on screen). 5 new e2e tests in `beta-step2.e2e-spec.ts` (now 43 e2e in total).

### Fresh people first and 2-day skips (added after Jana's review)
- `domain/assignment.ts`: `fresh` on candidates, new `freshFirstPool` (fresh only while 6 or more are left, otherwise fresh plus returning). `domain/ranking.ts`: new `fresh` factor and weight (0.10). `daily/candidates.service.ts`: marks fresh (never given to), `RANK_WEIGHT_FRESH`. `daily/daily.service.ts`: `freshFirst` used for the count, the set, replacements and the widening check; `afterSetActionsToday` became `afterSetUsage` (returns used and used-fresh). `explore/explore.service.ts`: after-set pool is fresh-first. `config/app-config.ts` and `.env.example`: `RANK_WEIGHT_FRESH=0.1`, `SKIP_HIDE_DAYS` default 7 to 2.
- Tests: unit tests for the pool rule and the ranking head start; new `test/e2e/beta-fresh.e2e-spec.ts` (3 tests). Totals: 119 unit, 46 e2e.
- No database change. Anyone with `SKIP_HIDE_DAYS=7` in a local `.env` keeps 7 days.

## 3. Database & Schema Changes
- **Prisma Schema Modified:** Yes. Migration `20261019210428_beta2_jana_goal_widening_notices` (additive): enums `ProfileGoal` and `NoticeKind`; `profiles.goals` (default empty), `profiles.audienceChosenMinAge` and `audienceChosenMaxAge` (backfilled from the current range); new table `notices` (unique on user and `dedupeKey`). `datingIntention` and `intentionDealbreaker` stay as unused columns.
- After pulling: `pnpm db:migrate`, and migrate the test database too (`DATABASE_URL=<test db> pnpm --filter @perspective/api exec prisma migrate deploy`), or every e2e test fails at sign-up.

## 4. Contract & API Impact
- **New endpoints:** `GET /v1/notices`, `POST /v1/notices/read` (204, idempotency key required).
- **DTO updates:** `PublicProfile` loses `orientation` and `datingIntention`; `MyProfile` gains `goals` and loses `datingIntention` and `intentionDealbreaker`; `UpdateProfileInput` gains `goals` (1 or 2, unique), orientation becomes nullable, the intention fields are gone (old clients sending them are ignored); `ProfileRequirement` gains `goal`.
- **Behavior:** a profile without a goal is not live (existing live profiles keep `isLive` until their next profile change). The age range in use may change on its own (with a notice).

## 5. UI & Design System Adherence
- [x] New components use theme tokens only; tap targets at least 44 px; checkboxes and the notices list have accessibility labels.

## 5b. Business logic document
- [x] `business-logic/BUSINESS_LOGIC.md` updated (sections, change log, "Last updated").

## 6. Verification & Test Evidence
- [x] `pnpm -r --workspace-concurrency=1 run build` and `pnpm typecheck`: clean.
- [x] `pnpm test`: 119 passing (contracts 24, api-client 6, API 68, mobile 21).
- [x] `pnpm test:e2e`: 46 passing (13 new).
- [x] Local database by hand: Nisha narrowed to men 25–27 → range saved as 21–31 with one unread notice (chosen 25–27); Ravi's public profile has no orientation or goal. Reseeded afterwards.
- [ ] Not committed: waiting for the product owner's review (steps 1 and 2 are tested together).

## 7. Potential Overlap / Conflict Warning
Shared files touched: `schema.prisma` (row in `docs/ACTIVE_CHANGES.md`), `packages/contracts/src/index.ts` and `profile.ts`, `packages/api-client/src/client.ts`, `apps/mobile/src/features/hooks.ts`. Anyone using `DatingIntention`, `DATING_INTENTION_CONFIG`, `PublicProfile.orientation` or `datingIntention` must drop them. Onboarding step indices moved (7 steps; review is index 6).
