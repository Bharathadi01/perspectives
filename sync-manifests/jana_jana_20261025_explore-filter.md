# Sync Manifest: Explore filter button, black progress pill, name header (branch jana)

- **Author / Agent:** Jana / Claude Code (Opus)
- **Branch:** jana
- **Date & Time:** 2026-10-25
- **Base Commit:** efdf55e (Bharath's profile View|Edit, Settings, card composer)

## 1. Summary of Changes
Product owner request, using two dating-app screenshots as layout references (layout only; no assets, names or copy taken):
- **Top bar:** black progress pill on the left; on the right a **bell** (opens `/me/notices`, black badge with `unreadCount` from `useNotices`, "9+" cap) and the **filter button**.
- **"Things in common" card** after the first post (product owner, 2026-10-25): `thingsInCommon(me, profile)` in `src/features/explore/inCommon.ts`, which lists shared interests, then same city (case/space-insensitive), same `lifestylePace`, same `socialPreference`. It is rendered by `src/components/profile/InCommonCard.tsx` (ink background, onDark text, chips) through a new `ProfileView` prop `afterPrimary`. It is computed in the app from `useMe()` and the card's public profile, and it is display only. It is hidden when empty.
- **The purple matchReasons banner was removed** from `ProfileView`, together with its `compatibilityScore`/`matchReasons` props. The API still returns those fields; nothing in the app reads them now.
- **Slot notes removed** from Explore cards ("Part of today's set…", "Bonus profile…"), product owner's request.
- **Filter button** at the top right of Explore. It opens a full-screen modal, **"Your feed"**, listing the settings that already change who you see, each with its current value: **Show me** (genders), **Age range**, and the private **Your goal**. Each row opens its own small editor with Save. Decided 2026-10-25: only these. Interests/height/etc. are "about me" answers, and making them filters would be a new matching rule.
- **The progress pill on Explore is black** (`DailyProgress tone="dark"`). The Inbox keeps the purple pill.
- **The profile header is now the name (size `xl`, was `hero`) with the verified tick right beside it, and the pronouns (muted, `sm`) on the line underneath.** Only the tick, no "Verified" word. Explore's ⋯ (Report/Block) moved next to the name via `ProfileView`'s `headerRight`.
- **An unchanged audience is never sent.** The server rebuilds today's set whenever an audience arrives (`profiles.service.ts`), so `audienceUpdate()` returns `null` when the genders (compared as a set) and ages are the same. This is used by the new editors and by `AudienceForm` in Settings.
- `useUpdateProfile` now also invalidates `notices`, so an age-widening notice created by a save shows immediately.
- The empty state "No one to show right now" said "You → Edit" (gone since the profile redesign). It now points to the filter button and has a "Change who you see" action.

**Decision for Bharath (product owner, 2026-10-25): posts stay at 1 to 6 in total**, photos, voice and written together. The "6 photos plus voice/written" question in `docs/PROFILE_EDIT_REDESIGN.md` is closed; Jana asks you to adjust the profile editor to match. `BUSINESS_LOGIC.md` now records the decision.

## 2. Modified & Created Files
- `apps/mobile/app/filters/_layout.tsx`, `index.tsx`, `show-me.tsx`, `age.tsx`, `goal.tsx` (new): the "Your feed" modal stack.
- `apps/mobile/app/_layout.tsx`: registers `filters` with `presentation: 'modal'`.
- `apps/mobile/src/features/filters/audienceUpdate.ts` (new): `audienceUpdate`, `gendersSummary`, `ageSummary`, `goalSummary`, `feedSummary`.
- `apps/mobile/src/components/forms/AudienceForm.tsx`: exports `GenderChips` and `AgeRangeFields`. `AudienceForm` is built from them, keeps its props, and skips an unchanged save.
- `apps/mobile/src/components/perspective/DailyProgress.tsx`: `tone?: 'brand' | 'dark'` (default `brand`).
- `apps/mobile/src/components/profile/ProfileView.tsx`: name + tick on one line, pronouns below.
- `apps/mobile/app/(tabs)/explore.tsx`: top bar (dark pill left; bell + filter right), slot note removed, ⋯ moved to `headerRight`, empty-state copy and action.
- `apps/mobile/src/features/hooks.ts`: one line in `useUpdateProfile`.
- `apps/mobile/test/filters.test.ts` (new): 9 tests. `apps/mobile/test/in-common.test.ts` (new): 4 tests.
- `apps/mobile/src/features/explore/inCommon.ts`, `src/components/profile/InCommonCard.tsx` (new).
- `business-logic/BUSINESS_LOGIC.md` (9.1, new 9.11, Settings pointer, change log, Last updated), `docs/ACTIVE_CHANGES.md`.

## 3. Database & Schema Changes
- **Prisma Schema Modified:** No.

## 4. Contract & API Impact
- None. Uses the existing `PATCH /v1/me` with an idempotency key, via `useUpdateProfile`.

## 5. UI & Design System Adherence
- [x] Tokens only (`ink`, `onDark`, `brand`, spacing, `touchTarget`, `opacity.pressed`, `textStyles.title`).
- [x] Reuses Bharath's `ListGroup`, `ListRow`, `ScreenHeader`.
- [x] 44px+ targets for filter, close, ⋯ and back.
- [x] Screen-reader labels: "Filters: who you see"; rows read "Show me: Women, Men"; the tick reads "Selfie verified".
- [x] No "dating" wording; no Hinge names, assets or copy.

## 5b. Business logic document
- [x] Updated: sections 9.1 and 9.11 (new), the Settings pointer, the change log and "Last updated". The 6-post decision is recorded.

## 6. Verification & Test Evidence
- [x] `pnpm build`, `pnpm typecheck`, `pnpm test`, `pnpm test:e2e`: see the commit's checks.
- [x] Driven in the real web app (Playwright, signed in as test-world people). Checked:
  - the filter opens "Your feed";
  - Age range Save is disabled before a change; lowering Oldest saved (server audience went 30 → 29), the list showed the new value, and restoring it through the UI saved 30 again;
  - Show me Save is disabled with no change;
  - the Inbox pill is still purple;
  - no page errors.
- [x] Bell: badge "2" with a temporary unread notice (inserted for the check and deleted after), tapping opens Notices.
- [x] The "in common" card was checked in the browser for Isha → Kabir, with Kabir's answers patched only inside the test browser (no data changed). It showed "You + Kabir have 3 things in common" with the chips Photography, Hiking & Trails and Chennai. With the real data the card was correctly hidden: today's cards for Isha, Tara, Rohan and Sid share nothing with them.
- [x] Seen on screenshots:
  - Explore top bar (filter, black pill);
  - "Sx ✓" with "he/they" underneath (smaller name, tick beside it).
- [ ] Not yet tried on the iPhone build (modal slide-up, ✕, targets).

## 7. Potential Overlap / Conflict Warning
- **`ProfileView` header changed**: this also changes Bharath's You → View tab, and the change is intended.
- **`AudienceForm` split**: Settings → audience behaves the same, except that an unchanged save is skipped.
- **`hooks.ts`** is a shared file: one added line.
