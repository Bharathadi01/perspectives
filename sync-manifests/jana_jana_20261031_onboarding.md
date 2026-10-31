# Sync Manifest: the new onboarding from the design canvas (branch jana)

- **Author / Agent:** Jana / Claude Code (Opus)
- **Branch:** jana
- **Date & Time:** 2026-10-31
- **Base Commit:** 90dc56d + the uncommitted 2026-10-27 work (`jana_jana_20261027_native-tabs-profile-safety.md`, `jana_jana_20261027_give-composer.md`)

## 1. Summary of Changes
The onboarding design canvas (36 screens, Claude design artifact RYKw5TgnHqwA3SqBhUDHTH) is built into the app, from the splash to Explore.

- **Sign-up** is a splash, Welcome, then email, password with the terms box, and birthday with a confirm sheet. Sign-up is called once, at Confirm, with the existing `SignUpInputSchema`.
- **Onboarding** is one route per step: `app/onboarding/[step].tsx` renders `STEP_SCREENS[step]`.
  - The step order, progress values and resume rules are pure functions in `src/features/onboarding/flow.ts`.
  - Each step saves its own field with `PATCH /v1/me` on Next (`useSaveStep`), replacing the old single save at the end.
  - `app/onboarding/index.tsx` resumes at the first required answer still missing.
- **Posts:** the first photo post, extra photo posts and a voice post are made inside onboarding, using the existing upload and create-post hooks and the composer's focus-area helpers.
- **Selfie:** the camera screen has a **Dev** pill, shown only under `__DEV__`. It sends `DEV_SELFIE_PNG` through the real upload and verify calls; the stub verifier approves it.
- **Motion:** Reanimated 4 CSS keyframes in `src/features/onboarding/motion.tsx` (rise, pop, float, pulse ring, stamp, typewriter, press scale).
  - With Reduce Motion on, every animation is set to `animationName: 'none'`, so views stay mounted and nothing moves.
  - The marching dashed oval uses Reanimated animated props on react-native-svg.
- **Notifications:** `push.ts` gains `enablePushNow` (the onboarding button) and `deferPushPrompt` ("Not now": the tab layout then registers only if permission was already given, until the app restarts).
- **Explore** shows a one-time coach note when opened with `?welcome=1`.

## 2. Files
- **New:**
  - `app/(auth)/splash.tsx`, `email.tsx`, `password.tsx`, `birthday.tsx`;
  - `app/onboarding/_layout.tsx`, `[step].tsx`;
  - `src/features/onboarding/`: `flow.ts`, `values.ts`, `drafts.ts`, `nav.ts`, `save.ts`, `motion.tsx`, `ui.tsx`, `art.tsx`, `WheelPicker.tsx`, `AgeRange.tsx`, `steps/*`;
  - `src/lib/devSelfie.ts`.
- **Rewritten:**
  - `app/(auth)/welcome.tsx`;
  - `app/onboarding/index.tsx`;
  - `test/onboarding.test.ts`, which now tests the flow, resume, height, birthday, email and slider maths instead of the removed store.
- **Deleted:**
  - `app/(auth)/signup.tsx`;
  - `src/components/onboarding/Step*.tsx` (7 files);
  - `src/session/onboardingStore.ts`.
- **Changed:**
  - `app/index.tsx` (signed out → splash);
  - `app/_layout.tsx` (fade for splash and welcome; no swipe back out of onboarding);
  - `app/(auth)/login.tsx` (links and dev shortcuts point at the new routes);
  - `app/(tabs)/explore.tsx` (the coach note);
  - `src/push/push.ts`;
  - `src/components/forms/SelfieStep.tsx` (imports the shared dev image);
  - `packages/design-tokens/src/editorial.ts` (`sand`, `sandDeep`, `accentText`, `faint`, `scrim`, `accentGlow`).
- **Docs:** `business-logic/BUSINESS_LOGIC.md` (sections 3, 4.1, 5, 8.3, 9.1, 16, 17, 18, 20), `docs/ACTIVE_CHANGES.md`, and `docs/PRODUCT.md` + its `perspective-context/` copy (confirmed by Jana 2026-10-31: the selfie after the questions about you, a new Onboarding paragraph, notification permission asked during onboarding).

## 3. Schema / Contracts / API
- None. No new dependency: Reanimated and react-native-svg were already installed, so no ADR or stack-table change.

## 4. Verification
- [x] Design tokens rebuilt; mobile `tsc` clean; mobile tests 138 passed (13 suites).
- [x] Metro bundles the app for iOS and web.
- [x] Web preview, driven with Playwright as a brand-new account, splash to Explore with no page or console errors:
  - sign-up with the confirm sheet;
  - every step, including the height wheel in both units;
  - the safety sheet;
  - Dev selfie;
  - first photo post with a category and focus area;
  - review, notifications "Not now", ready;
  - Explore with the coach note.
  - Run again with `reducedMotion: 'reduce'`: every screen shows its finished state.
- [ ] Not checked here:
  - on a phone or the iOS simulator by touch;
  - the voice post recorder;
  - "Turn on notifications" on a development build;
  - the review screen's edit links;
  - resuming a half-finished account in the app (the resume rule itself is unit-tested);
  - a small (SE) screen.
- [x] Before pushing: `pnpm build`, `pnpm typecheck`, `pnpm test` (contracts 24, api-client 6, api 83, mobile 138) and `pnpm test:e2e` (61) all pass.
- [x] iOS 26 simulator (iPhone 17, existing development build, no native rebuild): the app loads the new bundle; the splash and Welcome render with the quote cards cycling.

## 5. Overlap
- **For Bharath:**
  - `/me/edit?from=onboarding` is no longer opened by onboarding. The editor still accepts the param; nothing else changed there.
  - `GoalPicker`, `BasicsForm` and `AudienceForm` are untouched and still used by Settings and filters.
- **Development builds still sign in as Ravi automatically** (`tokenStore.ts`), so the splash and Welcome only appear after Sign out.
- **Local setup:** `apps/mobile/.env` (not committed) holds the Mac's LAN address for `EXPO_PUBLIC_API_URL`. When the Mac's address changes, update it and restart Metro with `--clear`.
