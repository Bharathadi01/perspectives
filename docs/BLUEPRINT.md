# Perspective — Product Foundation and Build Blueprint

## Executive Decision

Perspective should use Hinge as a structural reference, not as a clone. Preserve Hinge’s strongest interaction ideas—rich profiles, responding to a specific piece of content, deliberate one-at-a-time decisions, mutual connection before private chat, and post-interaction learning—but replace the dating-only object with a Perspective Request: a photo, situation, idea, or question on which someone wants useful outside perspective. Hinge’s current experience demonstrates the value of deep profiles, three prompt answers, likes/comments attached to a particular profile element, a one-at-a-time incoming queue, and feedback about real-world outcomes.

The product should be positioned as **“See yourself through other people’s eyes—and connect through what you notice.”** Its primary value is better self-understanding and meaningful conversation; dating, friendship, and networking are optional connection modes rather than the entire identity of the app. This keeps the product differentiated, broadens possible use cases, and reduces the risk of becoming a public attractiveness-ranking product.

The authoritative v1 stack is:
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
People often cannot accurately predict how their photo, outfit, profile, message, idea, behavior, or situation comes across to others. Existing choices are weak:
- Friends may be biased or too polite.
- Public social-media metrics indicate popularity, not useful interpretation.
- Forums can be anonymous, chaotic, or cruel.
- Dating apps provide matches but little actionable understanding of why something resonates.
- Professional advice may be too expensive or disproportionate for everyday questions.

### Core Promise
**Ask for perspective. Receive useful human insight. Connect when interest is mutual.**

The product must not promise objective truth. A perspective is a subjective interpretation from a particular person with a particular background. UI language should therefore say *“How this came across to people”* rather than *“What you are really like.”*

### Product Principles

| Principle | Product Implication |
|---|---|
| **Specific beats generic** | Every post must include a clear question or structured request. |
| **Context beats score** | Prefer written interpretation, tags, and reasons over a single attractiveness number. |
| **Quality beats volume** | Limit daily requests and responses; reward helpfulness, not virality. |
| **Consent before exposure** | The requester chooses audience, category, visibility, and whether connections are allowed. |
| **Mutuality before chat** | Private conversation unlocks only after both users accept. |
| **Safety before growth** | Reporting, blocking, age gates, moderation, and deletion ship in the foundation. |
| **Outcomes beat screen time** | Measure helpful perspectives and meaningful connections, not minutes scrolled. |

---

## Hinge Pattern Translation

| Hinge Reference | Perspective Equivalent | Keep, Change, or Exclude |
|---|---|---|
| Discover profile stack | Explore Requests stack | Keep one-card-at-a-time focus; card object is a request, not a dating profile. |
| Rich profile with photos and prompts | Perspective Profile with identity, lenses, interests, credibility, prompts, and selected requests | Keep depth, but emphasize why this person’s viewpoint is useful. |
| Like a specific photo/prompt | Respond to the exact request or detail | Keep contextual interaction; make the primary action “Give Perspective.” |
| Comment attached to like | Structured response plus optional explanation | Make explanation primary, not optional. |
| X/pass | Skip | Keep private skip with no negative notification. |
| Likes You queue | Perspectives Inbox | Show received responses one at a time; allow accept, thank, connect, or archive. |
| Match | Connection | Require mutual interest and a selected intent: chat, friendship, date, collaborate, mentor/network. |
| Matches/chat | Connections and chat | Keep mutual chat; display the request and response that created the connection. |
| Standouts/Roses | Featured Requests or “High-fit requests” | Do not copy Roses in v1; avoid pay-to-interrupt until quality is proven. |
| Preferences/dealbreakers | Audience and discovery filters | Keep private filters for category, location granularity, age range, intent, language, and lens. |
| We Met feedback | Did this help? / Did you connect? | Keep private outcome feedback to improve routing and safety. |
| Top Photo | Request/media optimization | Defer; do not optimize only for popularity. |
| Unlimited likes subscription | Premium response/request limits | Defer; monetization must not overwhelm recipients or undermine trust. |

---

## Information Architecture

Five bottom tabs:

| Tab | Purpose | Primary Action |
|---|---|---|
| **Explore** | One request at a time, selected for relevance | Give Perspective |
| **Inbox** | Received perspectives and invitations | Review / connect |
| **Create** | Create a new Perspective Request | Publish |
| **Connections** | Mutual connections and conversations | Reply |
| **You** | Profile, lenses, requests, settings, safety | Edit |

---

## Explore & Response Mechanics

### Explore Request Card Contents
1. **Author summary**: First name or display name, age band, city-level location (opted-in), verified indicator, useful lenses.
2. **Request category**: Style, Fitness, Dating profile, Social situation, Career, Creative work, Idea feedback, Other.
3. **Media/context**: One image in v1, with text-only requests also supported.
4. **Exact question**: Large editorial text.
5. **Desired response style**: Gentle, direct, practical, first impression, expert, open-ended.
6. **Audience constraints**: e.g. “Women 22–30”, “designers”, “people in Bengaluru”, “anyone”.
7. **Safety/overflow menu**: Report, block, hide category.
8. **Actions**: Skip and Give Perspective.
*Note: Finite daily batch (e.g., “8 thoughtful requests today”). No infinite scroll.*

### Response Composer
- **First impression**: One short required statement.
- **What led to that impression?**: Optional explanation, strongly encouraged.
- **Helpful tags**: Up to three category-specific tags.
- **Suggestion**: Optional practical advice.
- **Tone check**: Constructive, direct, encouraging, expert.
- **Connection interest**: Off by default; optionally choose chat, friends, date, collaborate, network.

*Appearance rule*: Strict ban on numeric attractiveness scores or public rankings.

### Perspectives Inbox Actions
- **Helpful**
- **Not helpful** (opens reasons: vague, irrelevant, insulting, sexual, spam, unsafe)
- **Thank privately**
- **Interested in connecting** (requires compatible mutual intent)

---

## State Machines

### Request Lifecycle
`draft -> pendingModeration -> active -> paused | fulfilled | expired | removed -> archived`

### Response Lifecycle
`submitted -> pendingModeration -> delivered -> helpful | archived | reported | removed`

### Connection Lifecycle
`none -> interestA | interestB -> mutualPending -> active -> paused | unmatched | blocked`

### Moderation Lifecycle
`unreviewed -> machineAllowed | humanReview -> allowed | removed -> appealed -> upheld | restored`

---

## Recommendation & Candidate Generation

### MVP Candidate Eligibility
- Request is active and moderation-approved.
- Request author is not the viewer.
- Neither side blocked the other.
- Viewer has not already responded or skipped recently.
- Viewer satisfies hard audience constraints.
- Request satisfies viewer's muted categories and safety settings.
- Age and connection-mode rules are compatible where connection is enabled.

### MVP Ranking Formula
$$\text{score} = 0.30\,\text{lensFit} + 0.20\,\text{categoryAffinity} + 0.15\,\text{languageFit} + 0.15\,\text{freshness} + 0.10\,\text{reciprocityNeed} + 0.10\,\text{qualityPrior} - \text{penalties}$$

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
