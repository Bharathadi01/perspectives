# PERSPECTIVE — Full Onboarding, Profile Editor & Backend Architecture Handover

> **Audience**: Engineering Team & Collaborators  
> **Branches**: `bharath` and `dev`  
> **Date**: October 18, 2026  
> **Status**: Verified, Tested (63 Workspace Unit Tests + 19 API E2E Tests Passing)

---

## 1. Executive Summary

Today's work encompasses two major milestones for **Perspective**:
1. **Research-Driven Onboarding & Matching Engine**: Complete multi-step onboarding wizard collecting user vitals, dev-safe selfie verification, dating intentions, lifestyle pace, social preferences, and personality prompts, feeding directly into a personalized compatibility scoring engine.
2. **Hinge-Style Profile Editor & Flexible Perspectives System**: A comprehensive redesign of the profile editing experience (`/me/edit`) and profile view (`/me`), featuring a 6-slot interactive reorder grid (`PhotoGridReorder`), dual synchronized Edit vs. View tabs, and the ability to add:
   - **Photos with Attached Perspectives** (photo + written question or voice note),
   - **Standalone Voice Perspectives** (recorded audio note without a photo),
   - **Standalone Written Perspectives** (question prompt + category + focus hints without a photo).

This document serves as an exhaustive reference of all architectural, database, contract, and UI changes made today, details every issue encountered and resolved, and provides step-by-step instructions for collaborators to avoid merge conflicts.

---

## 2. Backend & Database Changes (CRITICAL FOR COLLABORATION)

To allow perspectives to exist **with or without a photo**, the database schema and API contracts were evolved from a photo-only model to a polymorphic post model.

### 2.1 Database Migrations (`apps/api/prisma/schema.prisma`)

#### A. Updated `PostKind` Enum
Added `'text'` to support standalone written perspectives without an image:
```prisma
enum PostKind {
  photo
  audio
  text
}
```

#### B. Updated `Post` Table Columns
- **`mediaId` (Photo/Visual Media)**: Made optional (`NULLABLE`). Standalone written posts (`kind: 'text'`) do not have an associated media record.
- **`audioMediaId` (Attached Voice Perspective)**: Added as an optional foreign key to `media(id)` with a unique index. A photo post can now have an attached audio note without replacing its primary image.

```prisma
model Post {
  id               String       @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  ownerId          String       @db.Uuid
  position         Int          @default(0)
  kind             PostKind
  mediaId          String?      @unique @db.Uuid
  audioMediaId     String?      @unique @db.Uuid
  prompt           String       @db.VarChar(200)
  category         PostCategory
  focusAreas       String[]
  status           PostStatus   @default(active)
  createdAt        DateTime     @default(now()) @db.Timestamptz(6)

  owner            User         @relation(fields: [ownerId], references: [id], onDelete: Cascade)
  media            Media?       @relation("PostMedia", fields: [mediaId], references: [id], onDelete: Restrict)
  audioMedia       Media?       @relation("PostAudioMedia", fields: [audioMediaId], references: [id], onDelete: SetNull)

  @@index([ownerId, status, position])
  @@map("posts")
}
```

### 2.2 SQL Commands Required for Local Postgres Databases

If you or your co-worker are pulling this branch into an existing database instance, run these SQL statements in `psql` or run `pnpm --filter @perspective/api prisma db push`:

```sql
-- 1. Add 'text' to the PostKind enum
ALTER TYPE "PostKind" ADD VALUE IF NOT EXISTS 'text';

-- 2. Allow mediaId to be null for text-only posts
ALTER TABLE "posts" ALTER COLUMN "mediaId" DROP NOT NULL;

-- 3. Add audioMediaId column if it doesn't exist
ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "audioMediaId" UUID REFERENCES "media"("id") ON DELETE SET NULL;

-- 4. Create unique constraint on audioMediaId
CREATE UNIQUE INDEX IF NOT EXISTS "posts_audioMediaId_key" ON "posts"("audioMediaId");
```

> **Note for Test Database**: If running e2e tests (`pnpm test:e2e`), remember that `perspective_test` has its own database. Ensure `DATABASE_URL='postgresql://perspective:perspective@localhost:5432/perspective_test?schema=public' npx prisma db push --accept-data-loss` has been executed.

---

### 2.3 Shared Contracts Changes (`packages/contracts`)

- **`packages/contracts/src/post.ts`**:
  - `PostKind`: `z.enum(['photo', 'audio', 'text'])`.
  - `CreatePostInputSchema`:
    - `mediaId`: `IdSchema.optional().nullable()`.
    - `audioMediaId`: `IdSchema.optional().nullable()`.
    - `kind`: `PostKind`.
  - `PostSchema`:
    - `mediaUrl`: `z.string().nullable().optional()`.
    - `durationSec`: `z.number().nullable().optional()`.
    - `audioMediaUrl`: `z.string().nullable().optional()`.
    - `audioDurationSec`: `z.number().nullable().optional()`.

