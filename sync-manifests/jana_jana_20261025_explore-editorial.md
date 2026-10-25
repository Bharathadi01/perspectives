# Sync Manifest: Explore in the editorial look (branch jana)

- **Author / Agent:** Jana / Claude Code (Opus)
- **Branch:** jana
- **Date & Time:** 2026-10-25
- **Base Commit:** 844dd9c (Explore filter, bell, black pill, name header, things in common)

## 1. Summary of Changes
The product owner compared three directions on a design canvas and chose **Editorial**. She asked for **Explore only** for now (ADR-021):
- **New tokens:** `editorial` in `@perspective/design-tokens`.
  - Colours: paper `#F6F1E7`, ink `#241D15`, muted `#6E6456`, line `#E3D8C3`, clay accent `#B5502A`, plus on-ink and waveform colours.
  - Font family names.
- **Fonts:** Fraunces 600 and 500 italic, and Inter 400/500/600/700.
  - From `@expo-google-fonts/*`, imported per weight so six files are bundled.
  - Loaded once with `expo-font`'s `useFonts` in `app/_layout.tsx`. If loading fails, the app logs it and falls back to the system font.
- **Explore renders `features/explore/ExploreProfile`** instead of `ProfileView`. From the top:
  - serif name + clay tick;
  - "pronouns · age · city";
  - first post (`EditorialPostCard`: category and italic question on top, then the photo with a labelled "Give a perspective"/"Given" pill, then an optional voice row);
  - the in-common card;
  - "More about [name]": a white block, capped at 5 chips (`moreAbout()` / `MORE_ABOUT_MAX` in `inCommon.ts`, product owner 2026-10-25);
  - personality answer;
  - the remaining posts.
- **Decided: gender is no longer shown on Explore; height moved into the name line as feet and inches (`formatFeetInches` in `lib/labels.ts`)** (the product owner chose "follow the mock"). `BasicsRow` is not used there any more; other screens still show it.
- **`InCommonCard`** is restyled to the editorial look, with a big count and "things you + X have in common". Its only user is Explore.
- **Phosphor icons on Explore** (product owner, 2026-10-25, regular weight; filled for the verified seal and play/pause). Uses `phosphor-react-native` 3.0.6 and `react-native-svg` 15.16.0 (installed with `expo install`).
  - Icons are imported one by one through `src/components/ui/icons.ts`.
  - A `paths` entry in `apps/mobile/tsconfig.json` maps `phosphor-react-native/src/icons/*` to its `.d.ts` files, because Phosphor's per-icon `.tsx` sources fail our strict `tsc`. At runtime, Metro uses the package `exports` map.
  - `IconButton` gets an optional `renderIcon`, used for the skip ✕. Explore no longer uses `VerifiedBadge`; `Avatar.tsx` is unchanged.
- **Unlocked pill and toasts restyled** (product owner, 2026-10-25: "out of sync with the design").
  - `DailyProgress tone="dark"` now stays editorial ink when unlocked, with a Phosphor check.
  - `Toast` success and info use editorial ink and Inter with a Phosphor icon; error stays `danger`. **The toast is app-wide**, so every screen's toasts change.
  - The icon list moved to `src/components/ui/icons.ts`, since it is no longer Explore-only.
- **Floating glass tab bar, app-wide** (product owner, 2026-10-25, from a Hinge-style reference video; no Hinge assets or code used).
  - `components/ui/GlassTabBar.tsx` is passed as `tabBar` in `app/(tabs)/_layout.tsx`, with geometry in `components/ui/tabBarGeometry.ts` (unit-tested).
  - The original Ionicons tab icons (outline, filled when selected) over Inter labels. Phosphor tab icons were tried and reverted at the product owner's request. The "You" tab shows the first photo.
  - The selection capsule lifts into a lens on tap or drag, springs to the tab (about 0.6 s), magnifies the tab under it, fires `lib/haptics.selection()` per tab, then settles.
  - `expo-glass-effect` provides Liquid Glass on iOS 26 (native). Elsewhere a frosted fill, with a CSS backdrop blur on web.
  - Reduce Motion and Reduce Transparency are respected.
  - It stays in the normal layout flow (not absolutely positioned), so no screen needed extra bottom padding.
  - Built with RN `Animated` + `PanResponder`, without Reanimated. Refraction and colour fringes are not reproduced.
  - Sharpness: tabs are drawn at the magnified size and shrunk to `1/MAGNIFY` at rest. Scaling them up made the icon under the lens pixelated (reported by the product owner). The bar grows by animating its horizontal margin, not with a scale transform.
