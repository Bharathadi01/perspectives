# Sync Manifest: Beta step 5, push notifications (branch jana)

- **Author / Agent:** Jana / Claude Code (Opus)
- **Branch:** jana
- **Date & Time:** 2026-10-21
- **Base Commit:** 3b0d3a5 (beta step 4)

## 1. Summary of Changes
Builds step 5 of `docs/BETA_PLAN.md`: push notifications. The product owner chose all seven events for now with placeholder texts (`docs/PRODUCT.md` → Push notifications): connect request, connected, new message, the daily "profiles ready" reminder, new perspective, quiet-chat nudges, and account updates and notices. No push carries message or perspective text. Real delivery needs a development build on a real phone and `eas init`.

## 2. Modified & Created Files
- **API:** new `push/push.service.ts` (`PushSender` with `ExpoPushSender` and `LogPushSender`, `PushService.notify` in the background with dedupe and dead-device switch-off, `DailyPushScheduler`) and `push/push.controller.ts` (`POST` / `DELETE /v1/me/push-tokens`, also open to banned people). Events in `connect.service.ts` (request, accept, message, quiet nudges), `perspectives.service.ts` (new perspective), `notices.service.ts` (new notice), `admin.service.ts` (ban, extend, appeal decision). `app.module.ts`, `config/app-config.ts` (`PUSH_SENDER`, `PUSH_DAILY_HOUR`, `EXPO_ACCESS_TOKEN`), `.env.example`.
- **Contracts:** new `push.ts` (token input, push data). **API client:** `push.register`, `push.remove`.
- **Mobile:** new dependencies `expo-notifications`, `expo-device` (SDK 58 versions); new `src/push/push.ts` (permission, token, tap navigation, sign-out removal); `app/_layout.tsx`, `app/(tabs)/_layout.tsx`, `features/hooks.ts` (sign-out), `app.json` (plugin).
- **Tests:** new `test/e2e/push.e2e-spec.ts` (5); `test/e2e/setup-env.ts` (`PUSH_SENDER=log`).
- **Docs:** `business-logic/BUSINESS_LOGIC.md` (sections 2, 8.3, 17, 19, 20), `docs/PRODUCT.md` (Push notifications, placeholder), `docs/DECISIONS.md` (ADR-020; ADR-019 heading restored), `docs/ARCHITECTURE.md`, `docs/DATABASE.md`, `docs/ACTIVE_CHANGES.md`, `README.md`, `CLAUDE.md`, mirrors.

## 3. Database & Schema Changes
- **Prisma Schema Modified:** Yes. Migration `beta5_jana_push_tokens` (additive): `push_tokens`, `push_log`. After pulling: `pnpm install`, `pnpm db:migrate`, and migrate the test database.

## 4. Contract & API Impact
- **New endpoints:** `POST /v1/me/push-tokens`, `DELETE /v1/me/push-tokens`.

## 5. UI & Design System Adherence
- [x] No new screens; the system permission prompt appears once the person is in the main app.

## 5b. Business logic document
- [x] Updated (sections, change log, "Last updated").

## 6. Verification & Test Evidence
- [x] Build, typecheck, `pnpm test` (134) and `pnpm test:e2e` (61, 5 new). The web preview still bundles.
- [ ] Not tested on a phone: needs `eas init` and a development build.
- [x] Committed on jana and pushed to origin/jana.

## 7. Potential Overlap / Conflict Warning
Shared files: `pnpm-lock.yaml` (new mobile dependencies; run `pnpm install`), `packages/contracts/src/index.ts`, `packages/api-client/src/client.ts`, `apps/mobile/src/features/hooks.ts`, `schema.prisma`.
