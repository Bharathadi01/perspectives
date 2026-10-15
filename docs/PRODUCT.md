# Product

This is the canonical business-logic document. If another doc, a code comment, or the current skeleton disagrees with it, this file wins. Tech-stack choices live in `ARCHITECTURE.md`, not here.

## Promise
See yourself through other people's eyes. Get honest perspectives on how you look, dress, sound, and show up, then connect with the people whose perspective you find interesting.

## Positioning
Perspective is a dating app at its core, with one unique hook: perspectives. People earn attention and connection by giving honest, specific feedback first. It is **not marketed as "a dating app."** It is marketed perspectives-first, and the same open Connect also leads to friends, gym buddies, collaborators, and networking. Dating is the business and the long-term revenue driver, but nothing in the product is labeled "dating" (see Connect).

## Glossary
- **Profile:** a verified adult's page, Hinge-style, made of basics and 1 to 6 posts.
- **Post:** the unit that perspectives are given on. A post is a photo or an audio clip plus a prompt or question, a category, and focus areas. Earlier docs and the skeleton call this a "Perspective Request"; the code may keep that name.
- **Perspective:** a text-only, honest comment that one user gives on one post of another user.
- **Giver:** the user who writes a perspective. **Owner:** the user who owns the post.
- **Connect:** an open request to start a private conversation. It has no intent, label, or mode.

## Core loop
1. Sign up (18+), verify with a selfie, and fill in the profile basics.
2. Create a profile with at least one post (the primary post). Add up to five more.
3. Choose who may see the profile: gender and age range, set once at profile level.
4. Each day the app assigns you a mandatory set of profiles (default 3). You give a perspective on one post of each.
5. Giving the mandatory set unlocks the perspectives you received that day. You may keep giving more, but you do not have to.
6. Review received perspectives privately. Mark them helpful or not helpful, thank the giver privately, report, block, or Connect.
7. Connect: you can only ask to connect with someone after you have given them a perspective. The other person accepts or declines. Chat opens only after accept.

## Profile
**Mandatory before the profile goes live:** selfie verification, age (derived from a birthdate, 18+), gender, height, orientation/preference, city, and a primary post that includes a photo.

**Profile basics shown to givers:** age (or age band), height, orientation/preference, city-level location, gender, and the verification badge. Givers need this context to give a useful perspective. The exact birthday and precise location are never shown.

**Posts (1 to 6):**
- The first post is the primary post and is required. It requires a photo.
- Other posts are a photo or an audio clip, each with a prompt or question.
- Audio posts are limited to **15 seconds**.
- Each post has a **category** (for example style, fitness/physique, voice, overall vibe) and **focus areas** the owner wants covered. The final wording of categories is a product-copy task for the developers, who may rework the working names.
- A giver answers exactly one post per perspective.

**Audience:** gender and age range (always 18+), set at the profile level. It is not set per post. A profile is shown only to people inside its audience.

**Hinge is the UI and structural reference.** For initial development the UI should look and feel similar to Hinge in layout, structure, and interaction (profiles of photos and prompts, audio prompts, a basics row, one profile at a time). This is a temporary placeholder: the product owner will redesign it to Perspective's own look once logic and algorithms are done, and it must be replaced before any public release or store submission. Never use Hinge's name or logo, never claim affiliation, and never copy actual Hinge files (images, exported icons, fonts, sounds, animations). Write our own copy and use our own design tokens.

## Giving a perspective
- The giver sees the owner's profile first (photos, basics, posts), then picks one post to answer.
- **Required:** a free-text comment, with a minimum length. Perspectives are straightforward and unfiltered. Honest criticism is allowed.
- **Optional:** quick-pick chips (a dropdown-style structure). They never replace the comment.
- **Spark hints:** short prompts under the comment box so the giver is never stuck (for example "talk about their height" or "how do they come across?"). Hints come from the post's category and the owner's chosen focus areas, so they differ per post.
- **Text only.** Givers cannot respond with audio.
- **Not allowed:** body shaming, abuse, harassment, hate, threats, sexual content. Moderation runs before delivery.
- **Visibility:** a perspective is seen only by the owner of the post and the giver who wrote it. There are no public comments.
- One perspective per giver per post.
- While giving, the giver may tick **Connect** to also send a connect request (see Connect).

## Content rules
- No nudity and no sexual content.
- Shirtless, gym, and swimwear photos are allowed.
- Body shaming, abuse, and degrading comments are not allowed, in posts or in perspectives.
- No numeric attractiveness scores, rankings, or leaderboards.

## Daily give-to-get
- Every day each user receives a **mandatory set** of profiles to give perspectives on. The default size is 3 different people. The number is chosen by an algorithm per user; v1 starts with a fixed 3 behind a function so it can become dynamic.
- Giving the mandatory set **unlocks the perspectives you received that day**. The unlock repeats daily.
- After the mandatory set, giving more is optional.
- If fewer than the mandatory number of eligible profiles exist (for example a small user base), the user unlocks after giving to all that are available.
- A skipped slot is replaced with another eligible profile, so people are never forced to see something outside their own filters, blocks, or mutes.

### Fairness and retention
No profile should be left without perspectives. A profile that gets few or none must be pushed into other people's mandatory sets so its owner gets something to read quickly. This is a retention requirement (the "my profile gets no likes" problem on other apps).
- Each mandatory set includes one **boost slot**: a profile with few or no perspectives that is eligible for you (it includes you in its audience and passes your own filters, blocks, and mutes).
- The remaining slots are the best relevance matches for you.
- If no one is eligible for a very narrow audience, the fallback is to widen the audience slightly for the boost slot, or tell the owner the filter is too narrow.

