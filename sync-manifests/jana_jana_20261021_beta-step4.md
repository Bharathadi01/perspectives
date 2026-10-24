# Sync Manifest: Beta step 4, the blocked people list (branch jana)

- **Author / Agent:** Jana / Claude Code (Opus)
- **Branch:** jana
- **Date & Time:** 2026-10-21
- **Base Commit:** 067851f (beta step 3)

## 1. Summary of Changes
Builds step 4 of `docs/BETA_PLAN.md`: You → Blocked people, the list of everyone you blocked with Unblock (`docs/PRODUCT.md` → Five tabs → You). Unblocking existed on the server; this adds the list endpoint and the screen.

## 2. Modified & Created Files
- `packages/contracts/src/safety.ts`: `BlockedPersonSchema` (a profile summary and when they were blocked).
- `apps/api/src/safety/safety.service.ts`, `safety.controller.ts`: `GET /v1/blocks` (newest first, only the blocker's own blocks).
- `packages/api-client/src/client.ts`: `safety.blocked()`.
- `apps/mobile`: new `app/me/blocked.tsx` (list, Unblock with a confirmation sheet); `features/hooks.ts` (`useBlocked`, `useUnblock`); `api/queryKeys.ts`; `(tabs)/you.tsx` (Blocked people button).
- Tests: new `apps/api/test/e2e/blocked-list.e2e-spec.ts`.
- Docs: `business-logic/BUSINESS_LOGIC.md` (sections 5.4, 14.2, 17, 20), `CLAUDE.md` (check counts), mirror.

## 3. Database & Schema Changes
- **Prisma Schema Modified:** No.

## 4. Contract & API Impact
- **New endpoint:** `GET /v1/blocks`. **DTO:** `BlockedPerson { person: ProfileSummary, blockedAt }`. No email, birthday or private settings.

## 5. UI & Design System Adherence
- [x] Design tokens only; Unblock buttons are labelled per person for screen readers.

## 5b. Business logic document
- [x] Updated (sections, change log, "Last updated").

## 6. Verification & Test Evidence
- [x] Build, typecheck, `pnpm test` and `pnpm test:e2e` (56 passing, 1 new).
- [x] Committed locally on jana (not pushed).

## 7. Potential Overlap / Conflict Warning
Shared files: `packages/contracts/src/safety.ts`, `packages/api-client/src/client.ts`, `apps/mobile/src/features/hooks.ts`.
