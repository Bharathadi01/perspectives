# PERSPECTIVE — Research-Driven Onboarding & Personalized Matching Engine

**Author / Engineer**: Principal Product Designer, Senior React Native Engineer, Backend Architect & Recommendation-Systems Engineer  
**Branch**: `bharath` (Pushed to `origin/bharath` and `origin/dev`)  
**Scope**: Competitor Research, 6-Step Progressive Onboarding, Unified Data Dictionary, 5-Stage Matching Engine, Additive Migrations, and Automated Test Coverage  
**Status**: 100% Implemented, Built, Migrated, and Verified  

---

## 1. Executive Summary

This milestone establishes the data foundation and product experience for **Perspective**, an 18+ social feedback and dating application.

Rather than building generic questionnaire screens or theoretical matching algorithms, we conducted deep competitor research into the official architectures of **Tinder**, **Hinge**, and **Bumble**, synthesized their proven patterns, and engineered an original, production-quality onboarding and personalized matching engine end-to-end across the monorepo:

1. **A Distinctive 6-Step Onboarding Mobile Experience**: Built in React Native and Expo Router with progressive disclosure, interactive interest chips, instant search, dynamic selection counters, and draft persistence across back/forward navigation.
2. **Short, High-Signal Question Taxonomy**: 42 canonical interests across 8 clusters, 6 dating intentions with hard dealbreaker flags, lifestyle rhythm, social energy battery, and written perspective prompts.
3. **Structured Data Model & Dictionary**: Full additive Prisma migrations on PostgreSQL and synchronized Zod contracts across `@perspective/contracts`, `@perspective/api`, and `@perspective/mobile`.
4. **Tested, Explainable 5-Stage Matching Engine**: Strict Stage 1 eligibility (hard dealbreakers) paired with normalized Stage 2 compatibility scoring ($40\%$ Jaccard interest overlap, $25\%$ dating intentions matrix, $20\%$ category resonance, and $15\%$ lifestyle pace), dynamic weight renormalization for missing data, and explainable match reasons (`matchReasons`).
5. **Zero Breaking Changes**: Preserved the Hinge-style 3×2 photo grid, perspectives reordering, selfie verification security safeguards, and give-to-get daily batch allocations.

---

## 2. Competitor Research Synthesis

