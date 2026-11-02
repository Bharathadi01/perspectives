# Sync Manifest: voice posts save again, and the age slider no longer goes back (branch jana)

- **Author / Agent:** Jana / Claude Code (Opus)
- **Branch:** jana
- **Date & Time:** 2026-11-03
- **Base Commit:** 13eb284

## 1. Summary of Changes
- **Voice-only posts could not be saved.** This affected onboarding ("Add a voice post") and You → Edit → add a voice card.
  - The clip uploaded, then the server refused the post with "Upload the photo or audio for this post first."
  - The cause: the app sent the clip as `audioMediaId`, which is the voice note on a photo card. A voice-only post carries its clip in `mediaId`, as the server and its tests always expected.
  - `buildCreateInput` (composer) and the onboarding `VoiceStep` now send it as `mediaId`. A photo's voice note is unchanged.
- **Recorder (`lib/media.ts`):**
  - after a recording, the app leaves record mode, so iOS plays the preview through the speaker rather than the earpiece;
  - browser recordings keep their real type (webm or ogg) instead of being labelled m4a;
  - failures are logged with `console.warn` instead of being swallowed.
- **Server (`PostsService.update`):**
  - For a voice-only post, a new `audioMediaId` now replaces the post's main clip. Before, it was stored as a second clip that never played.
  - `audioMediaId: null` on a voice-only post is refused with `VALIDATION_FAILED`.
  - The clip must not belong to another post. Before, that case hit the unique constraint and returned a 500.
  - The app does not offer re-recording a voice post yet.
- **Onboarding age slider:** on iOS 26, dragging a thumb could trigger the native back-swipe and leave the step.
  - New `swipeBack(step)` and `DRAG_STEPS` in `features/onboarding/flow.ts`.
  - The `audience` step gets `gestureEnabled: false` and `fullScreenGestureEnabled: false`. Its on-screen back arrow still works.
  - Every other step keeps the setting it had.
  - `AgeRange.tsx` is unchanged.

## 2. Files
- **Mobile:**
  - `app/onboarding/_layout.tsx`;
  - `src/features/onboarding/flow.ts`, `src/features/onboarding/steps/Posts.tsx`;
  - `src/features/post-composer/composer.ts`;
  - `src/lib/media.ts`;
  - tests: `test/onboarding.test.ts`, `test/post-composer.test.ts`.
- **API:** `apps/api/src/posts/posts.service.ts`; test: `apps/api/test/e2e/auth-and-profile.e2e-spec.ts`.
- **Docs:** `business-logic/BUSINESS_LOGIC.md` (sections 6, 7 and the change log), `docs/ACTIVE_CHANGES.md`.

## 3. Schema / Contracts / API
- No schema or contracts change.
- API behaviour change on `PATCH /v1/me/posts/:id` for voice-only posts only, as described above.

## 4. Verification
- [x] `pnpm build`, `pnpm typecheck`, `pnpm test`, `pnpm test:e2e` pass.
- [x] Against the local API with curl:
  - a voice post sent the old way is refused;
  - sent the new way, it is saved;
  - re-recording replaces the clip;
  - removing the clip is refused;
  - the clip plays back as `audio/m4a`.
- [x] Web with Playwright and a fake microphone: recorded on the onboarding voice step, pressed Save post, and the voice post was created.
- [x] iOS simulator: the audience step still opens and renders.
- [ ] Not checked:
  - dragging the age thumbs by touch: no simulator touch tool was available, so this needs a check on a phone;
  - recording on a real phone.

## 5. Overlap
- **Bharath:** `features/post-composer/composer.ts` is in your area. `buildCreateInput` now moves a voice-only card's clip into `mediaId`. Callers stay the same.
- `onboarding/_layout.tsx` now takes its back-swipe options from `swipeBack()` in `flow.ts`. Add any new step with a sideways drag to `DRAG_STEPS`.
