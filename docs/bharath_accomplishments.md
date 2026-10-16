# PERSPECTIVE — Accomplishments & Implementation Report
**Branch**: `bharath` (Merged & pushed to `dev`)  
**Commit**: `e8a7ed6`  
**Base Commit**: `49f1b85` (`origin/main`)  
**Scope**: Redesign Onboarding, Profile Creation, Hinge-Style Editor & Live Preview  

---

## 1. Executive Summary

Following the pull from `main`, we engineered and delivered a comprehensive vertical slice for **Perspective**, an 18+ social feedback and dating application.

The core objective was to transform profile creation from an administrative form into a visual, personal, and premium experience. Drawing inspiration from leading dating products (Hinge's card composition, prompt mechanics, and live preview; Tinder's progressive onboarding and photo reordering), we built an original design system tailored for Perspective.

### Key Deliverables Completed:
1. **Lightweight Development Selfie Bypass**: Scoped strictly to `__DEV__`, eliminating simulator camera blocking without granting false identity verification in production.
2. **Dedicated Step 4 Onboarding Screen ("Set Up Your Profile")**: A visual bridge screen highlighting Perspective's three pillars (Visuals, Perspectives, Voice).
3. **Synchronized Edit & Live Preview (View) Modes**: Split into two instant tabs with zero state drift and zero leaked private PII (such as exact birthdates, phone numbers, or moderation flags).
4. **Hinge-Style 3x2 Photo Grid**: Preserved exact geometry and alignment with center-based PanResponder drag-and-drop plus smart 2-second temporary switch arrows (`<` and `>`).
5. **Strict Content Hierarchy**: Photos are **always on top** (positions `0 .. photos.length - 1`), with position `0` guaranteed to be the cover photo (`Top Photo`). Perspectives (voice and written) strictly follow the photos.
6. **Voice Perspectives (15s Audio Notes)**: Built-in voice recorder with countdown ring, waveform visualization, playback preview, and reorder controls (`↑` / `↓`).
7. **Written Perspectives System**: Post-specific perspective questions, searchable 5-category library, custom question input, and reorder controls (`↑` / `↓`).
8. **Terminology Consistency**: Replaced all instances of "Prompt" with **"Perspective"** across the entire UI and modals.
9. **Full Backend Atomic Reorder Pipeline**: Shared Zod schema, API client method, NestJS controller, and PostgreSQL transaction service for `PATCH /v1/me/posts/reorder`.

---

## 2. Competitor Research Analysis: Hinge vs. Tinder vs. Perspective

| Area | Hinge Pattern | Tinder Pattern | Perspective Implementation |
| :--- | :--- | :--- | :--- |
| **Profile Composition** | Vertical stack of alternating media and prompt cards. | Swipeable photo deck with overlay bio chips. | **Hybrid**: 3x2 photo management grid in Edit mode; full-width interactive Perspective cards in View / Public profile. |
| **Photo Ordering** | 6-slot grid; slot 1 is primary. Drag to reorder. | 9-slot grid; smart photo algorithm automatically tests popularity. | **Hinge-Style 3x2 Grid**: Slot 0 is starred Top Photo. Responsive PanResponder drag + 2s temporary switch arrows (`<` and `>`). |
| **Prompts / Perspectives** | 3 mandatory prompt cards selected from a library. | Short bio and optional prompt stickers. | **Post-Centric Perspectives**: Every photo and audio clip has an attached perspective question from 5 categories. |
| **Audio** | Voice Prompts (up to 30s) placed as standalone audio cards. | Loops and external Spotify integration; limited native voice. | **15s Voice Perspectives**: Native recorder with countdown timer, waveform visualizer, and custom perspective question. |
| **Onboarding** | Multi-step progressive form collecting vitals and preferences. | Fast progressive flow: Name → Age → Gender → Orientation → Photos. | **4-Step Wizard**: Vitals → Dev-safe selfie → Dating preferences & audience → Dedicated "Set Up Your Profile" bridge. |
| **Edit vs. Preview** | Segmented tabs (`Edit` and `View`) at the top of the screen. | Edit profile modal with separate floating preview button. | **Synchronized Tabs**: Header switch (`Edit` \| `View`). Any draft edit immediately updates the live preview without saving. |
| **Content Hierarchy** | Free mix of prompts and photos. | Photos first, bio second. | **Photos First**: Photos always occupy top positions (`0 .. N-1`); voice and written perspectives strictly follow. |