A comprehensive research document was researched and committed to [`docs/ONBOARDING_AND_MATCHING_RESEARCH.md`](file:///Users/bharathadithya/perspectives/docs/ONBOARDING_AND_MATCHING_RESEARCH.md). Key findings from official disclosures:

| Dimension | Tinder (Official Sources) | Hinge (Official Sources) | Bumble (Official Sources) | Perspective Implementation |
| :--- | :--- | :--- | :--- | :--- |
| **Algorithm Foundation** | Stated interests, real-time activity, proximity. Officially retired Elo score. | Gale-Shapley stable marriage algorithm + collaborative filtering. | Proximity, active usage, mutual filters, Interest Badges. | **Deterministic 5-Stage Engine**: Strict Stage 1 filtering + Stage 2 normalized multicomponent scoring + Reciprocity prior. |
| **Dealbreakers vs. Preferences** | Age and distance filters can be marked strict. | Stated preferences can be marked as strict "Dealbreakers" or flexible. | Basic and advanced filters with dealbreaker toggles. | **Stage 1 Hard Dealbreaker Switch**: If either user marks a dealbreaker, opposing intentions strictly disqualify candidates from appearing. |
| **Interests Taxonomy** | Requires Daters to select at least 3 interests from a curated grid. | Prompt-based self-expression; less focused on atomic chips. | Up to 5 Interest Badges displayed prominently on profile cards. | **42 Canonical Interests across 8 Categories**: Minimum 3, maximum 10, searchable, with category tabs and icons. |
| **Missing Data Policy** | Omits missing traits from recommendations without zeroing overall visibility. | Renormalizes candidate score based on completed attributes. | Pool expands or contracts based on filter availability. | **Dynamic Weight Renormalization**: Missing optional answers shrink the denominator $W_{total}$ without penalizing candidates. |
| **Cold-Start Handling** | Fresh profiles rely heavily on explicit stated interests and newness boost. | Stated preferences serve as prior until interaction signals accumulate. | New user boost and location density fallback. | **Stated Prior Baseline**: Stated interests and intentions immediately populate the feed without requiring historical behavior or ML embeddings. |
| **Explainability** | Generic category labels on profile badges. | "Most Compatible" badge without numerical percentage. | Shared interest count and mutual badges. | **Grounded `matchReasons`**: Plain-English, verifiable explanations (*"You both share passion for Cinema & Arthouse & Specialty Coffee"*). |

---

## 3. The 6-Step Progressive Disclosure Onboarding Experience

Implemented in `apps/mobile/app/onboarding/index.tsx` using modular step components in `apps/mobile/src/components/onboarding/`:

```mermaid
flowchart LR
    S1["Step 1: About You<br/>(Name, Pronouns, Vitals)"] --> S2["Step 2: Who to Meet?<br/>(Audience, Ages, Intentions)"]
    S2 --> S3["Step 3: Your Interests<br/>(3-10 Passions, Search, Categories)"]
    S3 --> S4["Step 4: What Matters<br/>(Lifestyle Rhythm & Social Battery)"]
    S4 --> S5["Step 5: Personality<br/>(Perspective Prompt & Voice)"]
    S5 --> S6["Step 6: Review & Finish<br/>(Summary, Edit Links, Handoff)"]
    S6 --> EDIT["Profile Editor (/me/edit)<br/>Hinge 3x2 Grid & Photos"]
```

### Screen Details:
1. **Step 1 — About You** (`StepAboutYou.tsx`):
   - First name, pronouns (`she/her`, `he/him`, `they/them`, `she/they`, `he/they`, custom), height, orientation, and city.
   - Preserves development selfie bypass without falsely claiming production adult verification.
2. **Step 2 — Who Would You Like to Meet?** (`StepAudienceIntentions.tsx`):
   - Audience genders (`woman`, `man`, `non_binary`).
   - Age range increment/decrement steppers (Youngest 18 to Oldest 35+).
   - Relationship goal radio selector (`long_term`, `long_term_open`, `short_term_open`, `casual`, `friendship`, `figuring_out`).
   - Strict Dealbreaker toggle switch (`intentionDealbreaker`).
3. **Step 3 — Your Interests** (`StepInterests.tsx`):
   - 42 canonical interests across 8 categories (*Creativity, Music, Active Outdoors, Food & Drink, Entertainment, Knowledge & Tech, Vibe & Lifestyle, Community & Impact*).
   - Category filter pills, instant text search, interactive chip grid, dynamic selection count (`X of 3 required`).
4. **Step 4 — What Matters to You?** (`StepWhatMatters.tsx`):
   - Daily rhythm & pace (*Early Riser, Night Owl, Flexible & Balanced, Always on the Move, Easygoing & Cozy*).
   - Social energy battery (*Introverted, Extroverted, Ambivert, Intimate circles, Social butterfly*).
   - Both optional with a clean *"Skip for now"* action.
5. **Step 5 — A Little More Personality** (`StepPersonality.tsx`):
   - 5 curated Perspective prompt selectors (*"My ideal Sunday looks like..."*, *"A conversation I can never get tired of is..."*, etc.).
   - 300-character input with live counter.
6. **Step 6 — Review & Finish** (`StepReview.tsx`):
   - Card summaries with *"Edit"* links jumping straight back to any step without data loss.
   - Transparent recommendation explanation banner informing users how Perspective connects people.
   - Primary CTA *"Complete & Set Up Profile"* routing directly into `/me/edit`.

---

## 4. Unified Data Dictionary

All fields are typed in `@perspective/contracts` and enforced in PostgreSQL:

| Field Name | Type | Constraints | Visibility | Purpose | User Control |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `displayName` | `string` | 2–50 chars, trimmed | Public | Public identification | Editable in Profile |
| `pronouns` | `string` | Up to 20 chars | Public | Respectful communication | Editable / Deletable |
| `gender` | `Gender` | `woman`, `man`, `non_binary` | Public | Audience matching | Editable in Profile |
| `audienceGenders` | `Gender[]` | $\ge 1$ item | Private | Stage 1 Mutual Eligibility | Editable in Preferences |
| `audienceMinAge` | `int` | $18 \le \text{min} \le \text{max}$ | Private | Stage 1 Age Eligibility | Editable in Preferences |
| `audienceMaxAge` | `int` | $\text{min} \le \text{max} \le 99$ | Private | Stage 1 Age Eligibility | Editable in Preferences |
| `datingIntention` | `DatingIntention` | 6 enum values | Public | Stage 1 / Stage 2 matching | Editable in Preferences |
| `intentionDealbreaker` | `boolean` | `true`, `false` | Private | Stage 1 hard exclusion | Toggleable anytime |
| `interests` | `string[]` | 3–10 canonical IDs | Public | Stage 2 Jaccard similarity | Full add/remove |
| `lifestylePace` | `LifestylePace` | 5 enum values | Public | Stage 2 rhythm harmony | Editable / Deletable |
| `socialPreference` | `SocialPreference` | 5 enum values | Public | Stage 2 energy harmony | Editable / Deletable |
| `personalityPrompts` | `JSONB` | Array of prompt objects | Public | Self-expression & display | Add / edit in Editor |

---

## 5. The 5-Stage Matching Engine

Implemented in `apps/api/src/domain/ranking.ts` and `apps/api/src/daily/candidates.service.ts`:

### Stage 1: Eligibility Filtering (Hard Constraints)
Two profiles $(A, B)$ are eligible for recommendation if and only if:
1. Both accounts are active, verified adults ($18+$), not blocked, and not suspended.
2. Mutual audience visibility is satisfied: $A.\text{gender} \in B.\text{audience.genders}$ and $B.\text{gender} \in A.\text{audience.genders}$.
3. Mutual age range constraints are satisfied.
4. **Hard Dating Dealbreakers**: If $A.\text{intentionDealbreaker}$ or $B.\text{intentionDealbreaker}$ is `true`, opposing intentions strictly disqualify the candidate ($comp.\text{compatible} = \text{false} \implies \text{excluded}$).
5. Daily caps and already-answered feed exclusions are satisfied.

### Stage 2: Multidimensional Compatibility Scoring
For eligible pairs, compatibility score $S_{comp} \in [0.0, 1.0]$ is computed using normalized components:
$$S_{comp} = \frac{0.40 \cdot S_{int} + 0.25 \cdot S_{intent} + 0.20 \cdot S_{cat} + 0.15 \cdot S_{life}}{W_{total}}$$

1. **Shared Interests (Jaccard Similarity)** ($w = 0.40$):
   $$S_{int} = \frac{|A_{interests} \cap B_{interests}|}{|A_{interests} \cup B_{interests}|}$$
2. **Dating Intention Alignment Matrix** ($w = 0.25$):
   - Identical intentions: $1.0$
   - Adjacent compatible (e.g. `long_term` $\leftrightarrow$ `long_term_open`): $0.85$
   - Casual / short-term open: $0.85$
   - Exploratory (`figuring_out`): $0.60$
   - Opposing without dealbreaker: $0.15$
3. **Category Resonance** ($w = 0.20$):
   Overlap between viewer's perspective history and candidate's post categories.
4. **Lifestyle Rhythm & Social Energy** ($w = 0.15$):
   Diurnal harmony ($1.0$ matching, $0.30$ early bird vs. night owl) + social battery harmony ($1.0$ matching, $0.80$ ambivert bridge).

### Dynamic Renormalization & Missing Data
- When a candidate has not provided optional attributes, $W_{total}$ shrinks to the sum of known component weights:
  $$S_{comp} = \frac{\sum_{k \in \text{known}} w_k \cdot S_k}{\sum_{k \in \text{known}} w_k}$$
- A `coverage` index ($\frac{|\text{known}|}{4}$) records evidence depth. Omissions are never penalized as zero.

### Grounded Explainability
Every recommendation returns plain-English `MatchReason[]`:
- `shared_interest`: *"You both share passion for Cinema & Arthouse & Specialty Coffee"*
- `dating_intention`: *"Both looking for Long-term partner"*
- `category_resonance`: *"Similar perspective topics and aesthetic interests"*

### Stage 3: Feed Ranking & Reciprocity Prior
Candidates are assigned to daily slots via `rankingScore`:
$$\text{Score} = 0.45 \cdot S_{comp} + 0.25 \cdot \text{reciprocityNeed} + 0.15 \cdot \text{freshness} + 0.15 \cdot \text{qualityPrior} - \text{reportPenalty}$$
- **Boost Slot**: The longest-waiting, least-served eligible candidate receives the Boost Slot to guarantee exposure fairness.

---

## 6. Database Schema & Migration Details

Created and deployed additive PostgreSQL migration:
* **Migration Path**: `apps/api/prisma/migrations/20261017080028_add_onboarding_matching_fields/migration.sql`
* **Target Databases**: `perspective` (development) and `perspective_test` (automated E2E tests).

```sql
-- CreateEnum
CREATE TYPE "DatingIntention" AS ENUM ('long_term', 'long_term_open', 'short_term_open', 'casual', 'friendship', 'figuring_out');
CREATE TYPE "LifestylePace" AS ENUM ('early_bird', 'night_owl', 'balanced', 'active', 'relaxed');
CREATE TYPE "SocialPreference" AS ENUM ('introvert', 'extrovert', 'ambivert', 'small_groups', 'social_butterfly');

-- AlterTable
ALTER TABLE "Profile" ADD COLUMN "pronouns" TEXT;
ALTER TABLE "Profile" ADD COLUMN "datingIntention" "DatingIntention";
ALTER TABLE "Profile" ADD COLUMN "intentionDealbreaker" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Profile" ADD COLUMN "interests" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Profile" ADD COLUMN "lifestylePace" "LifestylePace";
ALTER TABLE "Profile" ADD COLUMN "socialPreference" "SocialPreference";
ALTER TABLE "Profile" ADD COLUMN "personalityPrompts" JSONB NOT NULL DEFAULT '[]';
```

---

## 7. Automated Test Verification Results

All suites executed and passed 100% across the monorepo:

```bash
# 1. Monorepo Build Check
pnpm build
# -> 4/4 packages built cleanly (contracts, api-client, design-tokens, api)

# 2. Complete Unit Test Suite (77 Tests Passing)
pnpm test
# -> PASS packages/contracts/test/contracts.test.ts (18/18 passed)
# -> PASS packages/api-client/test/client.test.ts (6/6 passed)
# -> PASS apps/api/test/unit/matching-engine.spec.ts & domain.spec.ts (40/40 passed)
# -> PASS apps/mobile/test/onboarding.test.ts, helpers.test.ts, profile-editor.test.ts (13/13 passed)

# 3. Backend E2E Test Suite (18 Tests Passing)
pnpm --filter @perspective/api test:e2e
# -> PASS test/e2e/core-loop.e2e-spec.ts
# -> PASS test/e2e/auth-and-profile.e2e-spec.ts

# 4. Mobile TypeScript Static Analysis
pnpm --filter @perspective/mobile typecheck
# -> tsc --noEmit exited with code 0 (0 errors)
```

---

## 8. Measurement & Evaluation Plan (KPIs)

To evaluate onboarding friction and recommendation relevance after launch:
1. **Onboarding Completion Rate**: Target $> 80\%$ from Step 1 to Step 6.
2. **Step Drop-Off Rate**: Measured per step to identify question fatigue.
3. **Interest Coverage**: Percentage of users selecting $\ge 3$ passions (target $> 90\%$).
4. **Feed Relevance Ratio**: Percentage of daily batches containing at least one profile with $S_{comp} \ge 0.70$.
5. **Connection Quality**: Reciprocal connection acceptance rate and conversation starts following mutual perspective exchanges.
6. **Dealbreaker Precision**: Zero candidates delivered to users with conflicting hard dealbreakers.

---

## 9. Codebase Artifacts & File Map

| Component | File Path |
| :--- | :--- |
| **Research Dossier** | `docs/ONBOARDING_AND_MATCHING_RESEARCH.md` |
| **Accomplishments & Architecture** | `docs/ONBOARDING_AND_MATCHING_ENGINE.md` |
| **Contracts — Interests** | `packages/contracts/src/interests.ts` |
| **Contracts — Personality** | `packages/contracts/src/personality.ts` |
| **Contracts — Profile Schema** | `packages/contracts/src/profile.ts` |
| **Contracts — Explore Card** | `packages/contracts/src/explore.ts` |
| **Prisma Schema** | `apps/api/prisma/schema.prisma` |
| **Database Migration** | `apps/api/prisma/migrations/20261017080028_add_onboarding_matching_fields/migration.sql` |
| **Matching Algorithm Engine** | `apps/api/src/domain/ranking.ts` |
| **Candidates & Eligibility Service** | `apps/api/src/daily/candidates.service.ts` |
| **Social Service Types** | `apps/api/src/social/social.service.ts` |
| **Explore Card Mapping** | `apps/api/src/explore/explore.service.ts` |
| **Profile Read & Persistence** | `apps/api/src/profiles/profiles.service.ts` & `profile.mapper.ts` |
| **API Unit Tests** | `apps/api/test/unit/matching-engine.spec.ts` |
| **Mobile Draft Store** | `apps/mobile/src/session/onboardingStore.ts` |
| **Mobile Onboarding Flow** | `apps/mobile/app/onboarding/index.tsx` |
| **Mobile Step Components** | `apps/mobile/src/components/onboarding/*.tsx` |
| **Mobile Profile View** | `apps/mobile/src/components/profile/ProfileView.tsx` |
| **Mobile Profile Editor** | `apps/mobile/app/me/edit.tsx` |
| **Mobile Unit Tests** | `apps/mobile/test/onboarding.test.ts` |
