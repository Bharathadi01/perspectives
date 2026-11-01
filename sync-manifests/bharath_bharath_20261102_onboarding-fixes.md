# Sync Manifest: four small onboarding fixes

- **Author / Agent:** Bharath, with Claude Code
- **Branch:** bharath
- **Date & Time:** 2026-11-02
- **Base Commit:** 593c1ab (Jana, "profile editor, card composer and 'done for today' in the editorial look")

## 1. Summary of Changes
Found by driving the whole onboarding on the web preview with Playwright (fresh account, splash to Explore) at a normal phone (390×844) and a small one (375×667), plus a look at two iOS simulator screenshots. The happy path has no errors and every Next lands on the right screen. Three things needed a change; everything else was left alone.

## 2. Modified & Created Files
- `apps/mobile/app/(auth)/birthday.tsx`: `Keyboard.dismiss()` when the confirm sheet opens, and **Edit** (button and backdrop) puts focus back in the Year box. Before, the Year field stayed focused, so on iOS the number pad's floating **Done** key sat on top of the sheet's buttons (the sheet is fixed to the bottom and is not keyboard-aware).
- `apps/mobile/src/features/onboarding/steps/Finish.tsx` (`HowItWorksStep`): the title, the three steps and the rule card sit in a `ScrollView`; **Got it** stays pinned below. On a 667pt-high screen the button was at 652 to 704 (off the bottom) and nothing on the screen scrolled. Unchanged look on taller phones.
- `apps/mobile/src/features/onboarding/steps/Posts.tsx` (`VoiceStep`): the question `FieldCard` is `multiline`, like the photo post's, so "Do I sound as calm as I think I do?" and longer questions wrap instead of being cut off.
- `apps/mobile/src/features/onboarding/steps/ValueScreens.tsx` (`postCard`): `top` 64 → 100. On the first "What you get" screen the "Style & outfit" card (about 100px tall) covered the start of the sample post's question; the card is now 36px lower, still inside the 410px stage (lowest card ends near 393). Checked with animations on at 390×844 and 375×667.
- `business-logic/BUSINESS_LOGIC.md`: change-log entry 2026-11-02 and "Last updated".

## 3. Database & Schema Changes
- **Prisma Schema Modified:** No

## 4. Contract & API Impact
- None.

## 5. UI & Design System Adherence
- [x] No new colours, fonts or dependencies; only existing tokens and `ScrollView`/`Keyboard` from React Native.
- [x] No change to what any step asks or saves.

## 5b. Business logic document
- [x] Updated: change-log entry and "Last updated".

## 6. Verification & Test Evidence
- [x] `pnpm typecheck`, `pnpm test` (contracts 24, api-client 6, api 83, mobile 138) and `pnpm test:e2e` (61) pass.
- [x] Playwright: all 29 steps visited at 390×844 and 375×667; a new account walked from splash through every step to Explore; back and Next on each; the review links; sign-up errors (invalid date, under 18, duplicate email).
- [x] After the fixes: "Got it" at 583 to 635 on a 667pt screen; birthday **Edit** returns focus to Year; the voice question wraps at both sizes.
- [ ] Not verified by touch on the iOS simulator: the number pad's **Done** key is a native keyboard control that the web preview cannot show. The fix (dismissing the keyboard) is the standard remedy but has not been seen on the simulator. Please look at the birthday sheet once on a device.

## 7. Potential Overlap / Conflict Warning
- All three files are Jana's onboarding screens (`ce0397e`); the edits are a few lines each.
- **Setup gotcha (cost an afternoon of "invisible UI"):** `packages/design-tokens/dist` is gitignored. A copy built before `ce0397e` lacks `accentText`, `scrim`, `sand`, `sandDeep`, `faint` and `accentGlow`, so those render with no colour: the "Chat is open" pill was white text on paper, "Asked to connect" was black, and the dimmed backdrop behind the birthday sheet was missing. After pulling: `pnpm install` then `pnpm build`. `pnpm install` also links `react-native-reanimated` and `react-native-worklets`, which the typecheck fails without.
- **Seen, not changed (product or design calls for Jana):**
  1. The review card's **main post** calls `router.back()`. That is right after More posts, but if review is opened with nothing behind it (a web reload) it does nothing and logs "GO_BACK not handled".
  2. **Change your basics** on the review card opens only the name step, though the card also shows gender, height and city.
  3. A duplicate email is only reported at **Confirm**, on the birthday screen, two screens after the email was typed.
  4. After Sign out, the app fires a few queries that return 401 (`/v1/me`, `/v1/notices`); harmless, but they show up as console errors.