> **Important**: Always recompile contracts after pulling!
> ```bash
> pnpm --filter @perspective/contracts build
> pnpm --filter @perspective/api-client build
> ```

---

### 2.4 API Services & Endpoints (`apps/api`)

1. **`posts.service.ts`**:
   - `create()`:
     - Enforces that `position: 0` must always be a photo (`kind === 'photo'`).
     - Allows `kind === 'text'` without requiring `mediaId`.
     - Supports `audioMediaId` attachment for photo posts with voice perspectives.
   - `reorder()` (`PATCH /v1/me/posts/reorder`):
     - Validates that the item moved to `position: 0` is a photo (`kind === 'photo'`). If a user tries to place a text or voice card as the cover card, it throws `PRIMARY_POST_REQUIRED`.
   - `remove()` (`DELETE /v1/me/posts/:id`):
     - If the primary photo is deleted, automatically promotes the next photo to `position: 0`.
     - Guarantees at least one photo remains on the profile.
2. **`profile.mapper.ts`**:
   - Gracefully maps `row.media` (`mediaUrl: row.media ? this.signer.sign(row.media.id) : null`).
   - Maps `row.audioMedia` (`audioMediaUrl: row.audioMedia ? this.signer.sign(row.audioMedia.id) : null`).
3. **`media.service.ts`**:
   - Handles audio uploads with correct MIME types (`audio/m4a`, `audio/wav`), base64 decoding, and duration tracking.

---

## 3. Mobile Client Changes (`apps/mobile`)

### 3.1 Onboarding Flow
- **Step 1: Vitals & Age**: Full name, birthdate (18+ verification), gender, and height. Implemented `normalizeDigits` in `src/lib/labels.ts` to convert non-ASCII/Unicode numbers (e.g., Arabic-Indic, Devanagari) to standard ASCII digits.
- **Step 2: Selfie Verification**: Dev bypass button enabled exclusively in `__DEV__` mode to allow smooth simulator testing without physical camera hardware.
- **Step 3: Discovery Preferences**: Audience filters (gender preferences, age ranges).
- **Step 4: Lifestyle & Prompts**: Lifestyle pace, social preference, and 3 personality prompt answers.
- **Step 5: Profile Bridge**: High-impact transition screen guiding new users into the visual profile builder.

### 3.2 Profile Editor (`/me/edit`)
- **Segmented Header (`Edit` | `View`)**: Instant tab switching between editing and live profile preview without losing draft state.
- **"My Photos & Perspectives" Section**:
  - Displays a 6-slot interactive grid.
  - Header features a direct `+ Add` button next to the title.
  - Tapping `+ Add` or an empty slot (`+`) presents an **Add Choice Sheet**:
    1. **Photo with Perspective**: Opens `PhotoUploadModal` (upload photo + attach optional voice/written prompt).
    2. **Voice Perspective (No photo)**: Opens `AudioRecordingModal` (record voice answer without a picture).
    3. **Written Perspective (No photo)**: Opens `WrittenPerspectiveModal` (select prompt, category, and focus tags without a picture).
  - Slot 0 protection: If 0 posts exist, tapping slot 0 automatically directs to the photo modal to ensure the required featured photo is created first.
- **Grid Slot Rendering (`PhotoGridReorder.tsx`)**:
  - `photo`: Renders image with top-right remove (`✕`) button, voice badge if voice is attached, and bottom overlay with prompt snippet.
  - `audio`: Renders a dark purple card with mic circle, `VOICE` pill badge, duration label, and prompt quote.
  - `text`: Renders a cream/themed card with category pill (e.g., `LOOKS`, `STYLE`), prompt quote, and `#focus` tag.
  - Supports 2-second temporary switch arrows (`<` and `>`) on tap, plus smooth drag-and-drop reordering.
- **Attached Perspectives List**:
  - Positioned below the grid; dynamically displays all active posts.
  - Voice perspectives include an inline audio playback bar with play/pause button, progress wave, and duration.
  - Written perspectives display category badge and `#focus` chips.
  - Each item has an **Edit** button opening `EditPostPromptModal`.

### 3.3 Public Card Stack (`PostCard.tsx` & `ProfileView.tsx`)
- `PhotoPostCard`: Full-width photo card with bottom overlay prompt or interactive voice caption.
- `AudioPostCard`: Full-width voice card with waveform and play/pause button.
- `TextPostCard`: Standalone written prompt card with category badge, prompt text, and focus area tags.
- All cards contain a "Give Perspective" interaction button for other users in Discovery.

---

## 4. Problems Faced & Open Solutions (Full Disclosure)

