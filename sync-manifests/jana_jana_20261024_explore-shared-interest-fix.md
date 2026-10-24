# Sync Manifest: Explore shared-interest note bug fix + repo hygiene (branch jana)

- **Author / Agent:** Jana / Claude Code (Opus)
- **Branch:** jana
- **Date & Time:** 2026-10-24
- **Base Commit:** fc2497a (the 100-person test world)

## 1. Summary of Changes
Found during an independent round of browser-driven testing of steps 1 to 5 (direct interaction with the running app and admin page, not just API calls), separate from Bharath's own pass: Explore never actually showed the "You both share passion for X & Y" note. The server (`apps/api`) has always computed `compatibilityScore`/`matchReasons` correctly; the mobile screen just never read them. One-line fix. No rule changed, no server change, no new behavior invented — this restores documented behavior (`business-logic/BUSINESS_LOGIC.md` section 9.1 already described the note as working).

Also added `apps/mobile/ios/` and `apps/mobile/android/` to `.gitignore`. These are regenerable native projects created locally (by `expo prebuild` / `expo run:ios`) while getting the app running on a personal iPhone for testing; they're machine- and Apple-ID-specific and were never meant to be shared. The bundle identifier and npm-script changes that same local build produced (`apps/mobile/app.json`, `apps/mobile/package.json`) are intentionally **not** in this commit — they're stashed locally only, since they're tied to one developer's personal Apple ID and the team is about to work in parallel with Bharath on a shared branch.

## 2. Modified & Created Files
- `apps/mobile/app/(tabs)/explore.tsx`: pass `compatibilityScore` and `matchReasons` from the Explore card to `ProfileView` (which already renders them correctly; see `src/components/profile/ProfileView.tsx`).
- `.gitignore`: ignore `apps/mobile/ios/` and `apps/mobile/android/`.
- `business-logic/BUSINESS_LOGIC.md`: change log entry, "Last updated".

## 3. Database & Schema Changes
- **Prisma Schema Modified:** No.

## 4. Contract & API Impact
- None. Mobile-only rendering fix.

## 5. UI & Design System Adherence
- [x] No new UI; makes an existing, already-designed element actually appear.

## 5b. Business logic document
- [x] Updated (change log, "Last updated"). No numbers table or behavior-description change needed — section 9.1 already described the intended behavior correctly.

## 6. Verification & Test Evidence
- [x] Confirmed by hand against the real running app and a direct API call (`compatibilityScore: 1`, `matchReasons: [{"kind":"shared_interest","text":"You both share passion for Photography & Hiking & Trails"}]`) before and after the fix.
- [ ] No new automated test added (view-layer prop wiring; the existing contract/unit tests already cover `ProfileView` rendering `matchReasons` when present).

## 7. Potential Overlap / Conflict Warning
None. Single-line change in a mobile-only file Bharath has not touched. `.gitignore` addition is safe for everyone (ignores a folder nobody should be committing).