## Algorithms
Three server-side algorithms, each tunable without app changes:
1. **Feed ranking:** whose profile appears when you browse.
2. **Daily mandatory-set assignment:** which profiles you must give to today, including the boost slot.
3. **Mandatory count:** how many perspectives a given user must give before unlocking their own.

Ranking factors (weights are not decided; tune them in development): audience fit, category affinity, freshness, reciprocity need (how under-served a profile is), and a quality prior, minus penalties for reports and over-exposure. The skeleton's `ExploreService.calculateRankingScore` uses an earlier formula and is a placeholder.

## Connect
**Connect is open.** There are no intents, no modes, and no labels such as dating, friends, or networking. It works like following on Instagram: two people connect, and the relationship becomes whatever they make of it. Labels were rejected because they feel creepy.

**The rule:** you can ask to connect with someone only after you have given them a perspective. The perspective is the gate.

Two ways to start a connection (both use the same accept/decline step):
- **Giver starts:** while giving a perspective, the giver ticks Connect. The owner sees the perspective with the connect request attached.
- **Owner starts:** the owner reads a perspective they like, opens the giver's profile, gives the giver a perspective on one of their posts, then sends a connect request.

**The receiver** sees the request together with the perspective that earned it, then **accepts or declines**. Chat opens only after accept.

**Decline:** the sender cannot send another connect request to the same person for **14 days** (the value is configurable; 0 disables it).

**Limits:** there is no daily cap on connect requests and no cap on perspectives a profile can receive, for now. Build these caps as server-side config values that default to unlimited, to be tuned after the app is developed.

## Inbox
- Received perspectives are grouped by post and stay locked until the day's mandatory set is done.
- Actions on a perspective: **Helpful**, **Not helpful** (with a reason: vague, irrelevant, insulting, sexual, spam, unsafe), **Thank privately**, **Connect**, **Report**, **Block**.
- Incoming connect requests appear with the perspective that came with them.
- Marking perspectives unhelpful feeds the quality loop. Repeatedly unhelpful givers can lose reach or get a lower quota.

## Five tabs
- **Explore:** one profile at a time, finite daily batch, starting with the mandatory set.
- **Inbox:** received perspectives and connect requests.
- **Create:** add or edit your profile posts (up to six).
- **Connections:** accepted connections and conversations.
- **You:** profile, posts, audience, settings, privacy, and safety.

## Trust and safety
- 18+ only. Selfie verification is required at profile creation, so only verified users exist.
- Report and block on every profile, post, perspective, and message. Blocking is bidirectional and immediate.
- Moderation before delivery for text, photos, and audio.
- In-app account deletion.
- See `SECURITY.md` for the full controls.

## State machines
- **Post:** `draft -> pending_moderation -> active -> paused | removed -> archived`
- **Perspective:** `submitted -> pending_moderation -> delivered -> helpful | archived | reported | removed` (delivered perspectives stay hidden from the owner until the owner's daily unlock)
- **Connect request:** `none -> requested -> accepted (active connection) | declined (14-day cooldown, then none)`; an active connection can become `unmatched` or `blocked`
- **Moderation:** `unreviewed -> machine_allowed | human_review -> allowed | removed -> appealed -> upheld | restored`

## P0 scope
Auth, selfie verification, onboarding, profile with posts (photo and audio), audience, Explore with the daily mandatory set and boost slot, perspectives with hints, unlock, Inbox, helpful feedback, Connect with accept/decline and 14-day cooldown, text chat, push, report, block, moderation operations, account deletion, analytics, monitoring.

## Excluded from v1
Public scoring, followers, public comments, anonymous feedback, voice responses, live streaming, groups, ads, boosts, subscriptions and other monetization (to be designed later around the connect economy), custom ML, AI-written human responses, and national launch.

## Carried over from earlier docs, not re-decided
Perspective lenses, response-style preferences (gentle, direct, and so on), languages, helpfulness tiers, and the earlier request-expiry concept were not part of the product-owner discussion. They are not part of the core model above. Decide them during development; do not assume they are required.

## Implementation assumptions (to confirm with the product owner)
These were not decided in the product discussion. They are implemented as stated and easy to change:
- **Viewer filter:** your own audience also acts as your viewing filter, so two people only see each other when each is inside the other's audience. (Configured in `apps/api/src/domain/eligibility.ts`.)
- **Lock rule:** received perspectives and connect requests stay hidden until you finish the set on the day they arrived (or a later day). Once revealed they stay visible.
- **Numbers:** comment minimum 40 characters, up to 3 quick-pick chips, 1 to 3 focus areas per post, prompts 5 to 150 characters, finite Explore batch of 10 per day (mandatory set included), a skipped profile stays hidden for 7 days, "today" is computed in Asia/Kolkata time.
- **Option lists:** genders (woman, man, non-binary), orientations (straight, gay, lesbian, bisexual, pansexual, queer, asexual, prefer not to say), the six categories and their focus areas, hints and chips in `packages/contracts/src/post.ts`.
- **Connect edge case:** if the other person already asked you, a new request from you is refused and you are pointed to their request instead.
- **Give-back:** you can always give a perspective back to someone who gave you one, even if they are outside your audience.

## North star
Helpful Perspectives per Weekly Active Owner.

## Guardrails
Reports per 1,000 perspectives; blocks per 1,000 interactions; severe safety incidents; share of profiles with zero perspectives at 24 hours; moderation response time; exposure concentration (how unevenly perspectives are spread across profiles); decline and report rate on connect requests; deletion and notification opt-out.
