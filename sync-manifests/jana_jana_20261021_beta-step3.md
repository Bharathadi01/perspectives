# Sync Manifest: Beta step 3, holds, bans, appeals, weak givers and the admin dashboard (branch jana)

- **Author / Agent:** Jana / Claude Code (Opus)
- **Branch:** jana
- **Date & Time:** 2026-10-21
- **Base Commit:** 9456826 (beta step 2)

## 1. Summary of Changes
Builds step 3 of `docs/BETA_PLAN.md` as `docs/PRODUCT.md` → Reports, holds and bans and `docs/SECURITY.md` → Admin access and enforcement describe, with the details the product owner settled on 2026-10-21 (written into PRODUCT.md → Details): holds (3 reporters, or one credible serious report) that hide a person from anyone new until an admin decides, without telling them; "not helpful" marks for insulting (one report) and sexual or unsafe (serious report); admin-only bans (3 days, permanent, extend by 3 days, restore) with a ban screen in the app and one appeal per ban; temporary bans ending by themselves; permanent bans blocking the email; the weak-giver loop on a fixed 60% line (tip, 0.2 lower in Explore, no brand-new members in their set, then the admin's list); and the separate web-only admin dashboard with its own sign-ins, 6-digit authenticator codes, 8-hour sessions and an audit log.

## 2. Modified & Created Files
- **Domain:** new `apps/api/src/domain/enforcement.ts` (holds, safety marks, the weak-giver line, ban dates) and `apps/api/src/admin/totp.ts` (RFC 6238 codes). `domain/assignment.ts`: `shielded` (brand-new members kept from a weak giver's set).
- **Services:** new `enforcement/enforcement.service.ts` (reports with `subjectId`, holds, `onFeedback`, `reassessGiver`, held and weak lookups, ban-end sweeper); new `admin/*` (sign-in, guard, review list, person page, actions, appeal decisions, audit); new `safety/restriction.service.ts` (ban screen, appeal). Changed: `auth.service.ts` (banned people can sign in; blocked emails), `common/auth.guard.ts` and `decorators.ts` (`@AllowRestricted`, ban end), `safety.*` (reports through enforcement; `GET /v1/account/restriction`, `POST /v1/account/appeal`), `perspectives.service.ts` (`feedbackAt`, marks feed enforcement), `daily/candidates.service.ts` (held excluded, weak penalty, reporters via `subjectId`), `daily.service.ts` (daily quality re-check), `profiles.service.ts` (held hidden from new people), `connect.service.ts` (`CONNECTION_PAUSED`), `notices.service.ts` (new kinds), `app-exception.ts`, `app.module.ts`, `config/app-config.ts`, `.env.example`.
- **Command:** `apps/api/prisma/create-admin.ts` (`pnpm admin:create -- --email ... [--reset]`).
- **Contracts:** new `admin.ts`; `safety.ts` (`RestrictionSchema`, `AppealInputSchema`, `SERIOUS_REPORT_REASONS`); `notice.ts` (weak-giver tip, account restored); `error.ts` (`ACCOUNT_BANNED`, `EMAIL_BLOCKED`, `APPEAL_NOT_ALLOWED`, `CONNECTION_PAUSED`).
- **API client:** `account.restriction`, `account.appeal`; new `admin.ts` as a separate entry point `@perspective/api-client/admin` (package `exports`), not in the mobile bundle.
- **Mobile:** new `app/restricted.tsx` (ban screen), `components/DeleteAccountSheet.tsx` (shared with You); `_layout.tsx` and `index.tsx` send banned people to the ban screen; notices for the new kinds; error messages; hooks `useRestriction`, `useAppeal`.
- **New app:** `apps/admin` (Expo Router, web only): sign-in, review list, person page with actions and appeal decisions.
- **Tests:** `test/unit/enforcement.spec.ts` (15, including RFC vectors), `test/e2e/beta-step3.e2e-spec.ts` (8).
- **Docs:** `business-logic/BUSINESS_LOGIC.md` (sections 2, 3, 4, 11.3, 13.3, 14 with new 14.6 to 14.9, 15, 16, 17, 18, 19, 20), `docs/PRODUCT.md` (details), `docs/SECURITY.md`, `docs/DECISIONS.md` (ADR-019 note), `docs/ARCHITECTURE.md`, `docs/DATABASE.md`, `docs/ACTIVE_CHANGES.md`, `README.md`, `CLAUDE.md`, mirrors in `perspective-context/`.

### Password-only admin sign-in for now (product owner, 2026-10-21)
- New setting `ADMIN_REQUIRE_CODE` (default false): the 6-digit code is checked only when it is true. The admin login page treats the code as optional. The dev seed creates `admin@perspective.test` / `perspective123`. Docs say to switch codes on before the beta. One more e2e test (password-only sign-in); the step-3 test file runs with codes on.

## 3. Database & Schema Changes
- **Prisma Schema Modified:** Yes. Migration `20261020194421_beta3_jana_holds_bans_admin` (additive): `UserStatus` gains `banned`; `users.suspendedUntil`; `reports.subjectId` and `fromFeedback` (backfilled); `perspectives.feedbackAt` (backfilled from `createdAt` for marked ones); `NoticeKind` gains `weak_giver_tip`, `account_restored`; new tables `review_cases`, `bans`, `appeals`, `giver_quality`, `admin_users`, `admin_audit_log`, `blocked_emails`.
- After pulling: `pnpm install`, `pnpm db:migrate`, and migrate the test database (`DATABASE_URL=<test db> pnpm --filter @perspective/api exec prisma migrate deploy`).

## 4. Contract & API Impact
- **New endpoints:** `GET /v1/account/restriction`, `POST /v1/account/appeal` (only for suspended or banned people); `POST /v1/admin/session`, `GET /v1/admin/queue`, `GET /v1/admin/people/:id`, `POST /v1/admin/people/:id/actions`, `POST /v1/admin/appeals/:id/decision` (admin token only).
- **Behavior:** suspended and banned people can now sign in and refresh, but every route except the ban screen, the appeal and deletion answers `ACCOUNT_SUSPENDED` / `ACCOUNT_BANNED`. Messages to a suspended or banned person answer `CONNECTION_PAUSED`. Signing up with a permanently banned email answers `EMAIL_BLOCKED`.

## 5. UI & Design System Adherence
- [x] Ban screen and admin page use design tokens only; 44 px tap targets; headers and alerts have accessibility roles.

## 5b. Business logic document
- [x] `business-logic/BUSINESS_LOGIC.md` updated (sections, change log, "Last updated").

## 6. Verification & Test Evidence
- [x] `pnpm -r --workspace-concurrency=1 run build` and `pnpm typecheck`: clean (including `apps/admin`).
- [x] `pnpm test`: 134 passing (contracts 24, api-client 6, API 83, mobile 21).
- [x] `pnpm test:e2e`: 55 passing (9 new).
- [x] By hand: `pnpm admin:create` made an admin, and it signed in with a generated code; the admin page and the app both bundle for web; the app bundle has no admin client.
- [x] Committed locally on jana (not pushed) after the product owner tried the admin page; tested together with steps 1, 2, 4 and 5.

## 7. Potential Overlap / Conflict Warning
Shared files: `schema.prisma` (row in `docs/ACTIVE_CHANGES.md`), `packages/contracts/src/index.ts`, `packages/api-client/src/client.ts` and its `package.json` (new `exports`), `apps/mobile/src/features/hooks.ts`, `pnpm-lock.yaml` (new `apps/admin` package; run `pnpm install`, never hand-merge). Anyone who relied on suspended people being refused at sign-in: they now sign in to the ban screen.
