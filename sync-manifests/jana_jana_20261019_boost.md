# Sync Manifest: The boost slot spreads out and skips reported or inactive profiles (branch jana)

- **Author / Agent:** Jana / Claude Code (Opus)
- **Branch:** jana
- **Date & Time:** 2026-10-19
- **Base Commit:** 70c18bd (same content as origin/dev 6ed36ca)

## 1. Summary of Changes
Fixes the daily set's pile-on: every viewer's boost went to the same least-served profile, because "served" ignored the sets already built that day. Served now counts today's assignments, the boost is a seeded random pick among the few least-served (weighted a little by fit), and a profile can hold at most 6 mandatory slots a day. The boost only goes to owners who opened the app in the last 3 days or are new, and reports count distinct reporters, with 2 or more keeping a profile out of every daily set. This is the "over-exposure penalty" already listed in `PRODUCT.md`. ADR-017.

## 2. Modified & Created Files
- `apps/api/src/domain/assignment.ts`: `AssignmentPolicy`, `served()`, `mayHoldMandatorySlot()`; `pickDailySet` and `pickReplacement` take an optional policy (without one they behave strictly, as before); `pickReplacement` now returns `{ id, slot }` so a boost slot nobody can take is refilled as a relevance slot.
- `apps/api/src/domain/random.ts` (new): seeded `seededUnit` and `weightedPick`.
- `apps/api/src/daily/candidates.service.ts`: counts today's assignments per target, recent owner activity (from `daily_progress`) and distinct recent reporters; need uses received plus assigned; `isEligible` became `findEligible` (returns the candidate).
- `apps/api/src/daily/daily.service.ts`: builds the policy from config (seed = viewer and day), re-checks pending slots for reported profiles, refills with the returned slot kind.
- `apps/api/src/config/app-config.ts`, `.env.example`: six new settings.
- Tests: `test/unit/domain.spec.ts` (10 new tests: pile-on across 50 viewers, cap, determinism, pool rule, reports, inactivity, fallback, randomness); `test/e2e/core-loop.e2e-spec.ts` (new report test; the "returning profile" test now starts a fresh day, because it used to inspect the set built before the gives and passed only by tie-break luck).
- Docs: `business-logic/BUSINESS_LOGIC.md` (sections 2, 9.3, 9.5, 9.6, 9.7, 9.10, 14.1, change log), `docs/DECISIONS.md` (ADR-017), `docs/DATABASE.md`, `docs/ACTIVE_CHANGES.md`, `CLAUDE.md` (test counts), with `perspective-context/` mirrors.

## 3. Database & Schema Changes
- **Prisma Schema Modified:** Yes (additive index only).
- **New Tables:** None. **New Columns:** None.
- **New index:** `daily_assignments(targetId, dayKey)`.
- **Migration Name:** `20261018232805_boost_jana_assignment_target_day_index`
- **After pulling:** `pnpm install`, `pnpm db:migrate`, rebuild.

## 4. Contract & API Impact
- **New Endpoints:** None.
- **DTO Updates:** None (`packages/contracts` untouched).
- **New config (defaults):** `MAX_MANDATORY_ASSIGNMENTS_PER_PROFILE_PER_DAY=6`, `BOOST_CANDIDATE_POOL=5`, `BOOST_ACTIVE_DAYS=3`, `BOOST_NEW_PROFILE_HOURS=48`, `REPORT_LOOKBACK_DAYS=30`, `REPORT_PAUSE_REPORTERS=2`.
- **Breaking Changes:** None for clients. Behavior: daily sets differ (boost is random among the least-served); a slot recorded as `boost` may now be `mandatory` when nobody qualifies.

## 5. UI & Design System Adherence
- [x] No UI changes

## 5b. Business logic document
- [x] `business-logic/BUSINESS_LOGIC.md` updated in this change (sections above, change log entry, "Last updated")

## 6. Verification & Test Evidence
- [x] `pnpm build` and `pnpm typecheck`: clean
- [x] `pnpm test`: 106 passing (contracts 23, API 57, api-client 6, mobile 20)
- [x] `pnpm test:e2e`: 27 passing; `core-loop` repeated 5 times with no flakes (the boost seed changes with every run's user ids)
- [x] Migration applied to `perspective` and `perspective_test`
- [ ] Not checked in the running app (no UI change; the local API on port 3000 still runs the old build until restarted)

## 7. Potential Overlap / Conflict Warning
`schema.prisma` and a new migration; `apps/api/src/daily/*`; `apps/api/src/domain/assignment.ts`. No contracts, api-client, hooks or lockfile changes.

## 8. Open product decisions (not built)
- Leave the boost empty when nobody is under-served (today every set still has one, so its note can be wrong in a busy pool).
- Keep people who have not opened the app for a long time out of normal slots too.
- A soft received cap ("10 received today means not pushed for the rest of the day") and the connect cap of 5 a day.
