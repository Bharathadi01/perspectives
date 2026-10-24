# Sync Manifest: Profile tab restructure, editor rebuild, Settings screen, add-a-card flow (branch bharath)

- **Author / Agent:** Bharath / Claude Code (Opus)
- **Branch:** bharath
- **Date & Time:** 2026-10-25
- **Base Commit:** bb9d0d9 (merge of jana steps 1-5)

## 1. Summary of Changes
The You tab was doing three jobs: previewing the profile, holding nine navigation buttons, and hiding the real editor behind a second screen. It now does one: **View | Edit**, switched in place. Everything else moved behind a gear into a new **Settings** screen.

The editor itself was rebuilt around the photos. It used to be a 3x2 grid where five of six cells were empty dashed boxes and a photo's question was printed twice — once at 9.5px inside a 112px tile, and again in an "Attached perspectives" list underneath, which existed precisely because the tile text was unreadable. It is now one card per row: a photo fills the width with its question readable beneath it, voice and written cards stay compact, and a single "Add a photo or voice note" button replaces the empty boxes.

Three defects found and fixed along the way, all pre-existing:
- The **"Top Photo" switch did nothing.** It was local component state, never persisted, with no server field behind it. Removed; the first card is the top card, which is what the server already enforces.
- The **"Get verified" row could only ever say "Verified".** Selfie verification is a requirement for a live profile and non-live profiles never reach the tabs, so the unverified branch was unreachable. It now renders only when unverified, and the tap opens a working screen.
- That tap was **dead**: it pushed `/onboarding?forceStep=selfie`, but `forceStep` is parsed with `parseInt`, so `'selfie'` became `NaN` and the push did nothing — and onboarding has no selfie step to jump to anyway (the selfie lives inside its first step). Fixed with a new `/me/verify` route wrapping the existing `SelfieStep`, rather than touching the shared onboarding screen.

No rule was invented or changed. No contracts, schema, API, `features/hooks.ts` or `api-client` changes.

## 2. Modified & Created Files

**Design tokens** (`packages/design-tokens/src/`)
- New: `elevation.ts`, `motion.ts`, `opacity.ts`, `border.ts`, `icon.ts`, `textStyles.ts`. These replace values that were duplicated inline across the app — six different shadow recipes with six different opacities, five raw durations, and fifteen raw Ionicons sizes.
- Additive keys: `touchTarget.comfortable: 44`, `typography.fontSize.micro: 11`, `colors.warningSoft`, `colors.scrimMedia`, `colors.onDarkMuted`. Nothing existing changed value.
- `apps/mobile/src/theme/index.ts` re-exports them; `apps/mobile/src/theme/motion.ts` is new and holds the RN `Easing` curves, which must stay out of the token package (it is dependency-free plain TS and importing `react-native` breaks its `tsc` build).

**New UI primitives** (`apps/mobile/src/components/ui/`)
- `SegmentedControl.tsx`, `ListRow.tsx`, `ListGroup.tsx`, `Card.tsx`, `ScreenHeader.tsx`, `ConfirmSheet.tsx`.
- `ListRow` without `onPress` renders no button role and no chevron, which is what lets the Settings placeholders be honest rather than dead buttons.

**New helpers** (`apps/mobile/src/lib/`)
- `useReduceMotion.ts` (extracted from the one place that honoured it), `haptics.ts`, `busyFlag.ts`.

**New editor** (`apps/mobile/src/features/profile-editor/`)
- `ProfileEditor.tsx`, `PhotoCard.tsx`, `CompactCard.tsx`, `CardActionsSheet.tsx`, `AddCardButton.tsx`, `AddChoiceSheet.tsx`, `VerificationRow.tsx`.
- Pure, and therefore testable under the node-only jest setup: `reorder.ts`, `asPublicProfile.ts`.

