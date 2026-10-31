# Sync Manifest: give a perspective in a composer over the feed (branch jana)

- **Author / Agent:** Jana / Claude Code (Opus)
- **Branch:** jana
- **Date & Time:** 2026-10-27
- **Base Commit:** 90dc56d + the uncommitted native tabs / profile / safety work (see `jana_jana_20261027_native-tabs-profile-safety.md`)

## 1. Summary of Changes
The separate Give screen (`app/give/[postId].tsx`) is gone. "Give a perspective" on Explore and on the profile page opens `features/give/GiveComposer.tsx`, a transparent Modal with:
- a Reanimated spring slide-up (a fade with Reduce Motion) and a dimmed backdrop;
- the panel kept above the keyboard with `useAnimatedKeyboard`;
- drag-down, backdrop tap or Android back to close, keeping a draft.

Inside the panel:
- the spark (`sparkHintsFor(...)[0]`) fades inside the empty input;
- a guidance line;
- a horizontal chip row (`chipsFor`, max 3, spring pop, shake and warn haptic at the limit);
- the connect switch (same eligibility as before, off by default; "Send + connect");
- a counter that becomes a tick;
- a round send button (spinner, success haptic).

The submit logic, toasts and `/connected` handling were moved over unchanged. Pure helpers live in `features/give/compose.ts` (readiness, toggleChip, in-memory drafts), with 6 tests.

**Identity policy (asked in the brief):** already decided in `docs/PRODUCT.md`. Anonymous feedback is out of scope, and the owner sees the perspective with the request attached. Nothing new invented.

**Partial failure (asked in the brief):** cannot happen. The server takes `connect` in the same call, so the perspective and the request succeed or fail together. `not_sent` outcomes (pending, cooldown, connected, cap) are shown as before.

## 2. Files
- New: `features/give/GiveComposer.tsx`, `features/give/compose.ts`, `lib/useReduceTransparency.ts`, `test/give-compose.test.ts`.
- Deleted: `app/give/[postId].tsx` (and its `Stack.Screen` in `app/_layout.tsx`).
- Changed:
  - `app/(tabs)/explore.tsx`, `app/profile/[id].tsx` (host the composer);
  - `components/ui/GlassTabBar.tsx` (uses the moved hook);
  - `components/connect/ConnectedMomentWatcher.tsx` (`/give` prefix dropped; the composer sets `busyFlag`);
  - `components/ui/icons.ts` (+ArrowUp, Sparkle, UserPlus);
  - `apps/mobile/package.json` + lockfile (react-native-reanimated 4.7.1, react-native-worklets 0.13.0 as direct deps, the same versions already in the native build).

## 3. Schema / Contracts / API
- None.

## 4. Verification
- [x] `tsc` clean; mobile tests 127.
- [x] Web preview, driven:
  - open with the spark;
  - typing fades the spark (counter 40→24);
  - 4 chip taps leave 3 picked;
  - connect switch shown for a non-connected profile and hidden for a connected one;
  - "Send perspective and connect" label;
  - a failed send (network aborted in the test browser) keeps the composer open with the text and picks;
  - closing by tapping the backdrop then reopening restores the draft;
  - a real send closes the composer, shows "Perspective sent…" and moves Explore on (Ravi → Chitra, connect off, in local test data).
- [x] iOS 26.0 simulator (iPhone 17): composer open above the keyboard, spark visible. Clear glass alone was unreadable over the card, so a paper veil was added and re-checked. These were opened with a temporary auto-open that has been removed, because the simulator cannot be tapped from here.
- [ ] Not done on iOS: typing, chips, the switch, swipe-to-dismiss and send by touch. Small-phone (SE) height is not checked; the panel caps its height above the keyboard and scrolls.

## 5. Overlap
- `ConnectedMomentWatcher.tsx` (Bharath's) loses the `/give` prefix.
- Anything that navigated to `/give/[postId]` must open the composer instead. Only Explore and the profile page did.