- **`ProfileView`'s `afterPrimary` slot was removed.** It was added earlier today and is no longer used.

## 2. Modified & Created Files
- `packages/design-tokens/src/editorial.ts` (new), `packages/design-tokens/src/index.ts` (export).
- `apps/mobile/package.json`, `pnpm-lock.yaml`: the two font packages.
- `apps/mobile/app/_layout.tsx`: font loading.
- `apps/mobile/src/theme/index.ts`: `theme.editorial`.
- `apps/mobile/src/features/explore/ExploreProfile.tsx`, `EditorialPostCard.tsx` (new).
- `apps/mobile/src/features/explore/inCommon.ts`: `nameLine()`.
- `apps/mobile/src/components/profile/InCommonCard.tsx`: restyled.
- `apps/mobile/src/components/profile/PostCard.tsx`: `Waveform` exported, with optional `colors`. The default look is unchanged.
- `apps/mobile/src/components/ui/GlassTabBar.tsx`, `tabBarGeometry.ts` (new), `apps/mobile/app/(tabs)/_layout.tsx` (custom tab bar), `apps/mobile/test/tab-bar-geometry.test.ts` (new, 4 tests), `apps/mobile/package.json` (`expo-glass-effect`),
- `apps/mobile/src/components/ui/icons.ts` (new), `apps/mobile/src/components/ui/Toast.tsx` (editorial toast), `apps/mobile/src/components/perspective/DailyProgress.tsx` (unlocked state of the dark pill), `apps/mobile/tsconfig.json` (paths), `apps/mobile/src/components/ui/IconButton.tsx` (optional `renderIcon`).
- `apps/mobile/src/components/profile/ProfileView.tsx`: `afterPrimary` removed.
- `apps/mobile/app/(tabs)/explore.tsx`: paper background, editorial ink on the icons, `ExploreProfile`.
- `apps/mobile/test/in-common.test.ts`: `nameLine` tests.
- `docs/DECISIONS.md` (ADR-021), `docs/ARCHITECTURE.md` (stack table), their `perspective-context/` copies.
- `business-logic/BUSINESS_LOGIC.md`, `docs/ACTIVE_CHANGES.md`.

## 3. Database & Schema Changes
- **Prisma Schema Modified:** No.

## 4. Contract & API Impact
- None.

## 5. UI & Design System Adherence
- [x] Colours and fonts come from `theme.editorial`. Remaining literals are a few spacing and radius values in the new Explore-only files (20 px card radius, 11–30 px editorial type sizes). They will move into tokens when the look rolls out to all screens.
- [x] 44px targets: give pill, play button, top-bar icons and ⋯.
- [x] Labels: "Give a perspective on: <question>"; "You already gave a perspective on: …" (disabled); the tick reads "Selfie verified".
- [x] Muted text `#6E6456` on paper is about 5:1.

## 5b. Business logic document
- [x] Updated: section 9.1 (the editorial layout; gender no longer on Explore, height in the name line), the change log and "Last updated".

## 6. Verification & Test Evidence
- [x] `tsc` is clean; mobile has 95 tests (2 new `nameLine` tests).
- [x] Driven in the web app as Isha, with Kabir's answers patched only in the test browser to show every section.
  - All six fonts loaded (`document.fonts`), with no page errors.
  - Screenshots show the name and tick, "he/him · 28 · Chennai", the italic question above the photo with the give pill, "4 things you + Kabir have in common", "More about Kabir" and the personality answer.
- [x] Phosphor icons render in the web app.
- [x] Tab bar driven in the web app. Tap: the lens lifts, travels and is settled within about 0.7 s. Drag from Inbox towards Connections: the lens follows the finger, lifted and magnifying the tab under it, then lands on Connections. `aria-selected` is set on the selected tab.
- [ ] Not yet seen on the iPhone build. **`react-native-svg` is native, so the development build must be rebuilt once.** Fonts need no rebuild.

## 7. Potential Overlap / Conflict Warning
- **For Bharath, after pulling:** `pnpm install` (new packages), then `pnpm build` (the tokens package is compiled, and Metro reads its `dist`).
- `PostCard.tsx` (`Waveform` export) and `IconButton.tsx` (`renderIcon`) got additive, optional props only. If you run a development build, rebuild it once after pulling (`npx expo run:ios`); Expo Go needs nothing.