**Routes**
- Rewritten: `app/(tabs)/you.tsx` (85 -> 118 lines), `app/me/edit.tsx` (**1247 -> 75 lines**).
- New: `app/me/settings.tsx`, `app/me/basics.tsx`, `app/me/goal.tsx`, `app/me/audience.tsx`, `app/me/verify.tsx`.
- `src/components/connect/ConnectedMomentWatcher.tsx`: two lines, see section 7.
- **Deleted:** `src/components/profile/PhotoGridReorder.tsx` (752 lines; editor-only, `app/me/edit.tsx` was its only consumer).

**Docs:** `business-logic/BUSINESS_LOGIC.md` (sections 5.3, 5.4, 6.3, 17, change log, "Last updated"), `docs/ACTIVE_CHANGES.md`.

## 3. Database & Schema Changes
- **Prisma Schema Modified:** No. No migration.

## 4. Contract & API Impact
- None. `packages/contracts`, `packages/api-client` and `apps/api` are untouched. `apps/mobile/src/features/hooks.ts` is untouched.

## 5. UI & Design System Adherence
- [x] New styling goes through tokens; no raw hex or spacing added.
- [x] Tap targets 48px, except the two halves of the segmented control at `touchTarget.comfortable` (44), which sit inside a taller track.
- [x] Reduce motion honoured by the segmented control via the new shared hook.
- [x] Shared View components (`ProfileView`, `PostCard`, `BasicsRow`, `Avatar`) were **not** touched — they are used by Explore, connections, chat and public profiles.
- [x] The app's last blocking `Alert.alert` is gone; removal now confirms in a sheet like everything else.

## 5b. Business logic document
- [x] Updated: sections 5.3 (onboarding hand-off), 5.4 (rewritten for View/Edit + Settings), 6.3 (reorder and editor layout), 17 (Settings placeholders), a dated change-log entry, and "Last updated". The numbers table needed no change: no number moved.

## 6. Verification & Test Evidence
- `pnpm build`, `pnpm typecheck` — pass across all 7 workspace projects.
- `pnpm test` — 83 API + 70 mobile tests pass. Mobile gained two new suites: `test/post-reorder.test.ts` (10 cases, the first coverage the "first card must be a photo" invariant has ever had) and `test/design-tokens.test.ts` (6 cases).
- **Run in the iOS simulator** (iPhone 17, Expo Go), signed in as `bharath`: the tab opens on View, the gear opens Settings with live values, the capsule switches to Edit in place, the photo card renders large with a readable question and a LEADS badge, and `/me/edit?section=audience` still redirects to the new screen. Screenshots taken at each step.
- `pnpm test:e2e` — 61 tests pass, 9 suites.
  - Note for whoever hits this next: the `perspective_test` database had a migration stuck in a failed state from 2026-10-21 (`20261018090000_catchup_jana_post_text_and_audio_media`), which made Prisma refuse every later migration, so all 61 tests failed at signup on a missing `blocked_emails` table. Pre-existing and unrelated to this change. Fixed with `prisma migrate reset` against `perspective_test` only; the `perspective` dev database and its seeded world were untouched.

## 6b. Second pass: the add-a-card and edit-a-card screens

The composer was one long form — photo box, a Written/Voice switch, the question, eleven category chips and a focus-area row, all on one scroll, with the photo (the point of the card) the least prominent thing on it. It is now a full-screen stepped flow: photo, question, optional voice note.

**The important correction:** "Written" and "Voice" were never two kinds of card. `CreatePostInputSchema` carries `mediaId` *and* `audioMediaId` *and* a mandatory `prompt`, and `PhotoUploadModal`'s own save path already sent all three together. The switch just decided whether a clip was additionally attached — but it read as a choice between two kinds. Voice is now the last, skippable step, with the half-built card shown above it.

