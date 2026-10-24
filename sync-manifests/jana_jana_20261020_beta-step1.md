# Sync Manifest: Beta step 1, the algorithm changes (branch jana)

- **Author / Agent:** Jana / Claude Code (Opus)
- **Branch:** jana
- **Date & Time:** 2026-10-20
- **Base Commit:** 095b698

## 1. Summary of Changes
Builds step 1 of `docs/BETA_PLAN.md` exactly as `docs/PRODUCT.md` (2026-10-20) describes: the daily set is 1, 2 or 3 people by how many could fill it; the boost goes only to someone active in the last 3 days with no perspectives in 3 days (otherwise no boost slot) and no longer carries a "few perspectives" note; people inactive for 7 days or at 10 perspectives today are kept out of daily sets; 5 connect requests a day; 4 to 5 profiles after the set with a random discovery pick last; the new ranking formula; reports on posts, perspectives and messages count against the person. The relationship-goal dealbreaker no longer hides anyone (the field and question stay until step 2). No onboarding, holds, bans or admin.

## 2. Modified & Created Files
- `apps/api/src/domain/daily.ts`: `mandatoryCount(available, max, thresholds)`, `bonusCount(available, thresholds)`, `PoolThresholds`.
- `apps/api/src/domain/assignment.ts`: `dormant` and `atSoftLimit` on candidates; `mayHoldMandatorySlot` now also excludes them; `mandatoryPoolSize`, `qualifiesForBoost` (no perspectives in the window), `pickAfterSetProfile` (best match, last one random).
- `apps/api/src/domain/ranking.ts`: rewritten to the beta formula (`rankingScore` with config weights, `interestSimilarity`, interest-only `computeCompatibility`, `reciprocityNeed`, `recentlyActiveScore`, `newMemberScore`, `givingQuality`, `reportPenalty`). Removed: dating-intention, lifestyle and category-overlap scoring, `freshness`, `qualityPrior`.
- `apps/api/src/common/day.ts`: `daysBetweenKeys`.
- `apps/api/src/daily/candidates.service.ts`: no dealbreaker filter; facts for last-opened day, perspectives received in 3 days and today, distinct reporters across profile/post/perspective/message reports; scores with the new formula.
- `apps/api/src/daily/daily.service.ts`: count from the pool; `afterSetActionsToday` replaces `actionsToday`; `thresholds()`.
- `apps/api/src/explore/explore.service.ts`: boost cards sent as `mandatory`; after-set allowance and discovery pick; `DAILY_BATCH_SIZE` no longer used.
- `apps/api/src/config/app-config.ts`, `.env.example`: new `POOL_FULL_AT`, `POOL_PARTIAL_AT`, `RECEIVED_SOFT_LIMIT_PER_DAY`, `MANDATORY_INACTIVE_DAYS`, `RANK_WEIGHT_*`; `MAX_CONNECT_REQUESTS_PER_DAY` defaults to 5; `BOOST_LOOKBACK_DAYS` defaults to 3; `DAILY_BATCH_SIZE` removed.
- `apps/api/prisma/seed.ts`: every seed user gets yesterday's daily-progress row (counts as active).
- `apps/mobile/app/(tabs)/explore.tsx`: the boost note now reads like any set card.
- Tests: `test/unit/domain.spec.ts`, `test/unit/matching-engine.spec.ts` (rewritten for the beta ranking), new `test/e2e/beta-rules.e2e-spec.ts`, `test/e2e/core-loop.e2e-spec.ts` (expectations for small pools), `test/e2e/setup-env.ts`.
- Docs: `business-logic/BUSINESS_LOGIC.md` (sections 2, 9, 12.2, 14.1, 16, 17, 18, 20), `docs/PRODUCT.md` (the details settled while building), `docs/DECISIONS.md` (ADR-018 step-1 note), `docs/ARCHITECTURE.md` (config row), `CLAUDE.md` (check counts), mirrors in `perspective-context/`.

## 3. Database & Schema Changes
- **Prisma Schema Modified:** No. Activity comes from `daily_progress`, age from `profiles.createdAt`, report targets are resolved by lookup.

## 4. Contract & API Impact
- **New Endpoints:** none. **DTO Updates:** none (Explore cards never carry `slot: 'boost'` now; the enum value stays).
- **Behavior changes:** smaller daily sets in small pools; connect requests capped at 5 a day (`CAP_REACHED`); `remainingInBatch` now counts set slots left, then after-set profiles left.

## 5. UI & Design System Adherence
- [x] No new colors or components; one copy change.

## 5b. Business logic document
- [x] `business-logic/BUSINESS_LOGIC.md` updated (sections, change log, "Last updated").

## 6. Verification & Test Evidence
- [x] `pnpm -r --workspace-concurrency=1 run build` and `typecheck`: clean.
- [x] `pnpm test`: 106 passing (contracts 23, API 57, api-client 6, mobile 20).
- [x] `pnpm test:e2e`: 33 passing (7 new beta-rule tests), run twice.
- [x] Seeded database: Ravi (4 women in his audience) gets a set of 1 shown as a normal card, then 3 more profiles, then "done".
- [x] Committed locally as 8c2f77b (not pushed) before step 2, at the product owner's request; reviewed and tested together with step 2.

## 7. Potential Overlap / Conflict Warning
`apps/api/src/domain/ranking.ts` (Bharath's matching engine replaced by the beta formula) and its tests; `daily/candidates.service.ts`; `config/app-config.ts` and `.env.example` (a key removed, defaults changed). Anyone with a local `.env` that sets `MAX_CONNECT_REQUESTS_PER_DAY=` (empty) keeps unlimited requests; remove the line or set 5.
