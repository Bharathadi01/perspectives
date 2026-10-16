# Perspective — Product Foundation and Build Blueprint

> The canonical business rules live in `PRODUCT.md`. This blueprint gives the reasoning behind them and the interaction design. If the two disagree, `PRODUCT.md` wins.

## Executive Decision

Perspective uses Hinge as its UI and structural reference. For initial development the UI is deliberately Hinge-like (a temporary placeholder to be redesigned once the logic is done; see `PRODUCT.md` for the limits). Preserve Hinge's strongest interaction ideas—rich profiles built from photos and prompts, audio prompts, responding to one specific element, deliberate one-at-a-time decisions, and mutual consent before private chat—but make the thing people respond to a **post**: a photo or audio clip with a prompt or question on which someone wants honest outside perspective.

The product is positioned as **“See yourself through other people’s eyes—and connect through what you notice.”** It is a dating app at its core with a unique hook: perspectives. It is not marketed as “a dating app.” It is marketed perspectives-first, and the same open Connect also leads to friends, gym buddies, collaborators, and networking. Dating is the business and the long-term revenue driver, but the product never labels a connection as dating, friends, or networking.

The stack below is the initial idea. What is built now and what is planned lives in `ARCHITECTURE.md` → Stack (ADR-013); that table wins.

Initial stack idea:
- **Mobile**: React Native with TypeScript and Expo Development Builds, Expo Router
- **Backend API**: Modular NestJS/Node.js TypeScript backend
- **Database**: PostgreSQL with pgvector for canonical and vector data
- **Caching & Queues**: Redis for caching, queues, rate limits, and presence; BullMQ
- **Media**: S3-compatible storage or Cloudinary for media
- **AI/ML**: Isolated Python/FastAPI service for LLM, vision, embeddings, and later ML inference
- **Monorepo**: pnpm workspaces / Turborepo

---

## Product Thesis

### User Problem
People often cannot accurately predict how their photo, outfit, physique, voice, profile, or way of showing up comes across to others. Existing choices are weak:
- Friends may be biased or too polite.
- Public social-media metrics indicate popularity, not useful interpretation.
- Forums can be anonymous, chaotic, or cruel.
- Dating apps provide matches but little honest understanding of why something resonates, and many profiles get no response at all, which is demotivating.
- Professional advice may be too expensive or disproportionate for everyday questions.

### Core Promise
**Ask for perspective. Receive honest human insight. Connect with the people whose perspective you find interesting.**

The product must not promise objective truth. A perspective is a subjective interpretation from a particular person with a particular background. UI language should therefore say *“How this came across to people”* rather than *“What you are really like.”*

### Product Principles

| Principle | Product Implication |
|---|---|
| **Specific beats generic** | Every post carries a clear prompt or question and the focus areas the owner wants covered. |
| **Context beats score** | Written comments carry the value. No numeric attractiveness scores, rankings, or public metrics. |
| **Honest, not abusive** | Perspectives are straightforward and unfiltered. Criticism is welcome. Body shaming, abuse, and sexual content are not. |
| **Give to get** | Users give a daily mandatory set of perspectives to unlock the perspectives they received. |
| **Nobody is left out** | Profiles with few or no perspectives are pushed into other people's mandatory sets, so every owner gets something to read. |
| **Mutuality before chat** | Chat opens only after one person asks to connect (having given a perspective first) and the other accepts. |
| **Verified adults only** | 18+ and selfie-verified before a profile goes live. |
| **Safety before growth** | Reporting, blocking, age gate, moderation, and deletion ship in the foundation. |
| **Outcomes beat screen time** | Measure helpful perspectives and meaningful connections, not minutes scrolled. |

---

## Hinge Pattern Translation

| Hinge Reference | Perspective Equivalent | Keep, Change, or Exclude |
|---|---|---|
| Discover profile stack | Explore stack of profiles | Keep one-profile-at-a-time focus. The daily batch is finite and starts with the mandatory set. |
| Rich profile with photos and prompts | Profile with basics plus 1 to 6 posts (photo or audio plus a prompt or question) | Keep depth. The primary post is required. |
| Audio prompt | Audio post, 15 seconds maximum | Keep. Audio is for posts only; perspectives are text-only. |
| Like a specific photo/prompt | Give a perspective on one post | Keep contextual interaction. The primary action is “Give Perspective.” |
| Comment attached to like | Required free-text comment with optional quick-pick chips and spark hints | Make the comment mandatory, not optional. |
| X/pass | Skip | Keep private skip with no negative notification. A skipped mandatory slot is replaced. |
| Likes You queue | Inbox of received perspectives and connect requests | Perspectives unlock after the day's mandatory set. |
| Match | Connect | Open Connect with no intent or label. The initiator must have given a perspective first, and the other person accepts or declines. |
| Matches/chat | Connections and chat | Keep mutual chat. Show the perspective that led to the connection. |
| Standouts/Roses | Not in v1 | Avoid pay-to-interrupt until quality is proven. |
| Preferences/dealbreakers | Audience (gender, age range) at profile level, plus your own filters, blocks, and mutes | Keep private. |
| We Met feedback | Did this help? | Keep private outcome feedback. |
| Unlimited likes subscription | Monetization around the connect economy | Defer. It must not overwhelm recipients or undermine trust. |

---