**New files** (`apps/mobile/src/features/post-composer/`): `composer.ts` (pure: steps, validation, focus-area reconciliation, payload building), `ComposerShell.tsx` (the stepped frame), `StepPhoto.tsx`, `StepQuestion.tsx`, `StepVoice.tsx`, `CategorySheet.tsx`, `FocusAreaSheet.tsx`, `PostComposer.tsx` (create), `PostEditor.tsx` (edit, one screen — editing is not a wizard). Tests: `apps/mobile/test/post-composer.test.ts`, 20 cases.

**Deleted** (all four superseded, each confirmed to have no remaining references): `PhotoUploadModal.tsx` (762), `AudioRecordingModal.tsx` (303), `WrittenPerspectiveModal.tsx` (305), `EditPostPromptModal.tsx` (662) — about 2,000 lines, including two byte-for-byte duplicated blocks (the Written/Voice toggle and the whole voice-recorder card appeared verbatim in both the add and edit modals).

**Bugs fixed on the way, all pre-existing:**
1. **Category/focus-area desync.** The Written/Voice toggle remapped `category` between `looks` and `voice` but left `focusAreas` alone, so saving produced a payload Zod refuses: "Not a focus area of looks: tone". `reconcileFocusAreas` now keeps what still fits the new category and seeds a default otherwise. Covered by a test.
2. **State leaked between opens.** The modal stayed mounted in the editor, so `useState` initialisers never re-ran: the question, category and focus areas from one card carried into the next, and the `isPrimary` default question was whatever the first open had been. The composer resets on every open.
3. **Custom questions were always rejected.** `PromptLibraryModal.submitCustom` paired `category: 'vibe'` with `focusAreas: ['first_look']`, and `first_look` is not a focus key of `vibe`. The composer reconciles whatever the library hands back, so the pairing can no longer be invalid.
4. **`AudioRecordingModal` discarded the library's category and focus areas** and hardcoded `category: 'voice', focusAreas: ['tone','warmth']`, so picking a specific voice prompt silently ignored its defaults. It also hardcoded `mimeType: 'audio/m4a'` instead of using the recorder's own. Both gone with the file.
5. **A disabled-looking "Save Voice Prompt"** sat greyed out with no explanation. Buttons are now dimmed but still pressable, and the press says what is missing ("Choose a photo first.").

**One deliberate non-feature:** no waveform during recording. `useVoiceRecorder` exposes no metering, so animated bars would be decoration pretending to be a reading. The countdown ring and timer are driven by real elapsed time.

**Still there, untouched:** `PromptLibraryModal` (the question browser) and `src/lib/promptLibrary.ts`. Note it still nests a `Modal` inside the composer's `Modal`, and its custom-question box hardcodes `maxLength={140}` where `RULES.promptMaxLength` is 150 — both worth a follow-up.

## 6c. Third pass: voice notes on the cards, and the dead sheets

- **Bug: every sheet opened from the composer or the edit screen was dead on iOS** — Browse questions, Category, What should people focus on. `CategorySheet`, `FocusAreaSheet` and `PromptLibraryModal` were rendered as siblings after `</ComposerShell>`, i.e. outside its `pageSheet` `Modal`; iOS will not present a modal from under one that is already presented, so they silently never appeared. `ComposerShell` now takes an `overlays` prop rendered *inside* its modal. My earlier simulator check only screenshotted each step, never a tap on those rows, which is why this slipped through.
- `PostEditor` used to swap to a second `ComposerShell` instance when recording a voice note, which would dismiss and re-present the modal. It is now one shell whose content changes.
- `PostEditor` read a voice card's clip from `audioMediaUrl`; a voice card keeps it in `mediaUrl`. It therefore offered "Add a voice note" on a card that already is one. Fixed; text cards no longer offer a voice note at all (they could acquire one before — the API's update has no kind guard).
- New `src/features/profile-editor/VoiceStrip.tsx`: play, a real progress bar, elapsed / total. `ProfileEditor` keeps a single `playingId` so only one clip plays, and clears it when any modal opens. No waveform — `useVoiceRecorder` keeps no levels. The edit screen reuses the same strip.
- Reverted a rule I had introduced: the composer hid the Voice category for photo cards. The original photo screen offered all eleven and set Voice itself when a clip was attached, so it is restored; only written cards exclude Voice, as before.
- Follow-up, not done: `PromptLibraryModal` is still the old design, and it labels questions "Perspectives", which `CLAUDE.md` says is the wrong word (a perspective is what a giver writes).

