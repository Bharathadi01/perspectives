# Sync Manifest: profile editor, card composer and "done for today" in the editorial look (branch jana)

- **Author / Agent:** Jana / Claude Code (Opus)
- **Branch:** jana
- **Date & Time:** 2026-10-31
- **Base Commit:** ce0397e

## 1. Summary of Changes
Jana flagged two screens still in the old purple, system-font style: You → Edit, and Explore's "You're done for today". Both are moved to the editorial look (paper, ink, clay, Fraunces and Inter), along with what Edit opens: the card composer, "Edit this card", the category and focus sheets, the card menu, the remove confirmation and the question library.

- **Restyle only.** Layout, behaviour, drag-to-reorder, accessibility actions and all rules are unchanged.
- **New `theme.editorialText`** (`apps/mobile/src/theme/index.ts`): the `textStyles` roles in Inter or Fraunces, with the same sizes. The composer files use it instead of `textStyles`.
- **Sheets:** `CardActionsSheet`, `ConfirmSheet`, `CategorySheet` and `FocusAreaSheet` now use `components/editorial/PaperSheet`, the same sheet as the safety menu.
  - `ConfirmSheet` is only used by the profile editor.
  - `FocusAreaSheet` gains a **Done** button.
- **Reused onboarding components:** `ComposerShell`, `StepQuestion`, `FocusAreaSheet` and `PromptLibraryModal` use `PillButton`, `TextButton`, `FieldCard` and `ChoiceChip` from `features/onboarding/ui`.
- **Explore:** the empty states are a new `features/explore/ExploreEmpty.tsx` (fanned cards with a stamped tick, or a drifting hourglass) with the same copy and buttons. `EmptyState` itself is untouched and still used by Notices, Blocked and Given.
- **Wording:** the question library no longer calls questions "perspectives" ("Pick a question", "Search questions", "Use this question", "For a photo / For a voice card"). This closes conflict 2 in `BUSINESS_LOGIC.md`.
- **Web nesting fix:**
  - On photo tiles, the ⋯ and voice buttons are now siblings of the tile's tap target, not inside it.
  - In voice and written rows, the row is a `View` holding three siblings: play, the question (the tap and long-press target, with the same accessibility label, hint and actions) and the menu.
  - This removes the web "button cannot contain a nested button" warning.

## 2. Files
- **New:** `src/features/explore/ExploreEmpty.tsx`.
- **Changed:**
  - `app/(tabs)/you.tsx`, `app/(tabs)/explore.tsx`;
  - `src/theme/index.ts`;
  - `src/components/ui/SegmentedControl.tsx`, `src/components/ui/ConfirmSheet.tsx`;
  - `src/components/profile/PromptLibraryModal.tsx`;
  - `src/features/profile-editor/`: `ProfileEditor.tsx`, `PhotoGrid.tsx`, `PromptList.tsx`, `VoiceChip.tsx`, `VoiceStrip.tsx`, `CardActionsSheet.tsx`;
  - `src/features/post-composer/`: `ComposerShell.tsx`, `StepPhoto.tsx`, `StepQuestion.tsx`, `StepVoice.tsx`, `PostEditor.tsx`, `CategorySheet.tsx`, `FocusAreaSheet.tsx`.
- **Docs:** `business-logic/BUSINESS_LOGIC.md` (9.1, 17, change log), `docs/ACTIVE_CHANGES.md`.

## 3. Schema / Contracts / API
- None.

## 4. Verification
- [x] Mobile `tsc` clean; mobile tests 138 passed.
- [x] Web preview with Playwright, signed in as Ravi:
  - Explore "done" and "nobody" states (the explore response was rewritten in the test browser to force each);
  - You → Edit, top and scrolled;
  - the card menu;
  - "Edit this card";
  - the category sheet.
  - No page or console errors after the nesting fix.
- [ ] Not checked:
  - on a phone by touch;
  - dragging a voice or written row now that the long press is on the question only;
  - the composer's photo and voice steps and the question library on a device.

## 5. Overlap
- **Bharath:** these are your files (`features/profile-editor`, `features/post-composer`). Pull before editing them.
- On a voice or written row, holding the **question** starts the drag. Holding the play button or ⋯ no longer does.