## Information Architecture

Five bottom tabs:

| Tab | Purpose | Primary Action |
|---|---|---|
| **Explore** | One profile at a time, starting with the daily mandatory set | Give Perspective |
| **Inbox** | Received perspectives (after unlock) and connect requests | Review / connect |
| **Create** | Add or edit your profile posts (up to six) | Publish |
| **Connections** | Accepted connections and conversations | Reply |
| **You** | Profile, posts, audience, settings, safety | Edit |

---

## Profile, Explore & Perspective Mechanics

### Profile
- **Mandatory:** selfie verification, age (18+), gender, height, orientation/preference, city, and a primary post with a photo.
- **Posts:** 1 to 6. Each is a photo or an audio clip (15 seconds maximum) with a prompt or question, a category, and focus areas.
- **Audience:** gender and age range at profile level.
- **Never shown:** exact birthday, precise location, phone, email.

### Explore Card Contents
1. **Owner summary**: first name or display name, age, height, orientation/preference, city-level location, verified indicator.
2. **Posts**: the primary post first, then the others. Photo or audio with its prompt.
3. **Safety/overflow menu**: Report, block.
4. **Actions**: Skip and Give Perspective on a chosen post.
*Note: finite daily batch that starts with the mandatory set. No infinite scroll.*

### Perspective Composer
- **Comment**: required, free text, minimum length.
- **Quick-pick chips**: optional, structured, never a replacement for the comment.
- **Spark hints**: short prompts from the post's category and focus areas, different for every post, so the giver is never stuck.
- **Connect**: optional tick to also send a connect request.
- **Text only.** Perspectives cannot be audio.

*Appearance rule*: strict ban on numeric attractiveness scores or public rankings.

### Inbox Actions
- **Helpful**
- **Not helpful** (opens reasons: vague, irrelevant, insulting, sexual, spam, unsafe)
- **Thank privately**
- **Connect** (the gate applies: you must have given them a perspective first, otherwise you give one now)
- **Report** and **Block**

---

## Connect Mechanics

Connect is open. There are no intents, modes, or labels.

1. A connection can only be requested by someone who has already given the other person a perspective.
2. Giver-initiated: the giver ticks Connect while giving. The owner sees the perspective with the request attached.
3. Owner-initiated: the owner likes a perspective, opens the giver's profile, gives them a perspective on one of their posts, then sends a connect request.
4. The receiver reads the attached perspective and accepts or declines.
5. Accept opens chat. Decline starts a 14-day cooldown (configurable) before the same sender can ask the same person again.
6. No daily connect cap and no per-profile perspective cap for now. Both are server-side config values, to be tuned after development.

---

## State Machines

### Post Lifecycle
`draft -> pending_moderation -> active -> paused | removed -> archived`

### Perspective Lifecycle
`submitted -> pending_moderation -> delivered -> helpful | archived | reported | removed`
Delivered perspectives stay hidden from the owner until the owner's daily unlock.

### Connect Request Lifecycle
`none -> requested -> accepted (active connection) | declined (14-day cooldown, then none)`
An active connection can become `unmatched` or `blocked`.

### Moderation Lifecycle
`unreviewed -> machine_allowed | human_review -> allowed | removed -> appealed -> upheld | restored`

---

## Recommendation & Daily Assignment

Three server-side algorithms:
1. **Feed ranking**: whose profile you see while browsing.
2. **Daily mandatory-set assignment**: which profiles you must give to today.
3. **Mandatory count**: how many perspectives a given user owes. v1 starts at a fixed 3 behind a function.

### Candidate Eligibility (MVP)
- The profile is active, verified, and moderation-approved.
- The profile owner is not the viewer.
- Neither side blocked the other.
- The viewer has not already given a perspective on that profile today or skipped it recently.
- The viewer is inside the owner's audience (gender and age range).
- The profile passes the viewer's own filters and mutes.

### Mandatory-Set Assignment
- One **boost slot** goes to a profile with few or no perspectives that is eligible for the viewer, so no profile is left out.
- The remaining slots are the best relevance matches.
- A skipped slot is replaced with another eligible profile.
- If fewer eligible profiles exist than the mandatory count, the user unlocks after giving to all that are available.
- If nobody is eligible for a very narrow audience, widen the audience slightly for the boost slot, or tell the owner the filter is too narrow.

### Ranking Factors (weights to be decided and tuned during development)
- Audience fit
- Category affinity
- Freshness
- Reciprocity need (how under-served a profile is; central to "nobody is left out")
- Quality prior
- Penalties for reports and over-exposure

No weights are decided. The v1 code uses placeholder weights in `apps/api/src/domain/ranking.ts`. Treat them as a starting point to tune, not as the product's formula.

---

## Design System Foundations

- **Background**: `#F7F4EE` (warm off-white)
- **Surface**: `#FFFFFF`
- **Ink**: `#17171B` (deep ink)
- **Muted**: `#6E6C73`
- **Brand**: `#5B4BDB` (cobalt-violet)
- **Success**: `#287A5B`
- **Warning**: `#B86B20`
- **Danger**: `#B33A3A`
- **Spacing Scale**: 4, 8, 12, 16, 24, 32, 48
- **Card Radius**: 24
- **Control Radius**: 14
- **Touch Target**: Minimum 44–48 logical pixels