## 6d. Fourth pass: the six-slot grid, rebuilt

The product owner asked for the six-slot grid with "+" and drag-to-swap back, but less cramped than the old one. Checked against Hinge's own help-centre screenshots of its editor (help.hinge.co, "How do I edit my profile?"): a 3×2 grid of ~105px square tiles, a tiny ✕ per tile, and no question text on the tiles — only a "✓ Prompt" chip; written prompts are a separate list.

- New `src/features/profile-editor/PostGrid.tsx`: 2 columns × 3 rows, portrait 4:5 tiles (~173×216 on a 390pt phone, ~2.2× the old tiles). Question under each tile, 2 lines, fixed-height caption so the hit-testing is exact. Next empty slot is the highlighted "Add"; later empties are quiet. ⋯ menu per tile instead of a ✕ (Hinge's ✕ is well under 44px and sits where you grab).
- **Drag is hold-to-lift**, not move-to-drag. The old grid's PanResponder claimed any >10px move, which on a screen covered by six large tiles would make the editor unscrollable. Now `onLongPress` (250ms) arms the tile; the tile's `PanResponder` only claims moves while armed; the parent `ScrollView` gets `scrollEnabled={false}` only while a card is lifted. Drop on a filled card swaps; empty slots are not targets; `LayoutAnimation` eases the swap unless reduce-motion is on.
- Pure, tested: `grid.ts` (`gridGeometry`, `slotAtPoint`, `dropTarget`) and `swapPosts` in `reorder.ts` — `test/post-grid.test.ts`, 12 cases.
- Accessibility: `accessibilityActions` Move earlier / Move later / Card options on every tile.
- `VoiceChip.tsx` replaces the strip on tiles (chip on photos, hero on voice cards); `VoiceStrip.tsx` stays for the edit screen. Removed this session's now-unused `PhotoCard.tsx`, `CompactCard.tsx`, `AddCardButton.tsx`.
- **Not verified by touch.** The simulator here can only be screenshotted, not tapped, so hold → drag → swap has been checked only through the unit-tested logic and screenshots, not by a finger. Please try it on a device before merging.

## 6e. Fifth pass: three across, two rows

The product owner did not like the 2×3 layout and asked for two rows. Grid is now **3 columns × 2 rows**, the Hinge/Bumble shape (Bumble's help centre: up to 6, "tap and hold to rearrange"; Hinge's: 3×2 with "Tap to edit, drag to reorder" under it).

- `grid.ts`: `columns: 3`, `gap: 8`, `tileAspect: 4/3` (~114×152 on a 390pt phone, a third taller than Hinge's squares). `captionHeight` is gone: tiles carry no text, so `rowStride = tileHeight + gap`. Tests updated (still 12 cases).
- `PostGrid.tsx`: no caption under tiles; a 26px star badge on slot 0 instead of the LEADS pill; a 26px ⋯ badge (`hitSlop` 10) top-right; written cards show the first 5 lines of their question; next empty slot is a filled brand "+" with "Add".
- `VoiceChip.tsx`: the chip shows one time (length, or elapsed once started) to fit a third-width tile; the hero button is 48px.
- `CardActionsSheet.tsx`: subtitle now includes the question, since the tiles no longer show it.
- Still **not touch-verified**: hold → drag → swap needs a finger.

## 6f. Sixth pass: photos-only grid, voice and written listed under it

The product owner felt voice and written cards should not take a tile. Matches the reference layout (Hinge's help-centre screenshot: photo grid, then "Written Prompts (3)" as a list; its voice prompt is a separate section).

- `PostGrid.tsx` renamed `PhotoGrid.tsx`; takes `photos` (photo posts only) and `free` (places left across all kinds). Empty tiles beyond `photos.length + free` render without a "+" and explain on tap.
- New `PromptList.tsx`: one row per voice/written card — `VoiceChip variant="round"` (voice) or a glyph, question 2 lines at `bodyStrong`, meta "Voice · 0:04 · After photo 1", ⋯ menu; then **+ Voice note** / **+ Written** buttons. Hidden until a photo exists.
- `reorder.ts`: `photoIndices`, `swapPhotos` (grid places → `swapPosts` on full order, so non-photos never move), `photosBefore`. 4 new tests (`post-grid.test.ts`, 16 cases).
- `CardActionsSheet` now takes `where` / `canMoveEarlier` / `canMoveLater` from `ProfileEditor`: photos move among photos; voice/written move one step in the full order, never into index 0.
- `VoiceChip`: `hero` variant replaced by `round` (48px play button with a progress bar at its foot).
- Deleted `AddChoiceSheet.tsx` (grid "+" adds a photo; the list's buttons add voice/written).
- No contract, server or View change. The View still shows cards in saved order, which is what "After photo N" describes.

## 6g. Seventh pass: drag to reorder voice and written cards

- New `src/features/profile-editor/useLiftDrag.ts`: the hold → lift → drag → drop logic, moved out of `PhotoGrid` unchanged so the grid and the list share it.
- `PromptList.tsx`: rows are `Animated.View`s with the hook's pan handlers; each measures itself (`onLayout`) because rows differ in height; vertical travel only. Accessibility Move earlier/later swap with the neighbouring row.
- Pure, tested: `rowDropTarget` (`grid.ts`) and `promptIndices` / `swapPrompts` (`reorder.ts`); `post-grid.test.ts` now 23 cases (80 mobile total).
- **Open product question for Jana (not built):** Bharath asked for up to 6 photos *plus* voice/written cards on top. Today `docs/PRODUCT.md` says "1 to 6 posts" total, enforced by `RULES.maxPosts` in contracts (`common.ts:21`, `post.ts:229`) and `posts.service.ts:23`. Needs a decision: is there a separate limit for voice/written cards, and what is it? Then a contract + server change (shared files).

## 7. Notes for the Other Developer
- **`app/me/edit.tsx` must stay outside `(tabs)`.** A profile is not live until it has a first photo, and `(tabs)/_layout.tsx` redirects non-live users to `/onboarding`. Pointing onboarding's hand-off at `/(tabs)/you` would bounce the person between onboarding and the tab forever. The route is kept as a shim: it redirects `?section=...` to the new leaf screens and hosts the "Add your first photo" step for `?from=onboarding`.
- **`ConnectedMomentWatcher` now also checks a busy flag.** It used to suppress the "you're connected" moment on a list of route prefixes including `/me/edit`. Editing happens on the You tab now, where the path cannot tell editing apart from simply looking at your own profile — adding `/you` to the list would suppress the moment most of the time someone is on that tab. The editor sets `setBusy('profile-editor', ...)` while a modal is open instead. The prefix list is unchanged.
- **Run `pnpm build` before `pnpm typecheck` after pulling.** `packages/design-tokens/dist/` is gitignored, so a stale or missing `dist` produces TS errors that look like they are in your code.
- Nothing in the repo passes `forceStep` any more, so the `parseInt` branch in `app/onboarding/index.tsx:55` is now unreachable. Left alone deliberately to keep the shared onboarding screen out of this diff; worth deleting in a later cleanup.
- `Chip.tsx` still uses `touchTarget.min - 8` (40px), under the 44-48 rule. Not touched here because it is a shared primitive used across onboarding and the forms; it deserves its own small, revertable commit.