---

## 3. End-to-End User Journey Architecture

```mermaid
flowchart TD
    A["Auth / Phone Login (/login)"] --> B["Onboarding Step 1: Vitals (Name, Age, Gender)"]
    B --> C["Step 2: Selfie Verification<br/>(Dev Bypass active in __DEV__)"]
    C --> D["Step 3: Audience & Dating Preferences"]
    D --> E["Step 4: 'Set Up Your Profile'<br/>(Dedicated Bridge Screen)"]
    E --> F["Edit Profile (/me/edit)<br/>Hinge-Style 3x2 Photo Grid"]
    F <--> G["Live Preview (/me/edit?tab=view)<br/>Synchronized Draft State"]
    F --> H["Main App Discovery (/explore)<br/>via 'Done' Action"]
```

### Step A: Scoped Development Selfie Bypass
- **File**: `apps/mobile/src/components/forms/SelfieStep.tsx`
- **Behavior**: In local development (`__DEV__`), users see a button: **"Take Selfie (Dev Bypass)"**. Tapping it fulfills the form contract with a bundled base64 image without launching a physical camera.
- **Safety**: The backend continues to assign `selfieStatus: PENDING` in dev so that production age and adult verification rules cannot be circumvented.

### Step B: Dedicated "Set Up Your Profile" Bridge Screen
- **File**: `apps/mobile/app/onboarding/index.tsx` (Step 4)
- **Behavior**: Replaces the jarring immediate redirect to Explore. Introduces the user to Perspective's three pillars:
  - 📸 **High-Impact Visuals**: Photos that share your world.
  - 💬 **Curated Questions**: Give others a meaningful angle to connect.
  - 🎙️ **15s Voice Perspectives**: Share your authentic tone and energy.
- **Action**: Primary CTA **"Set Up Your Profile"** opens the profile editor before entering discovery.

### Step C: Profile Editor & Live Preview Synchronization
- **File**: `apps/mobile/app/me/edit.tsx`
- **Header**: `Cancel` (left), user's name e.g. `Ravi` (center), `Done` (right).
- **Segmented Tabs**: `Edit` vs `View` with an active black underline indicator.
- **Live Preview (`View`)**: Renders the exact public card stack using shared components (`ProfileView` and `PostCard`) with zero private PII leaks.

---

## 4. Feature Details & Interaction Design

### 4.1 Hinge-Style 3x2 Photo Grid (`PhotoGridReorder.tsx`)
- **Exact Proportions Preserved**:
  - 3 columns × 2 rows in container width `SCREEN_WIDTH - 32` with uniform `GAP = 10`.
  - Aspect ratio `1 : 1.32`, `borderRadius: 12`, border `#E5E7EB`.
  - Empty slots feature dashed borders with centered `+` circle.
- **2-Second Temporary Switch Arrows (`<` and `>`):**
  - Tapping any photo card reveals high-contrast switch arrows in the center of the card.
  - An internal **2-second timer** automatically fades out the arrows to keep photos clean and uncluttered.
  - Tapping `<` shifts the photo left; tapping `>` shifts the photo right.
  - Both directions perform a symmetric swap, move the active focus to the new slot, and refresh the 2-second timer.
- **PanResponder Drag-and-Drop**:
  - Smooth lifting with `scale: 1.08` and elevated shadow.
  - Center-based bounding box hit testing with `"Swap"` badge.
  - Disables parent `ScrollView` during drag (`scrollEnabled={!isDragging}`) with termination protection (`onPanResponderTerminationRequest: () => false`).
