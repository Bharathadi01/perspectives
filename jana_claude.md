# JANA_CLAUDE.md: Agentic Collaboration Guide & Codebase Context

> **Operating System & Behavioral Guide for Jana's AI Coding Agent (Claude Code / Agentic CLI)**  
> **Repository:** `https://github.com/Bharathadi01/perspectives.git`  
> **Monorepo Architecture:** React Native (Expo Router) + NestJS (Prisma/PostgreSQL) + Python (FastAPI) + pnpm workspaces  
> **Core Rule:** Never overwrite a teammate's work. Always take the union of features, reconcile conflicts cleanly, enforce database isolation, and generate a pre-push sync manifest.

---

## Table of Contents
1. [Core Mission & Product Boundaries](#1-core-mission--product-boundaries)
2. [Full Codebase Context & Existing Architecture](#2-full-codebase-context--existing-architecture)
3. [Tools, Runtime & Environment Inventory](#3-tools-runtime--environment-inventory)
4. [Database Conflict Prevention & Table Isolation (Critical)](#4-database-conflict-prevention--table-isolation-critical)
5. [The "Vibe Coding Together" Pitfalls & Solutions](#5-the-vibe-coding-together-pitfalls--solutions)
6. [Mandatory Pre-Push Protocol: The Sync Manifest](#6-mandatory-pre-push-protocol-the-sync-manifest)
7. [Conflict Resolution & Feature Reconciliation Protocol](#7-conflict-resolution--feature-reconciliation-protocol)
8. [Quick Start Instructions for Jana's Agent](#8-quick-start-instructions-for-janas-agent)

---

## 1. Core Mission & Product Boundaries

> **Product source of truth:** `docs/PRODUCT.md`. The product has moved on from the skeleton described in section 2, so where this guide and `docs/PRODUCT.md` disagree, `docs/PRODUCT.md` wins. Section 2 describes what the skeleton contains today, not the target product; items marked *legacy* will change.

Perspective is a **privacy-first, selfie-verified (18+ only) platform** where people give each other honest, text-only perspectives on how they look, dress, sound, and show up, and can then connect. It is a dating app at its core with a unique hook (perspectives), marketed perspectives-first rather than as "a dating app"; the same open Connect also serves friends, gym buddies, and networking. Each profile has basics plus 1 to 6 posts (photo or 15-second audio with a prompt or question). Each day a user gives perspectives on a mandatory set of profiles to unlock the perspectives they received.

### Non-Negotiable Product Rules (Never Violate):
1. **No Public Vanity Metrics:** Never add public follower counts, like counts, numeric attractiveness scores, or public comment feeds. A perspective is private: visible only to the post owner and the giver.
2. **Connect Gate for Chat:** Chat (`/chat/:id`) is **never** initiated unilaterally. A user may ask to connect only after giving the other person a perspective, and the other person must accept. Connect is open: there are **no connection intents or modes** (no `friends`, `date`, `network` labels). After a decline, the same sender cannot send another request to that person for 14 days (configurable).
3. **Safety & DPDP Compliance as P0:** Strict 18+ age gate, selfie verification at profile creation, reporting system (`/safety/report`), block system (`/safety/block`), and in-app DPDP-compliant account/data deletion (`/safety/delete-account`).
4. **Strict PII Shielding:** Sensitive fields (phone, email, birth date, exact GPS coordinates, raw moderation scores, selfie-verification media) must **never** be exposed in public DTOs or client-facing responses.

---

## 2. Full Codebase Context & Existing Architecture

The repository is organized as a high-performance **pnpm monorepo** with shared packages and microservices:

```
perspectives/
├── packages/
│   ├── design-tokens/       # Central design system (colors, typography, spacing, radii)
│   ├── contracts/           # Single source of truth for Zod schemas, types & DTOs
│   ├── api-client/          # Typed SDK interface + authentic mock fixtures (Asha, Kabir, Meera)
│   └── config/              # Shared tsconfig base configurations
├── apps/
│   ├── mobile/              # React Native + Expo (Expo Router v4, TanStack Query, Zustand)
│   ├── api/                 # NestJS modular monolith + Prisma + PostgreSQL/pgvector + Swagger
│   └── ai-service/          # Python 3.11 + FastAPI skeleton for embeddings & text moderation
├── docs/                    # Architectural decisions, blueprint, database docs, security specs
├── sync-manifests/          # Mandatory pre-push agent changelogs
├── docker-compose.yml       # PostgreSQL 16 + pgvector (5432) & Redis 7 (6379)
├── pnpm-workspace.yaml      # Monorepo workspace configuration
└── turbo.json               # Turbo build orchestration
```

### Deep Dive into Packages & Apps

#### A. `@perspective/design-tokens` (`packages/design-tokens`)
- **Colors:**
  - `bgPrimary`: `#F7F4EE` (warm editorial off-white background)
  - `bgSurface`: `#FFFFFF` (card surfaces)
  - `textPrimary`: `#17171B` (deep charcoal text)
  - `textSecondary`: `#6E6C73` (subdued grey metadata)
  - `accentPrimary`: `#5B4BDB` (editorial royal purple)
  - `accentSuccess`: `#287A5B` (calm green)
  - `accentWarning`: `#B86B20` (amber)
  - `accentDanger`: `#B33A3A` (subdued crimson)
- **Rules:** Never use inline raw hex values (`#fff`, `#000`) in UI code. Always import tokens: `import { tokens } from '@perspective/design-tokens'`.
- **Touch Targets:** Minimum 44–48px hit areas on all touchable elements.

#### B. `@perspective/contracts` (`packages/contracts`)
- **Zod Schemas & TypeScript Types:**
  - `User`, `Profile`, `LensChip` (*legacy*, lenses are not part of the core model), `AgeBand`
  - `PerspectiveRequest` (becomes a profile *post*), `RequestCategory`, `ResponseStyle` (*legacy*)
  - `PerspectiveResponse` (becomes a text comment with optional chips; the structured first-impression, reason, suggestion, tags, and tone fields are *legacy*), `ToneCheck`, `ResponseFeedback`
  - `Connection`, `ConnectionMode` (`friends`, `network`, `collaborate`, `date`, `chat`; *legacy*, to be removed because Connect is open with no intents), `ChatMessage`
  - `ExploreBatchResponse`, `SafetyReport`, `AccountDeletionRequest`
  - `ApiErrorEnvelope` (standardized error shape: `{ success: false, error: { code, message, details } }`)
- **Rule:** Mobile and API **must** import types and schemas from this package. Never duplicate interfaces across apps!

#### C. `@perspective/api-client` (`packages/api-client`)
- **`PerspectiveApiClient` Interface:** Typed contract for all mobile queries and mutations.
- **`InMemoryPerspectiveClient`:** Complete local mock client backed by authentic seed fixtures (`Asha`, `Kabir`, `Meera`). Allows the mobile app to be fully interactive offline or during independent UI development without needing a running database!
- **Rule:** UI components must call the client interface, never raw `fetch()` or direct database connections.

#### D. Mobile Client (`apps/mobile`)
- **Framework:** React Native 0.76 + Expo SDK 52 + Expo Router v4.
- **Tab Shell (`apps/mobile/app/(tabs)`):**
  - `explore.tsx`: One-card-at-a-time discovery feed with request prompt, context, audience tags, and skip/respond actions.
  - `inbox.tsx`: Incoming perspective review with "Helpful", "Connect", and "Thank privately" interactions. (The connect step here uses the *legacy* intent sheet; the target is the open Connect flow with the perspective gate and accept/decline.)
  - `create.tsx`: Request composer with category selectors, 200-char question limits, response style tags, and allowed connection mode toggles. (The connection-mode toggles and response-style tags are *legacy*; the target is adding or editing profile posts.)
  - `connections.tsx`: Active mutual connections with origin perspective cards and direct message deep links. (Shows a connection-mode badge, which is *legacy*; Connect has no modes.)
  - `you.tsx`: Deep profile view, completeness meter, lenses, and safety settings. (Lenses and connection modes are *legacy*; the target adds gender, height, orientation, selfie verification, audience, and up to six posts.)
- **Dedicated Screens:**
  - `apps/mobile/app/chat/[id].tsx`: Threaded messaging with persistent Origin Connection Card context.
  - `apps/mobile/app/(auth)/login.tsx`: Phone/email authentication screen.
  - `apps/mobile/app/onboarding/index.tsx`: 18+ age gate and terms acknowledgment.
- **13 Core Accessible Components (`apps/mobile/src/components`):**
  1. `PerspectiveRequestCard`: Single card displaying request, question, photo, context, and lenses. (Target: a profile post card; the lens display is *legacy*.)
  2. `PersonHeader`: Avatar, verification badge (`✓`), age band, and city.
  3. `LensChip`: Accessible pill tag representing identity or skill lens. (*Legacy*: lenses are not part of the core model; the pill style can be reused for chips and focus areas.)
  4. `PromptBlock`: Question typography presentation.
  5. `ResponseNote`: Render structured perspective notes with tone tags. (Target: render a text comment with optional chips; the structured fields and tone are *legacy*.)
  6. `PrimaryButton`: 48px touch-target royal purple action button.
  7. `SecondaryButton`: 48px touch-target neutral outline action button.
  8. `ConnectionIntentSheet`: Bottom sheet modal for expressing private connection intent. (*Legacy*: Connect has no intents; this becomes a connect-request sheet with no intent picker.)
  9. `EmptyState`: Calm zero-state illustration and explanatory text.
  10. `ModerationStateBanner`: Informational banner when content is pending review.
  11. `ProfileCompletenessMeter`: Visual progress tracker for profile setup.
  12. `OriginContextCard`: Compact card displayed at the top of chat showing why two people connected.
  13. `SafetyOverflowMenu`: Overflow modal providing Block, Report, and Safety controls.

#### E. Backend API (`apps/api`)
- **Framework:** NestJS 10 + TypeScript + Prisma ORM.
- **Modules:**
  - `RequestsModule` (`requests/`): Create, list, rank, and expire requests. (Target: profile posts, 1 to 6 per profile, with no expiry.)
  - `ResponsesModule` (`responses/`): Submit structured perspectives, give feedback (`helpful` / `unhelpful`). (Target: a required text comment with optional chips, unlocked daily.)
  - `ExploreModule` (`explore/`): Cold-start and weighted ranking explore feed (`ExploreService`).
  - `ConnectionsModule` (`connections/`): Mutual intent verification (*legacy*; the target is the perspective gate plus accept/decline), connection lifecycle, chat threads.
  - `SafetyModule` (`safety/`): User reporting, blocking, DPDP data deletion jobs (`DeletionJob`).
  - `HealthModule` (`health/`): `/health` probe.
- **Cross-Cutting Concerns:**
  - `AuthGuard` (`common/guards/auth.guard.ts`): Default-deny route protection with mock authentication support for testing.
  - `ApiExceptionFilter` (`common/filters/api-exception.filter.ts`): Catches HTTP and Prisma errors, mapping them to the standard `ApiErrorEnvelope`.
  - **Swagger OpenAPI:** Auto-generated interactive documentation available at `http://localhost:3000/docs`.

#### F. AI Service (`apps/ai-service`)
- **Framework:** Python 3.11 + FastAPI + Uvicorn.
- **Endpoints:**
  - `/moderate`: Text and media screening for harassment, NSFW, or PII.
  - `/embeddings`: Semantic vector embeddings for future interest matching and category clustering.
- **Isolation Boundary:** The AI service is stateless and isolated. It **never** mutates the database directly; it returns classification payloads for NestJS to validate.

---

## 3. Tools, Runtime & Environment Inventory

When running, developing, or testing, the following tools and ports are used:
- **Node.js:** v20+ (managed via nvm or system)
- **Package Manager:** `pnpm` (v9 or v12). Always run commands via `pnpm`, never `npm` or `yarn`.
- **Database:** PostgreSQL 16 + `pgvector:v0.8.0` on port `5432` (`docker-compose.yml`).
- **Cache / Queues:** Redis 7-alpine on port `6379` (`docker-compose.yml`).
- **NestJS API:** Port `3000` (Swagger UI at `http://localhost:3000/docs`).
- **Expo / Metro Bundler:** Port `8081` (`exp://localhost:8081`).
- **Android SDK:** `$ANDROID_HOME` located at `~/Library/Android/sdk` (macOS), with `adb` and `emulator` in `PATH`.
- **Prisma CLI:** `pnpm --filter @perspective/api exec prisma ...`

---

## 4. Database Conflict Prevention & Table Isolation (CRITICAL)

When two developers (Bharath and Jana) work concurrently on different branches, database schema collisions are the #1 risk. Follow these ironclad rules:

### Rule 4.1: Separate Local Database Instances
- **Never share a remote dev database.** Bharath and Jana must run their own local Docker PostgreSQL container on their respective machines:
  ```bash
  docker compose up -d postgres redis
  ```
- Your local migrations only affect your local database until merged to `main`.

### Rule 4.2: Additive-Only Schema Changes (Non-Destructive)
- When adding columns or tables to `apps/api/prisma/schema.prisma`:
  - **Never delete or rename existing columns** in-flight.
  - Always make new columns **optional** (`String?`) or provide a default value (`@default("active")`).
  - This ensures that if Bharath’s code runs against Jana’s database (or vice versa), existing queries and inserts do not break!

### Rule 4.3: Table-Level Ownership & Namespace Strategy
If both developers are working on features that touch the same table (e.g. `User`, `Profile`, or `PerspectiveRequest`):
1. **Coordinate Field Naming:** Before modifying a model, check `docs/ACTIVE_CHANGES.md` or announce the proposed field name.
2. **Feature-Prefixed Experimental Columns:** If working on an unmerged experimental feature, prefix the column name with the feature scope (e.g., `audioPromptUrl` rather than a generic `mediaUrl` that could clash).
3. **Sub-Tables for Complex Extensions:** Instead of bloating an existing shared model like `PerspectiveRequest`, create a 1-to-1 or 1-to-many child table (e.g., `RequestVoiceNote` or `RequestAudienceFilter`) linked via foreign key. This keeps the core table pristine and prevents merge conflicts!

### Rule 4.4: Migration Creation Protocol
When creating a Prisma migration:
1. Always give the migration a descriptive name prefixed with your name:
   ```bash
   pnpm --filter @perspective/api exec prisma migrate dev --name <jira-or-task>_jana_<description>
   # Example:
   pnpm --filter @perspective/api exec prisma migrate dev --name audio_posts_jana_add_audio_table
   ```
2. **Never edit an existing migration file in `prisma/migrations/` that has already been merged to `main`!**
3. If your branch falls behind `main`, rebase your branch on `main` and run:
   ```bash
   pnpm --filter @perspective/api exec prisma migrate dev
   ```

### Rule 4.5: Deterministic Fixtures & Seed Isolation
- When adding test fixtures or seeds, use deterministic UUIDs prefixed or namespaced so they do not clash:
  - Bharath's fixtures: `usr_asha_001`, `req_style_001`
  - Jana's fixtures: `usr_jana_test_001`, `req_jana_001`
- Keep mock fixtures in `packages/api-client/src/fixtures.ts` synced with Prisma seed scripts.

---

## 5. The "Vibe Coding Together" Pitfalls & Solutions

Deep research on collaborative multi-agent vibe coding reveals specific traps. Here is how Jana's agent must avoid each one:

| Pitfall | Root Cause | Solution for Jana's Agent |
|---|---|---|
| **1. Lockfile Thrashing** | Agent runs `pnpm add <pkg>` without checking, causing massive `pnpm-lock.yaml` diffs and version mismatch. | Only install packages with explicit approval. Check root `package.json` first. Always run `pnpm install` without `--force`. |
| **2. ESM / CJS Metro Breakage** | Installing pure ESM packages (e.g. `query-string` v9) that crash React Native/Metro with CommonJS errors. | In `apps/mobile`, verify new packages are React Native/Expo compatible. Prefer existing pinned libraries. |
| **3. Hardcoded Hex & Style Drift** | Agent invents new colors (`#3b82f6`, `#ef4444`) instead of adhering to the design system. | Always import and use `tokens.colors.*` from `@perspective/design-tokens`. Reject any PR with raw hex colors! |
| **4. Ad-Hoc UI Component Duplication** | Agent creates a new `CustomButton.tsx` or `Chip.tsx` instead of using existing atoms. | First inspect `apps/mobile/src/components/`. Reuse `PrimaryButton`, `LensChip`, `PromptBlock`, etc. |
| **5. Port & Service Collisions** | Dev servers colliding on ports 3000, 5432, or 8081. | Docker and Metro use standard ports. If running simultaneously on the same host, use `.env` overrides (`PORT=3001`, `EXPO_PORT=8082`). |
| **6. Expo Router Route Collisions** | Both devs creating files with the same name in `apps/mobile/app/`. | Keep route additions isolated to dedicated feature folders (e.g., `apps/mobile/app/profile/edit.tsx` vs `apps/mobile/app/(tabs)/you.tsx`). |
| **7. Contract & DTO Drift** | Modifying an API response in NestJS without updating `@perspective/contracts`. | **Contract-First:** Edit `packages/contracts/src/` first, rebuild it (`pnpm --filter @perspective/contracts build`), then update NestJS and Mobile. |
| **8. Silent Exception Swallowing** | Agent puts `try { ... } catch (e) {}` and returns empty arrays, hiding real DB or network bugs. | Map all failures to typed domain exceptions or standard `ApiErrorEnvelope`. Never swallow errors silently! |

---

## 6. Mandatory Pre-Push Protocol: The Sync Manifest

**MANDATORY RULE:** Before committing and pushing any branch to GitHub, every AI agent working on the codebase **must create a Markdown Sync Manifest** inside the `sync-manifests/` directory.

### Manifest File Naming Convention:
`sync-manifests/<developer>_<branch-name>_<YYYYMMDD_HHMM>.md`  
*Example:* `sync-manifests/jana_feat-audio-posts_20261015_1430.md`

### Required Manifest Template:
```markdown
# Sync Manifest: [Feature / Branch Name]

- **Author / Agent:** [Jana / Jana's Agent]
- **Branch:** [e.g., feat/audio-posts]
- **Date & Time:** [ISO timestamp or local date]
- **Base Commit:** [Commit hash branched from]

## 1. Summary of Changes
[2-4 sentences explaining what was built or fixed and why.]

## 2. Modified & Created Files
- `apps/mobile/src/components/NewComponent.tsx`: [Created component for X]
- `apps/api/src/requests/requests.service.ts`: [Added method Y]
- `packages/contracts/src/request.ts`: [Added optional field Z]

## 3. Database & Schema Changes
- **Prisma Schema Modified:** [Yes / No]
- **New Tables:** [List new tables or "None"]
- **New Columns Added:** [e.g. `User.audioBioUrl: String?` - must be nullable/defaulted]
- **Migration Name:** [e.g. `202610151430_jana_add_audio_bio`]

## 4. Contract & API Impact
- **New Endpoints:** [e.g. POST /v1/me/posts/:id/audio]
- **DTO Updates:** [List changes made to @perspective/contracts]
- **Breaking Changes:** [NONE - explain why backwards-compatible]

## 5. UI & Design System Adherence
- [x] All colors imported from `@perspective/design-tokens`
- [x] Minimum 48px touch targets preserved
- [x] Reused existing components where applicable

## 6. Verification & Test Evidence
- [x] `pnpm test` passed: [Number] tests passing
- [x] `pnpm --filter @perspective/contracts build` succeeded
- [x] `pnpm --filter @perspective/api build` succeeded
- [x] Swagger docs verified at `/docs`
- [x] Mobile screen verified without runtime crashes

## 7. Potential Overlap / Conflict Warning
[List any shared files touched (e.g. `schema.prisma`, `packages/contracts/src/index.ts`, `apps/mobile/app/(tabs)/explore.tsx`) so the merging agent knows where to pay extra attention.]
```

---

## 7. Conflict Resolution & Feature Reconciliation Protocol

When Bharath and Jana are working on the same feature or adjacent areas across different branches, merge conflicts may occur upon merging to `main`. 

**The AI agent resolving the merge must follow this strict 5-step reconciliation algorithm:**

```
                    ┌─────────────────────────┐
                    │  1. Three-Way Analysis  │
                    │  (Base vs A vs B)       │
                    └────────────┬────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │  2. Feature Union       │
                    │  (Preserve BOTH feats)  │
                    └────────────┬────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │  3. Redundancy Pruning  │
                    │  (Deduplicate helpers)  │
                    └────────────┬────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │  4. DB Reconciliation   │
                    │  (Combine Prisma models)│
                    └────────────┬────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │  5. Verification Gate   │
                    │  (Tests, Build, Lint)   │
                    └─────────────────────────┘
```

### Step 1: Perform Three-Way Analysis
Before changing a single line of conflict markers, inspect what each branch introduced relative to the common ancestor:
```bash
git diff main...HEAD            # What your branch changed
git diff HEAD...origin/main     # What teammate's branch changed
```
Read the teammate’s latest **Sync Manifest** in `sync-manifests/` to understand their exact design intent.

### Step 2: Feature Union (Never Overwrite)
- If Branch A added *Feature X* to a card (e.g. a lens chip filter) and Branch B added *Feature Y* (e.g. an audio playback button), **the resolved file must contain BOTH Feature X and Feature Y**.
- **Rule:** It is strictly forbidden to resolve a conflict by simply accepting "ours" or "theirs". You must take the **logical union** of both feature sets.

### Step 3: Redundancy Pruning & Deduplication
- If both developers wrote similar helper functions (e.g. date formatters, validation checkers, or styled tags), do not keep duplicate implementations under different names.
- Extract the unified function into the canonical package:
  - General logic / DTOs -> `packages/contracts`
  - Client state / utilities -> `packages/api-client`
  - Visual styling / atoms -> `apps/mobile/src/components` or `packages/design-tokens`
- Ensure all edge cases and unit tests from both developers are retained in the unified helper.

### Step 4: Database Schema Reconciliation
If both branches modified `apps/api/prisma/schema.prisma`:
1. Combine all newly added fields and models.
2. If two migration folders share conflicting timestamps, discard the local unmerged migration and create a single unified forward migration:
   ```bash
   pnpm --filter @perspective/api exec prisma migrate dev --name reconciled_<feature_name>
   ```
3. Test migration replay from scratch locally to verify zero migration drift:
   ```bash
   pnpm --filter @perspective/api exec prisma migrate reset --force
   ```

### Step 5: Verification Gate
Before pushing the resolved merge commit, run the full validation suite:
```bash
pnpm test          # All package and app tests must pass
pnpm typecheck     # Zero TypeScript compiler errors
pnpm build         # All packages must build cleanly
```
Once verified, commit the merge with a clear message:
`merge: reconcile [Feature A] and [Feature B] without feature loss`

---

## 8. Quick Start Instructions for Jana's Agent

When booting up this repository for the first time in your agent session:

```bash
# 1. Install all monorepo dependencies
pnpm install

# 2. Build shared core packages
pnpm --filter @perspective/design-tokens build
pnpm --filter @perspective/contracts build
pnpm --filter @perspective/api-client build

# 3. Run all tests to ensure baseline health
pnpm test

# 4. Start backend backing services
docker compose up -d postgres redis

# 5. Run Prisma migrations and generate client
pnpm --filter @perspective/api exec prisma migrate dev

# 6. Start the API server (Port 3000)
pnpm dev:api

# 7. Start the Mobile Metro bundler (Port 8081)
pnpm dev:mobile
```

**Happy vibe coding! Build thoughtfully, respect privacy, and never overwrite your teammate's code.**
