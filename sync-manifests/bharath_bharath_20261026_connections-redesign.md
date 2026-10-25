# Sync Manifest: Connections and chat redesign (editorial look)

- **Author / Agent:** Bharath, with Claude Code
- **Branch:** bharath
- **Date & Time:** 2026-10-26
- **Base Commit:** ccd9eee (Jana's "dark floating tab bar, You → View in the editorial layout")

## 1. Summary of Changes
Connections, the chat and the "You're connected" moment are rebuilt in the editorial look that Jana introduced on Explore (paper, ink, clay, Fraunces + Inter). The chat now opens with the two perspectives the connection grew from, set as centred quotes with a byline and a tiny photo; tapping one shows the photo and question. The list reads like a messenger ("You:" prefix, clock times, a clay "your move" dot derived only from who wrote last), messages are grouped with day markers, sending is optimistic with a "Not sent · Retry" state, and Unmatch now confirms first.

## 2. Modified & Created Files
- `packages/contracts/src/connect.ts`: `Connection.origin` and `Connection.reply` gain optional `post: PostRef` and `createdAt`. Additive.
- `apps/api/src/connect/connect.service.ts` (`connectionFor`): loads both posts with `POST_INCLUDE` and maps them with `ProfileMapper.postRef` (signed media URLs, the same as the inbox).
- `apps/api/test/e2e/connect-life.e2e-spec.ts`: asserts `origin.post`, `origin.createdAt`, `reply.post`.
- New `apps/mobile/src/features/connections/`:
  - `thread.ts` (pure): `buildThread` (runs within 5 minutes, day dividers, pending merge, skips the divider of the connected day), `dayLabel`, `listTime`, `connectedLabel`, `clockTime`, `previewLine`, `isYourTurn`, `openingLines`.
  - `useSendQueue.ts`: optimistic send; failed messages keep their idempotency key so Retry can't double-post; writes the confirmed message into the `messages` query cache. Calls `api.connect.send` directly so `features/hooks.ts` is untouched (`useSendMessage` there is now unused by the chat but left in place).
  - `icons.ts`: feature-local Phosphor exports (the shared `components/ui/icons.ts` is not edited).
  - `components/`: `Prologue` (the opening quotes + detail sheet), `MessageBubble` + `DayDivider`, `ChatParts` (`ChatHeader`, `QuietNotice`, `StartIdeas`, `PaperAvatar`, `PartnerName`), `Composer`, `ConversationRow`, `PaperSheet` + `SheetAction`, `PaperState` + `PaperLoading`.
- `apps/mobile/app/(tabs)/connections.tsx`: rewritten on the new components.
- `apps/mobile/app/chat/[id].tsx`: rewritten. Inverted `FlatList` (opens at the newest message; `flexGrow` + `justifyContent: 'flex-end'` keeps a short thread at the top). Keyboard now autofocuses only for `focus=1` (from the connected moment).
- `apps/mobile/app/connected.tsx`: editorial restyle, `useReduceMotion` instead of its own `AccessibilityInfo` check, own photo = first **photo** post (was `posts[0]`, which could be audio).
- `apps/mobile/test/connections-thread.test.ts`: 13 cases.
- `business-logic/BUSINESS_LOGIC.md`: section 13 (13.1-13.3), change log 2026-10-26, "Last updated".
- `docs/ACTIVE_CHANGES.md`: new row.

## 3. Database & Schema Changes
- **Prisma Schema Modified:** No
- **New Tables:** None
- **New Columns Added:** None
- **Migration Name:** None

## 4. Contract & API Impact
- **New Endpoints:** None
- **DTO Updates:** `ConnectionSchema.origin` and `.reply`: optional `post` (`PostRefSchema`) and `createdAt`.
- **Breaking Changes:** NONE. Both fields are optional, so an older server still parses, and older clients ignore them (Zod strips unknown keys).
- **Gotcha:** after rebuilding contracts, restart Metro with `--clear`. A running Metro kept serving the old contracts build, whose schema silently strips the new fields (the chat then says "on Priya's post" with no photo).

## 5. UI & Design System Adherence
- [x] Colours and fonts from `theme.editorial` (`@perspective/design-tokens`); spacing, radii and touch targets from `theme`. Three ink tints are written as `rgba(36,29,21,…)` literals (sheet backdrop 0.42, row press 0.04, day pill 0.05) because `editorial.ts` has no ink-on-paper tint tokens; worth adding them there (Jana's file) and switching.
- [x] 44-48px touch targets (Retry has `hitSlop` 12 around a 28px label).
- [x] Reused `SafetyMenu`, `useToast`, `lib/haptics`, `useReduceMotion`, `useTabBarSpace`, `conversationIdeas`. New editorial sheet/state components live in the feature folder so shared `Sheet`, `States`, `Screen` stay as they are.

## 5b. Business logic document
- [x] Updated: section 13, change log 2026-10-26, "Last updated".

## 6. Verification & Test Evidence
- [x] `pnpm build`, `pnpm typecheck`, `pnpm test`, `pnpm test:e2e` (results in the PR description).
- [x] Seen on the iOS simulator: list, a new connection, a busy thread, a thread with a reply-soon notice, sending / not sent, the options and unmatch sheets, the connected moment. The sending/failed and sheet states were forced with a temporary patch (restored, verified with grep) because the simulator cannot be tapped here.
- [ ] Not verified by touch: sending a real message, Retry after a real failure, the keyboard, long-press copy.
- Local dev data: four demo connections for the dev account were inserted with a scratch script (not committed). Re-seed with `pnpm db:seed` / `db:seed:world` if you want a clean database.

## 6b. Follow-up (same day): only their words, no idea cards
- `thread.ts`: `openingLines` replaced by `theirOpening(connection)` (the line whose `fromUserId === partner.id`, or null). Tests updated (15 cases).
- `components/Prologue.tsx`: rewritten as a story-style reply (label, 76×95 thumbnail of your post or a paper tile with a Microphone/Quotes icon, their words in a Fraunces-italic bubble, then the "Connected" hairline); tap opens the detail sheet.
- `app/chat/[id].tsx`: `conversationIdeas` / `StartIdeas` removed. `ChatParts.tsx`: `StartIdeas` deleted. `icons.ts`: Lightbulb out, Microphone and Quotes in.
- `app/connected.tsx`: quotes the partner's words via `theirOpening` (was `origin.comment`, the asker's own words for the asker).
- Conflicts recorded in `BUSINESS_LOGIC.md` §17 (items 5 and 6) for Jana: PRODUCT.md line 124 / ADR-016 (both perspectives) and the ideas paragraph / ADR-015. The API is unchanged and still returns both perspectives; `conversationIdeas` in contracts is now unused (delete after Jana confirms).

## 6c. Inbox redesign, ideas back, no italics (evening)
- `app/(tabs)/inbox.tsx` rewritten on new `src/features/inbox/InboxCards.tsx` (`PerspectiveCard`, `RequestCard`, `PostGroupHeader`, `PostThumb`) and `src/features/inbox/icons.ts` (Phosphor ThumbsUp/Down, UserPlus, LockSimple, EnvelopeOpen, Microphone, Quotes). The shared `components/perspective/PerspectiveCard.tsx` is untouched (still used by `app/me/given.tsx`).
- Thank removed from the app (feedback sends `{ verdict }` only); thumbs are one-way in the UI (server still allows changes). Per-card busy/accepting state replaces the shared `isPending` spinners.
- Editorial building blocks moved to `src/components/editorial/` (`PaperSheet`, `PaperState`, `Person` with `PaperAvatar`/`PartnerName`) so Inbox and Connections share them.
- Ideas: `src/features/connections/ideas.ts` (`STARTER` first lines for every idea in `CONVERSATION_IDEAS`, `starterFor`, `ideaCount`, `ideasForRound`), new `StartIdeas` row in `ChatParts.tsx`, `Composer` is now a `forwardRef` with `fill(text)`. Tests: `test/connections-ideas.test.ts` (5).
- No italics in Connections: `displayItalic` replaced by `bodyMedium` in Prologue, ConversationRow, connected moment.
- Conflicts 6 and 7 in `BUSINESS_LOGIC.md` §17 for Jana (ideas fill the box; Thank removed).

## 6d. Inbox redesign, second pass (night)
Researched from official App Store screenshots (Hinge, Bumble, Feeld, Threads, Letterboxd, BeReal, Partiful, Instagram) and rebuilt `src/features/inbox/InboxCards.tsx`: `LockedPreview` (hidden-preview card), `RequestCard` (photo-first, `react-native-svg` gradient scrim, 272px cards in a snapping row), `PostThread` / `Reply` (thread rail, Connect pill, icon-only thumbs). Screen `app/(tabs)/inbox.tsx` gains a summary line and the sections WANTS TO CONNECT / ON YOUR POSTS. No new dependency (`react-native-svg` was already added with Phosphor). The old `PerspectiveCard`/`PostGroupHeader` in this feature are gone.

## 7. Potential Overlap / Conflict Warning
- `packages/contracts/src/connect.ts` and `apps/api/src/connect/connect.service.ts` are shared areas: additive edits only, please review.
- No edits to `features/hooks.ts`, `api-client/client.ts`, `schema.prisma`, shared `components/ui/*` or `components/profile/*`.
- **For Jana (product decisions, not built):**
  1. `reply` can show the give-back to the asker before they finish their daily set (lock rule).
  2. `reply` is "the latest" give-back, not the one at accept time, and a reconnect replaces `origin`.
  3. Unread counts / read state: `PRODUCT.md` says no read receipts; the "your move" dot is derived only from who wrote last.
  4. Message history beyond the latest 200.