- **Pill Badges**:
  - Top Photo: `★ Top Photo` (anchored to slot 0).
  - Attached perspective: `✓ Perspective` (tapping opens the perspective editor).
  - Unattached slot: `+ Perspective`.

### 4.2 Voice Perspectives (15-Second Audio)
- **Modal**: `AudioRecordingModal.tsx`
- **Features**:
  - 15-second strict countdown timer with circular progress animation.
  - Waveform visualizer during recording and playback.
  - Replay, re-record, or delete prior to saving.
  - Attach a perspective question (e.g. *"How does my voice come across?"*).
- **Reordering**:
  - Each voice card features `↑` (Move Up) and `↓` (Move Down) buttons.
  - Tapping `↑` or `↓` swaps the position with the adjacent voice perspective.
  - Position invariant: Photos always precede audio (`[...photoPosts, ...reorderedAudio]`).

### 4.3 Written Perspectives System
- **Library Modal**: `PromptLibraryModal.tsx`
  - 5 categories: First Impressions, Personality, Dating & Connection, Interests & Stories, Voice.
  - Search filter and custom question input.
- **Card Management & Reordering**:
  - Each written perspective shows category label, perspective question, and attached photo badge.
  - Features `↑` (Move Up) and `↓` (Move Down) buttons.
  - Tapping `↑` or `↓` swaps the perspective question, category, and focus areas between the adjacent photos via `api.posts.update`.

---

## 5. Backend Architecture & API Contracts

### 5.1 Shared Contract (`packages/contracts/src/post.ts`)
```typescript
export const ReorderPostsInputSchema = z.object({
  postIds: z.array(IdSchema).min(RULES.minPosts).max(RULES.maxPosts),
});
export type ReorderPostsInput = z.infer<typeof ReorderPostsInputSchema>;
```

### 5.2 API Client (`packages/api-client/src/client.ts`)
```typescript
reorder: (postIds: string[], idempotencyKey?: string) =>
  request<Post[]>(`/v1/me/posts/reorder`, {
    method: 'PATCH',
    body: { postIds },
    idempotencyKey,
    schema: z.array(PostSchema),
  }),
```

### 5.3 NestJS Controller & Service (`apps/api/src/posts/`)
- **Endpoint**: `PATCH /v1/me/posts/reorder`
- **Validation**:
  - Verifies that all active posts owned by the user are present in the list.
  - Enforces that `postIds[0]` MUST be a photo (`PRIMARY_POST_REQUIRED`).
  - Executes position updates in an atomic PostgreSQL transaction (`this.prisma.$transaction(...)`).
  - Recomputes profile live status (`this.profiles.recomputeLive(userId)`).

---

## 6. Complete List of Files Changed / Created

A total of **22 files** were modified or created (+3,150 lines, -35 lines):

