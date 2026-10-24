# Profile tab redesign: View | Edit, Settings, and the card editor

**Branch:** `bharath` · **Date:** 2026-10-25 / 26 · **Mobile only.** No contract, schema, API, `features/hooks.ts` or api-client change.

This file is the plain account of what was done in this piece of work and why. The behaviour is also described in `business-logic/BUSINESS_LOGIC.md` (sections 5.3, 5.4, 6.2b, 6.3, 17 and the change log), and the file-by-file notes for the other developer are in `sync-manifests/bharath_bharath_20261025_profile-ui-restructure.md`.

## 1. What the product owner asked for

1. A calmer **Profile tab**: it opens on **View**, with a **View | Edit** switch. Edit is for managing cards only.
2. **Verification:** verified shows a blue tick and no button; unverified is tappable and goes to the existing selfie flow.
3. A **Settings** gear, top-right, holding everything that left the profile screen, plus placeholder rows for what is not built.
4. Redesign the **Add photo / voice / written** modals, and let a voice prompt be added together with a photo.
5. Fix the **Edit this card** rows that did nothing, and show a photo's attached voice note properly.
6. A **six-slot card editor** with "+" and drag-to-swap, not cramped, researched against Hinge and others.
7. **Voice and written cards should not take a photo tile**, and should be reorderable too.

## 2. What was built

### Profile tab and Settings
- `app/(tabs)/you.tsx` is now a host: name, verification tick, gear, a View | Edit segmented control, then `ProfileView` (unchanged) or the new `ProfileEditor`.
- New `app/me/settings.tsx` holds basics, goal, audience ("Your feed"), Notices, Perspectives you gave, Blocked people, Sign out, Delete account, and inert "Soon" rows. Leaf screens: `me/basics.tsx`, `me/goal.tsx`, `me/audience.tsx`, `me/verify.tsx`.
- `app/me/edit.tsx` shrank from 1247 lines to a small redirect shim. It **stays outside `(tabs)`** on purpose: a profile without a first photo is not live, and `(tabs)/_layout.tsx` sends non-live users to onboarding, so pointing onboarding at the tab would loop forever.
- Removed from the profile screen: Edit Profile & Live Preview, basics, goal, notices, perspectives given, the fake Top Photo switch, and the always-"Verified" row.

### Add and edit a card
- New `features/post-composer/`: a full-screen stepped flow (photo → question → optional voice; voice cards: 2 steps; written: 1), a single-screen editor for existing cards, category and focus-area sheets.
- A photo card can carry a voice note together with its question.
- **Bug fixed:** the Browse questions / Category / Focus rows did nothing. On iOS a second modal opened beside a presented modal never appears; the sheets now render inside the modal.
- Old modals deleted: `PhotoUploadModal`, `AudioRecordingModal`, `WrittenPerspectiveModal`, `EditPostPromptModal`, `PhotoGridReorder`.
- `PromptLibraryModal` is unchanged (old design; it wrongly calls questions "Perspectives"). Left for a follow-up.

### The card editor (`features/profile-editor/`)
- **Photos:** a grid of six places, **three across in two rows**, portrait tiles, no text on the tiles. First photo has a star. Voice note on a photo is a "▶ 0:10" button. The next free place is a "+ Add" button.
- **Voice & written:** listed under the photos, one row each, with the question at reading size and where it appears ("After photo 2"). Voice rows have their own play button. "+ Voice note" and "+ Written" add one.
- **Reordering:** hold a card or row, drag it onto another, let go to swap. Photos and rows reorder independently, so dragging a photo never moves a voice or written card, and the reverse. Each card's ⋯ menu has Move earlier / Move later (a voice or written card can move past a photo) / Edit / Remove; screen-reader users get the same as actions.
- The first card must be a photo (server rule); the app refuses a move that would break it before sending anything.
- One voice clip plays at a time; opening any screen over the cards stops playback.

### Shared building blocks
- **Design tokens:** `elevation`, `motion`, `opacity`/`scale`, `border`, `icon`, `textStyles`, plus additive `touchTarget.comfortable`, `fontSize.micro`, `warningSoft`, `scrimMedia`, `onDarkMuted`. `packages/design-tokens/dist/` is gitignored, so run `pnpm build` before `pnpm typecheck` after pulling.
- **UI primitives:** `SegmentedControl`, `Card`, `ListRow`, `ListGroup`, `ScreenHeader`, `ConfirmSheet`.
- **Helpers:** `lib/haptics.ts`, `lib/useReduceMotion.ts`, `lib/busyFlag.ts` (the "you're connected" moment waits while an editor modal is open).
- **Drag:** `useLiftDrag.ts` is shared by the photo grid and the list. It uses React Native `Animated` and `PanResponder`; no new dependency.
- **Pure, tested logic:** `reorder.ts`, `grid.ts`, `composer.ts`, `asPublicProfile.ts`.

## 3. How the grid decision was reached

- Hinge's own help-centre screenshots (help.hinge.co, "How do I edit my profile?") show a 3×2 grid of small square photos, a tiny ✕ on each, and "Tap to edit, drag to reorder" beneath; written prompts are a separate list below. Bumble's help centre describes up to 6 photos, tap-and-hold to rearrange. The official Tinder page could not be found.
- A 2×3 grid of large tiles was tried first and rejected by the product owner. Three across in two rows was kept, with tiles a third taller than Hinge's squares and no text on them (the old grid's cramped feeling came from squeezing the question into the photo).
- Voice and written cards got no tile because a tile for them was a box with a button or a few squeezed words; a list shows the question properly and says where the card sits on the profile.
- Other research that shaped the work: Apple HIG on sheets (multi-step tasks belong in full-screen modals), NN/g on progressive disclosure and empty states, and restraint in recent Apple Design Award apps.

## 4. Checks run

- `pnpm build`, `pnpm typecheck`: pass.
- Unit tests: contracts 24, api-client 6, API 83, **mobile 80** (new: reorder, grid geometry, drop targets, composer rules, design tokens). All pass.
- End-to-end tests (61) passed earlier in this work. **They were not re-run for the last mobile-only changes**, because the API build watchers were stopped at the product owner's request first.
- Checked on the iOS simulator by screenshot.

## 5. Not verified, and open

- **Hold → drag → swap has not been tried with a finger.** The simulator here can be screenshotted but not tapped. The swap, geometry and drop-target logic are unit-tested; the gesture feel is not. Please try it on a device before merging.
- **Open product question for Jana (not built):** the product owner would like up to **6 photos plus** voice and written cards on top. `docs/PRODUCT.md` says a profile has "1 to 6 posts" in total, enforced by `RULES.maxPosts` in contracts and by the server. Changing it needs a decision: is there a separate limit for voice/written cards, and what is it? It would then touch shared contract and server files.
- Not changed in `docs/PRODUCT.md`.
- Follow-ups: redesign `PromptLibraryModal`; `app/onboarding/index.tsx:55` has a now-unreachable `parseInt` branch; `Chip.tsx` uses a 40px target, under the 44-48 rule.