### Problem 1: PostgreSQL `enum` Not Updated Automatically
- **Symptom**: `Invalid input value for enum "PostKind": "text"` when creating a written post.
- **Cause**: Prisma schema changes to an `enum` do not alter the existing Postgres enum type unless a migration or direct SQL `ALTER TYPE` is executed.
- **Resolution**: Ran `ALTER TYPE "PostKind" ADD VALUE IF NOT EXISTS 'text';` directly on the Postgres server, followed by `npx prisma db push`.

### Problem 2: Foreign Key Constraint on `mediaId`
- **Symptom**: `Null constraint violation on posts.mediaId`.
- **Cause**: `posts` table previously enforced `mediaId NOT NULL`.
- **Resolution**: Ran `ALTER TABLE "posts" ALTER COLUMN "mediaId" DROP NOT NULL;` and updated Prisma model to `mediaId String? @unique @db.Uuid`.

### Problem 3: Out-of-Sync Test Database (`perspective_test`)
- **Symptom**: E2E tests threw `The column posts.audioMediaId does not exist in the current database`.
- **Cause**: The test suite runs against `perspective_test` rather than the development database `perspective`. While the dev database had been migrated, `perspective_test` lacked the new column.
- **Resolution**: Synchronized the test database using:
  ```bash
  DATABASE_URL='postgresql://perspective:perspective@localhost:5432/perspective_test?schema=public' npx prisma db push --accept-data-loss
  ```

### Problem 4: Pre-compiled Package Types (`dist/`) Drift
- **Symptom**: `tsc --noEmit` in `apps/mobile` complained that `'text'` was not assignable to `'photo' | 'audio'`.
- **Cause**: In this monorepo, `apps/mobile` imports `@perspective/contracts` from its built `dist/` folder, not directly from `src/`. Editing `packages/contracts/src/post.ts` did not immediately update `dist/post.d.ts`.
- **Resolution**: Ran `pnpm --filter @perspective/contracts build && pnpm --filter @perspective/api-client build`.

### Problem 5: Accidental Non-Photo Placement at Slot 0
- **Symptom**: If a user reordered a text or voice card to position 0, the backend threw a 422 `PRIMARY_POST_REQUIRED` error.
- **Cause**: The business logic requires position 0 to be a photo.
- **Resolution**: Implemented client-side guards in `PhotoGridReorder` and `handleReorderPosts` in `edit.tsx` that intercept reorders to position 0 and notify the user with a friendly toast (`"The top card (slot 1) must be a photo to introduce yourself"`).

### Problem 6: Multilingual Height Input Bug on iOS Simulator
- **Symptom**: Typing height on iOS keyboards sometimes cleared the input or caused NaN.
- **Cause**: Number parsing failed when simulator keyboard produced non-ASCII Unicode digits.
- **Resolution**: Created `normalizeDigits()` utility in `src/lib/labels.ts` which converts all Unicode digit representations into standard 0-9 digits before parsing.

---

## 5. Guide for Your Co-Worker: How to Pull & Avoid Merge Conflicts

Please send these exact instructions to your friend/collaborator:

```bash
# 1. Fetch latest changes from remote
git fetch origin

# 2. Checkout your working branch (or dev) and pull
git checkout dev
git pull origin dev

# 3. Install dependencies to ensure lockfile is aligned
pnpm install

# 4. Update your local PostgreSQL database schema
cd apps/api
npx prisma db push
npx prisma generate
cd ../..

# 5. Rebuild shared packages (MANDATORY for TypeScript types)
pnpm --filter @perspective/contracts build
pnpm --filter @perspective/api-client build

# 6. Verify tests and typechecks pass
pnpm typecheck
pnpm test
```

### Potential Merge Conflict Hotspots
1. **`apps/api/prisma/schema.prisma`**: If your friend added models, accept both models and keep `kind PostKind` with `text` and `mediaId String?`.
2. **`packages/contracts/src/post.ts`**: Make sure `PostKind` includes `'text'` and `CreatePostInputSchema.mediaId` remains optional.
3. **`apps/mobile/app/me/edit.tsx`**: Contains the full grid reorder integration. If your friend edited styling or form fields, accept their form fields while keeping `PhotoGridReorder` and the `Sheet` choice menu.

---

## 6. Verification Status

| Suite | Status | Details |
| :--- | :--- | :--- |
| **Contracts Build** | ✅ PASS | Types cleanly exported to `dist/` |
| **API Client Build** | ✅ PASS | API client methods aligned with contracts |
| **API Unit Tests** | ✅ PASS | 40/40 tests passing |
| **API E2E Tests** | ✅ PASS | 19/19 tests passing (including text & audio without photo) |
| **Mobile Unit Tests** | ✅ PASS | 17/17 tests passing (including schema validations) |
| **Workspace Typecheck**| ✅ PASS | Zero TypeScript errors across all workspaces |
| **iOS Simulator** | ✅ PASS | Verified on iPhone 17 (UDID `E8E5A9C3-EF9B-4A96-9175-DE2232FEE886`) |