| File Path | Status | Description |
| :--- | :--- | :--- |
| `packages/contracts/src/post.ts` | Modified | Added `ReorderPostsInputSchema` and `ReorderPostsInput` types. |
| `packages/api-client/src/client.ts` | Modified | Added `api.posts.reorder` with idempotency support. |
| `apps/api/src/posts/posts.service.ts` | Modified | Added `reorder` method with atomic transaction and cover photo validation. |
| `apps/api/src/posts/posts.controller.ts` | Modified | Added `PATCH /v1/me/posts/reorder` endpoint handler. |
| `apps/api/test/e2e/auth-and-profile.e2e-spec.ts` | Modified | Added E2E tests for post reordering and position 0 photo constraint. |
| `apps/api/test/e2e/setup-env.ts` | Modified | Configured environment variables for E2E tests. |
| `apps/mobile/src/components/profile/PhotoGridReorder.tsx` | **Created** | 3x2 grid with 2s temporary switch arrows, PanResponder drag, and pill badges. |
| `apps/mobile/src/components/profile/AudioRecordingModal.tsx` | **Created** | 15s voice note recorder with countdown ring, waveform visualizer, and review. |
| `apps/mobile/src/components/profile/PromptLibraryModal.tsx` | **Created** | Searchable 5-category perspective library with custom question input. |
| `apps/mobile/src/components/profile/EditPostPromptModal.tsx` | **Created** | Modal to edit attached perspective question, category, and focus areas. |
| `apps/mobile/src/components/profile/PhotoUploadModal.tsx` | **Created** | Image picker with attached perspective selector and category chips. |
| `apps/mobile/src/lib/promptLibrary.ts` | **Created** | Curated catalog of perspective questions across 5 categories. |
| `apps/mobile/test/profile-editor.test.ts` | **Created** | Unit test suite for prompt contracts, voice limits, and categories. |
| `apps/mobile/app/me/edit.tsx` | Modified | Synchronized `Edit` and `View` modes, voice/written reordering, details sections. |
| `apps/mobile/app/onboarding/index.tsx` | Modified | Added Step 4 dedicated "Set Up Your Profile" bridge screen. |
| `apps/mobile/src/components/forms/SelfieStep.tsx` | Modified | Implemented safe development selfie verification bypass (`__DEV__`). |
| `apps/mobile/src/components/profile/PostCard.tsx` | Modified | Updated labels to Perspective and verified public rendering. |
| `apps/mobile/src/features/hooks.ts` | Modified | Added `useReorderPosts` with immediate query cache update (`setQueryData`). |
| `apps/mobile/app/(auth)/login.tsx` | Modified | Streamlined dev login flow. |
| `apps/mobile/app/(tabs)/you.tsx` | Modified | Added primary "Edit Profile & Live Preview" entry CTA. |
| `apps/mobile/app/index.tsx` | Modified | Handled root navigation routing. |
| `apps/mobile/src/session/tokenStore.ts` | Modified | Preserved authentication session state across app reloads. |

---

## 7. Verification Results

### 7.1 Monorepo TypeScript Strict Typecheck
```bash
$ pnpm -r run typecheck
Scope: 6 of 7 workspace projects
packages/contracts: tsc --noEmit (Passed)
packages/design-tokens: tsc --noEmit (Passed)
packages/api-client: tsc --noEmit (Passed)
apps/api: tsc --noEmit (Passed)
apps/mobile: tsc --noEmit (Passed)
Done: 0 errors across all packages.
```

### 7.2 Monorepo Unit Tests
```bash
$ pnpm test
PASS packages/api-client: 6 passed, 6 total
PASS apps/api: 19 passed, 19 total
PASS apps/mobile: 9 passed, 9 total (helpers.test.ts & profile-editor.test.ts)
Done: 34 unit tests passed.
```

### 7.3 API E2E Integration Tests (PostgreSQL 16)
```bash
$ pnpm --filter @perspective/api run test:e2e
PASS test/e2e/core-loop.e2e-spec.ts (6.541 s)
PASS test/e2e/auth-and-profile.e2e-spec.ts (1.771 s)
Test Suites: 2 passed, 2 total
Tests:       18 passed, 18 total
Snapshots:   0 total
```

### 7.4 Live iOS Simulator Verification (iPhone 17)
- Captured screenshots confirming:
  - Clean Hinge-style 3x2 grid with no permanent clutter.
  - 2-second switch arrows appear on tap and auto-dismiss.
  - Bidirectional swap: Slot 0 shifts right to Slot 1, Slot 1 shifts left to Slot 0.
  - Voice Perspectives card with `↑` and `↓` reorder buttons and `+ Add Voice` button.
  - Written Perspectives list with `↑` and `↓` reorder buttons to swap questions between photos.
  - Synchronized `View` mode rendering the public profile stack without PII leakage.

---

## 8. Git & Branch Status
- **Current Branch**: `bharath`
- **Pushed To**:
  - `origin/bharath`: Up to date at `e8a7ed6`
  - `origin/dev`: Up to date at `e8a7ed6`
- **Working Tree**: Clean (`nothing to commit, working tree clean`)
