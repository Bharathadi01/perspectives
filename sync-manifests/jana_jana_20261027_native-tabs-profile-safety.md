# Sync Manifest: native iOS 26 tab bar, editorial profile page and safety sheet (branch jana)

- **Author / Agent:** Jana / Claude Code (Opus)
- **Branch:** jana
- **Date & Time:** 2026-10-27
- **Base Commit:** 90dc56d (Bharath's Inbox / Connections redesign)

## 1. Summary of Changes
- **Native tab bar on iOS 26+.** `app/(tabs)/_layout.tsx` renders `NativeTabs` (`expo-router/native-tabs`) when `NATIVE_GLASS_TABS` (iOS and `isLiquidGlassAvailable()`); otherwise the existing `Tabs` + `GlassTabBar`.
  - Icons are the same Ionicons, converted with `Ionicons.getImageSource` (both states awaited together) and passed as `renderingMode="template"` so iOS tints them (clay `tintColor` when selected).
  - Passing `NativeTabs.Trigger.VectorIcon` elements raced: a selected icon could arrive first, and react-native-screens throws "To use selectedIcon prop, the icon prop must also be provided".
  - The "You" avatar is not used in the native bar: a remote photo as `src` was drawn across the whole bar.
  - Badges on Inbox and Connections are passed as `NativeTabs.Trigger.Badge`.
- **`useTabBarSpace()`** (in `GlassTabBar.tsx`) now returns the safe-area bottom plus 50 pt under the native bar, which reports no height. This is measured on an iOS 26 iPhone 17 and fixes Explore's skip ✕, which had been hidden behind the bar.
- **`app/profile/[id].tsx`** (opened from Inbox Connect, chats, the given list) now uses `ExploreProfile`, with `thingsInCommon` against `useMe()`.
  - Paper background and Phosphor back and ⋯ icons.
  - The note is now a clay icon with "{name} left you a perspective" and "Give one back on any of {name}'s posts below." (the product owner found the old clay-text box ugly).
  - Bottom actions use Bharath's `SheetAction` (`primary` and `plain`).
  - "Request sent" is now text instead of a disabled button. All logic is unchanged.
- **`components/SafetyMenu.tsx`** is rebuilt on Bharath's `components/editorial/PaperSheet` + `SheetAction`: a white block of rows with Phosphor Flag, Prohibit and CaretRight icons, plus a Cancel/Back action. Report and block behaviour is unchanged. It is used by Explore, Inbox, profile and chat.
- `components/ui/icons.ts`: + CaretLeft, CaretRight, Flag, Prohibit.
- `ProfileView.tsx` and `BasicsRow.tsx` are now unused (left in place; delete when convenient).

## 2. Database & Schema Changes
- None.

## 3. Contract & API Impact
- None.

## 4. Verification & Test Evidence
- [x] `tsc` clean; mobile unit tests (see commit).
- [x] Built with `npx expo run:ios` for the **iOS 26.0 simulator (iPhone 17)**, 0 errors.
  - Screenshots show the system glass bar floating over a photo and over the cream screen.
  - Ionicons are tinted correctly, the selected tab is clay with the glass capsule, and "Connections" is not truncated.
  - A cold start gives no "selectedIcon" error.
  - The profile page renders in the editorial layout.
- [x] Safety sheet (menu and report steps) opened and screenshotted in the web preview (same component).
- [ ] **Not exercised:** pressing or dragging on the native bar (the lens, magnification, refraction and scrub). The simulator cannot be tapped from here. Dark mode is not tested (the app is light-only). The real phone is not tested (needs iOS 26+ and a rebuild).

## 5. Potential Overlap / Conflict Warning
- `SafetyMenu.tsx` is shared and now depends on `components/editorial/PaperSheet` (Bharath's).
- Development builds need the native rebuild already noted (react-native-svg, expo-glass-effect). Native tabs use react-native-screens, which is already in the build.
