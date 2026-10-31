# Product

This is the canonical business-logic document. If another doc, a code comment, or the current skeleton disagrees with it, this file wins. Tech-stack choices live in `ARCHITECTURE.md`, not here.

## Promise
See yourself through other people's eyes. Get honest perspectives on how you look, dress, sound, and show up, then connect with the people whose perspective you find interesting.

## Positioning
Perspective is a dating app at its core, with one unique hook: perspectives. People earn attention and connection by giving honest, specific feedback first. It is **not marketed as "a dating app."** It is marketed perspectives-first, and the same open Connect also leads to friends, gym buddies, collaborators, and networking. Dating is the business and the long-term revenue driver, but nothing in the product is labeled "dating" (see Connect).

## Glossary
- **Profile:** a verified adult's page, Hinge-style, made of basics and 1 to 6 posts.
- **Post:** the unit that perspectives are given on. A post is a photo or an audio clip plus a prompt or question, a category, and focus areas. Earlier docs called this a "Perspective Request"; the code now uses `Post`.
- **Perspective:** a text-only, honest comment that one user gives on one post of another user.
- **Giver:** the user who writes a perspective. **Owner:** the user who owns the post.
- **Connect:** an open request to start a private conversation. It has no intent, label, or mode.
- **Goal:** a private onboarding answer, "Get perspectives" and/or "Meet new people". It only changes how matching works. It is never shown to anyone and never labels a connection (decided 2026-10-20).
- **Audience:** the one setting (genders and age range) that decides whose profiles you see and who sees yours. Two people see each other only when each is inside the other's audience.
- **Hold / ban:** a hold is automatic and only limits where a profile appears while it waits for review. A ban is always decided by a person on the admin dashboard (decided 2026-10-20).

## Core loop
1. Sign up (18+) and fill in the profile basics.
2. Choose your goal: Get perspectives, Meet new people, or both (private).
3. Choose your audience: genders and age range, set once at profile level. The question is worded by your goal (see Audience).
4. Verify with a selfie, then create a profile with at least one post (the primary post). Add up to five more. The profile goes live only when the selfie is verified and the primary post exists (see Onboarding).
5. Each day the app assigns you a mandatory set of profiles (up to 3). You give a perspective on one post of each.
6. Giving the mandatory set unlocks the perspectives you received that day. You may keep giving more, but you do not have to.
7. Review received perspectives privately. Mark them helpful or not helpful, thank the giver privately, report, block, or Connect.
8. Connect: you can only ask to connect with someone after you have given them a perspective. The other person accepts or declines, and to accept they give you a perspective back. Chat opens only after accept.

## Profile
**Mandatory before the profile goes live:** selfie verification, age (derived from a birthdate, 18+), gender, height, city, goal, audience, and a primary post that includes a photo.

**Profile basics shown to givers:** age (or age band), height, city-level location, gender, and the verification badge. Givers need this context to give a useful perspective. The exact birthday and precise location are never shown.

**Private answers, never shown to anyone (decided 2026-10-20):**
- **Goal:** Get perspectives and/or Meet new people. It replaces the earlier "dating intention" question and its dealbreaker, which are removed. *Detail (decided 2026-10-20):* during the beta the goal does not change matching; it words the audience question and is used for the beta measurements.
- **Orientation:** optional. During the beta it is collected only to learn how people use the app (see `BETA_PLAN.md`); it is not used for matching and is not shown. It is sensitive personal data and never goes into analytics events.
- **Interests** are shown on the profile and used for matching. **Daily rhythm** and **social energy** are shown on the profile but not used for matching.

**Posts (1 to 6):**
- The first post is the primary post and is required. It requires a photo.
- Other posts are a photo or an audio clip, each with a prompt or question.
- Audio posts are limited to **15 seconds**.
- Each post has one **category** and **focus areas** the owner wants covered. There are 11 categories (decided 2026-10-18): Style & outfit, Hair & grooming, Fitness & physique, Looks & photos, Voice, Overall vibe, Personality & humor, Profile & bio, Interests & hobbies, Lifestyle & places, Something else. A career or networking category was considered and left out. The wording of categories is a product-copy task for the developers, who may rework the working names.
- A giver answers exactly one post per perspective.

**Audience (decided 2026-10-20: one setting):** genders and age range (always 18+), set at the profile level, not per post. Two people see each other only when each is inside the other's audience, so nobody is shown to, or shown, someone outside what they chose. The onboarding question is worded by the goal:
- Get perspectives only: "Whose perspectives do you want?" All genders start selected; the person can untick. A hint says that including more people brings more perspectives, faster.
- Meet new people only: "Who would you like to meet?"
- Both: "Who do you want in your feed?"

A separate "who I want to meet" setting, orientation-based matching, and an open perspective pool were considered and left out for the beta; the beta decides whether they are needed (`BETA_PLAN.md`).

**Automatic widening (decided 2026-10-20):** when someone's audience leaves too few people, the age range widens automatically by 2 years at a time, at most 4 years beyond what the person chose, never below 18, and never by gender. The person gets a notice that names the new range and links to the setting; there is no undo button (they change it back in their profile if they want). *Detail (decided 2026-10-20):* "too few people" means fewer than 6 could fill a set slot (the point where the set drops to 1); each step widens both ends by 2 years (22–26 → 20–28 → 18–30 at most). *Detail (decided 2026-10-20):* when someone saves a new audience during the day, today's set is rebuilt from it if nothing was given yet; if part was given, what was given stays and only the waiting slots follow the new audience; a finished set is left alone, and the profiles after the set always use the current audience.

**Location:** ignored during the beta. Later, for people whose goal includes meeting, the city they pick comes first, then the nearest region, then the state, with a notice when the area widens. People who only want perspectives are matched regardless of location.

**Onboarding (decided 2026-10-31, from the product owner's design):** one question per screen, each answer saved as the person goes, in this order:
1. Sign-up: email, password with the 18+ and terms agreement, and birthday, confirmed in a sheet showing the resulting age ("You can't change your birthday later").
2. The basics: name, gender, pronouns (optional), height, city, orientation (optional, private), then a preview of what people see and what stays private.
3. The goal, then the audience.
4. Interests (3 to 10), daily rhythm and social energy (optional), one personality answer (optional).
5. Selfie verification.
6. The primary photo post, then up to five more (photo or voice).
7. A review of the profile, how the app works, and the notification permission question.

Between sections, four short "What you get" screens explain the app (honest takes, words never scores, connect through what you noticed, nobody gets left out); they collect nothing. Someone who stops part-way resumes at the first required answer still missing. The selfie comes after the questions about the person, but the rule is unchanged: no profile goes live without a verified selfie.

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
- Every day each user receives a **mandatory set** of profiles to give perspectives on: different people, at most 3, so the daily ask stays around 5 minutes. **The number depends on how many people the user can still be given (decided 2026-10-20):** 3 when 15 or more eligible people they have not given to yet are available, 2 when 6 to 14, 1 when fewer than 6.
- Giving the mandatory set **unlocks the perspectives you received that day**. The unlock repeats daily.
- After the mandatory set, giving more is optional.
- If fewer than the mandatory number of eligible profiles exist (for example a small user base), the user unlocks after giving to all that are available.
- A skipped slot is replaced with another eligible profile, so people are never forced to see something outside their own filters, blocks, or mutes.

### Fairness and retention
No profile should be left without perspectives. A profile that gets few or none must be pushed into other people's mandatory sets so its owner gets something to read quickly. This is a retention requirement (the "my profile gets no likes" problem on other apps). The promise covers people who opened the app in the last 3 days; people who left get perspectives again when they return.
- **Boost slot (decided 2026-10-20):** one slot goes to someone eligible for you who **opened the app in the last 3 days and received no perspectives in the last 3 days**. It is picked at random among the few who qualify, with a slight preference for shared interests, and the pick stays the same if you reopen the app that day. **If nobody qualifies, all slots are best matches.** The card never says the person has had few perspectives (that note is removed); it looks like any other profile in the set.
- The remaining slots are the best relevance matches for you.
- **Fresh people first (decided 2026-10-20):** people you never gave a perspective to come before people you gave to earlier. While at least 6 fresh people are left, the set and the profiles after it use fresh people only. Below 6, people you gave to before (who still have a post to answer) join the same pool, and the set size follows the combined pool (for example 4 fresh and 10 returning make 14: a set of 2 and 4 more). Fresh people also get a small head start in the ranking, so a clearly better older match can still come first.
- **Never put into anyone's mandatory set:** someone who has not opened the app in 7 days; someone already in 6 mandatory sets today (unless nobody else is left; built 2026-10-19); someone who already received 10 perspectives today (they can still receive perspectives people choose to give, and give-backs always work); someone on hold (see Trust and safety).
- **Narrow audience:** the audience widens automatically (see Audience).

### Explore after the set (decided 2026-10-20)
- After the mandatory set, a free user gets **4 to 5 more profiles** a day, fewer when the pool is small so people do not run out of new faces. Random "discovery" picks appear only here, never in the mandatory set. *Detail (decided 2026-10-20):* 5 when 15 or more eligible people are left that day, 4 when 6 to 14, and below that as many as are left up to 3; best matches first, and the last one of the day is a random discovery pick (the same if the app is reopened).
- A paid option for unlimited browsing (as other apps do) is a later monetization idea, not part of v1.

## Algorithms
Three server-side algorithms, each tunable without app changes:
1. **Feed ranking:** whose profile appears when you browse.
2. **Daily mandatory-set assignment:** which profiles you must give to today, including the boost slot.
3. **Mandatory count:** how many perspectives a given user must give before unlocking their own.

All three are rule-based formulas with numbers in server config; no machine learning in v1 or the beta (decided 2026-10-19). Machine learning is considered only after the beta, once there is enough of our own data, and only if it beats the formula in a shadow test.

**Ranking (starting values, decided 2026-10-20; tuned with the simulator and the beta):**
`score = 0.45 × shared interests + 0.20 × need + 0.15 × recently active + 0.10 × new member + 0.10 × giving quality`, minus a penalty for each different person who reported the profile in the last 30 days.
- Shared interests: overlap of the two people's interests.
- Need: fewer perspectives recently, counting the mandatory sets the person is already in today.
- Recently active: opened the app today or yesterday counts most.
- New member: a bonus during the first week.
- Giving quality: how often their own perspectives were marked helpful, starting neutral until there are enough marks.
- *Details (decided 2026-10-20):* recently active is 1.0 for today or yesterday, 0.5 for 2 to 3 days ago, 0.2 for 4 to 7 days, 0 after that; new member is 1.0 during the first 7 days; giving quality is (helpful marks + 2.5) / (all marks + 5); need counts perspectives in the last 3 days plus today's sets; the count of people available for the 1/2/3 rule is everyone who could be put into a set right now.
- Not used: daily rhythm, social energy, relationship goals, orientation, and any attractiveness or popularity score.

## Connect
**Connect is open.** There are no intents, no modes, and no labels such as dating, friends, or networking. It works like following on Instagram: two people connect, and the relationship becomes whatever they make of it. Labels were rejected because they feel creepy.

**The rule:** you can ask to connect with someone only after you have given them a perspective. The perspective is the gate.

Two ways to start a connection (both use the same accept/decline step):
- **Giver starts:** while giving a perspective, the giver ticks Connect. The owner sees the perspective with the connect request attached.
- **Owner starts:** the owner reads a perspective they like, opens the giver's profile, gives the giver a perspective on one of their posts, then sends a connect request.

**The receiver** sees the request together with the perspective that earned it, then **accepts or declines**. **To accept, the receiver must give the asker a perspective too** (both must give, decided 2026-10-18). The Inbox card then says "To connect, give [name] a perspective too" and offers "Give [name] a perspective" instead of Connect. The composer offers "Also connect with [name]", so giving back and accepting happen in one step. Chat opens only after accept, and shows both perspectives. Declining needs nothing.

**Decline:** the sender cannot send another connect request to the same person for **14 days** (the value is configurable; 0 disables it).

**Limits (decided 2026-10-20 for the beta, all server config):** at most 5 connect requests sent per person per day. A person who received 10 perspectives today is no longer put into mandatory sets for the rest of the day (a soft cap: chosen perspectives and give-backs still go through). There is no hard cap on perspectives received.

**Other ways in:** a person can also open a profile from their Inbox, a chat, or their list of given perspectives, and ask to connect from there once they have given that person a perspective. The list of given perspectives stays visible for now (decided 2026-10-18); a paid "see how they responded" option is a possible later idea for the business model, not built.

### The connected moment (decided 2026-10-18)
- When a connection is made, the person sees a short "You're connected" moment: our own chime (follows the phone's silent switch), a vibration, and both photos coming together. Then they go straight into that chat with the keyboard up; they can leave and write later.
- The person who accepts sees it at once. The person who asked sees it the next time the app knows: when they open it, bring it back to the foreground, or within 15 seconds while it is open (until push notifications exist). If several connections were made while they were away, the moment says how many and then opens the Connections list; with one, it opens that chat.
- It shows once per connection, and never interrupts someone writing a perspective, a post or a message.
- An empty chat shows a few **conversation ideas** chosen by the category of the post that started it and by role (the giver or the post's owner), for example "Ask what got them into it". They are guidance, not ready-made messages: tapping does not fill the message box, and they disappear after the first message. They are hard-coded; no AI reads the perspective.

### Quiet connections (decided 2026-10-18)
Connections close on their own when they go quiet, so the list stays meaningful:
- **Nobody writes:** a reminder on day 2, closed on day 3.
- **One person writes and the other does not reply:** the clock starts when the quiet person first opens the chat after that message. They see a notice 24 hours later ("[Name] is waiting. This connection closes in about a day if you don't reply") and it closes 48 hours after they opened it. If they never open it, it closes 7 days after the message. The person who wrote is only told they are waiting; they never learn whether the message was seen (there are no read receipts).
- **Both have written:** it closes after 14 days with no messages.
- A closed connection is treated like an unmatch: the chat closes for both, nothing is deleted, both see a calm note, and either person may ask to connect again straight away (a waiting period is a config value, default 0). Reconnecting starts all clocks fresh.
- All of these numbers are server configuration.

## Inbox
- Received perspectives are grouped by post and stay locked until the day's mandatory set is done.
- Actions on a perspective: **Helpful**, **Not helpful** (with a reason: vague, irrelevant, insulting, sexual, spam, unsafe), **Thank privately**, **Connect**, **Report**, **Block**.
- Incoming connect requests appear with the perspective that came with them.
- Marking perspectives unhelpful feeds the quality loop (decided 2026-10-20, details in Trust and safety → Weak givers). Only the reasons vague, didn't answer the question, and spam count toward it; insulting, sexual and unsafe go to the safety track. The giver never learns how anyone marked them, and no score is ever shown.

## Push notifications (decided 2026-10-21, placeholder)
For now every event sends a push, to check delivery works; the real rules come once most of the build is done. Pushes never contain message or perspective text. Permission is asked near the end of onboarding, on a screen that explains what the notifications are (decided 2026-10-31); someone who chooses "Not now" is asked again on a later visit.
- Someone asked to connect (no name, since requests stay locked until the daily set is done).
- You are connected (to the person who asked).
- A new chat message (the sender's name only).
- Your profiles for today are ready (once a day, mornings, if you have not opened the app yet and were active in the last week).
- You got a new perspective (no name or text).
- A quiet chat is about to close (the nudge and the "is waiting" warning).
- An update about your account (ban, appeal) or a new notice.

## Five tabs
- **Explore:** one profile at a time, finite daily batch: the mandatory set, then 4 to 5 more (see Explore after the set). A profile you already gave a perspective to can come back on a later day only while it still has a post you have not answered, and then shows only those posts (decided 2026-10-18). A skipped profile stays hidden for 2 days during the beta (decided 2026-10-20).
- **Inbox:** received perspectives and connect requests.
- **Create:** add or edit your profile posts (up to six).
- **Connections:** accepted connections and conversations.
- **You:** profile, posts, goal and audience, settings, privacy, and safety, including the list of people you blocked with unblock (next development round).

## Trust and safety
- 18+ only. Selfie verification is required at profile creation (before the profile goes live), so only verified users are ever seen.
- Report and block on every profile, post, perspective, and message. Blocking is bidirectional and immediate.
- Moderation before delivery for text, photos, and audio.
- In-app account deletion.
- See `SECURITY.md` for the full controls, including admin access.

### Reports, holds and bans (decided 2026-10-20)
**Principle: the system only holds; a person decides.** Automatic steps limit where a profile appears while it waits for review. Every ban, temporary or permanent, is decided by an admin on the admin dashboard.

**What counts as a report against a person:** reports on their profile, posts, perspectives or messages. Each different reporter counts once, however many reports they file. Reports a reviewer dismissed do not count.

**Automatic holds:**
- **2 different reporters in 30 days:** no longer put into anyone's mandatory set (built 2026-10-19). They may still appear as an optional profile.
- **3 different reporters in 30 days:** on hold. Hidden from Explore entirely and added to the review queue.
- **One serious report** (nudity or sexual content, threats or violence, possibly under 18, self-harm), from a verified account that is not itself on hold or banned: the profile is hidden at once and goes to the top of the review queue.
- A person on hold can still use the app, but nobody new sees their profile until the review.

**Weak givers (quality loop):**
- Counted only from "not helpful" marks with the reasons vague, didn't answer, or spam.
- Judged only after at least 8 such marks from at least 5 different people. People who mark almost everything "not helpful" count for less. Marks fade over about 45 days, so people recover.
- **First step:** a private notice explaining why specific, meaningful perspectives matter, and the person is sent fewer brand-new members.
- **If still in the lowest group after 10 more marks from at least 5 people:** flagged in the review queue. An admin decides (no change, 3-day ban, or permanent ban).

**Admin review:** the review queue lists everyone on hold or flagged, with the reason, the reports and marks, and the reported content. Actions: dismiss, ban for 3 days, ban permanently, extend a ban. Every action needs a reason, which the person sees, and is recorded.

**What a banned person sees:** they can still sign in, but only to a screen that says why, until when (or that it is permanent), and how to appeal. Their profile is hidden from everyone and their chats are paused, not deleted. They can still delete their account.

**Appeals:** an in-app "This was a mistake" form for both temporary and permanent bans, plus a contact email. Appeals are highlighted at the top of the admin dashboard for a recheck. A named grievance contact and response times are required before public launch (check India's IT Rules with a lawyer).

**Permanent ban:** the account is closed, the same email cannot sign up again, and only the records needed for safety are kept. Until real selfie verification exists, a banned person could return with a new email.

*Details (decided 2026-10-21):*
- **Weak-giver line:** a fixed line, not a ranking against others. A giver is weak when more than 60% of their low-effort marks plus helpful marks are low-effort (vague, didn't answer, spam), judged once there are at least 8 low-effort marks from at least 5 different people. An owner who marked more than 80% of what they received as not helpful (at least 10 marks) counts at half weight.
- **First step for a weak giver:** a private tip in Notices (no names, no numbers), pushed back in Explore (minus 0.2 in the ranking, the same as 2 reporters), and their daily set skips members in their first 7 days. **Second step:** after 10 more low-effort marks from at least 5 people while still over the line, they go on the admin's list. Everything ends by itself once marks fade and they are back under the line.
- **Each "not helpful" reason:** vague, didn't answer and spam only count toward the weak-giver line; one mark changes nothing visible. Insulting or body shaming counts as one report against the giver. Sexual and unsafe count as a serious report (hidden at once, top of the review list). The giver never learns who marked them or why.
- **Holds** last until an admin decides, and the person is not told they are on hold. A held person keeps their existing chats and connections; they are only hidden from new people.
- **Extending a ban** adds 3 more days each time.
- **Appeals:** one appeal per ban. If the admin keeps the ban, that ban cannot be appealed again; an extension counts as a new ban with its own appeal.

## State machines
- **Post:** `draft -> pending_moderation -> active -> paused | removed -> archived`
- **Perspective:** `submitted -> pending_moderation -> delivered -> helpful | archived | reported | removed` (delivered perspectives stay hidden from the owner until the owner's daily unlock)
- **Connect request:** `none -> requested -> accepted (active connection) | declined (14-day cooldown, then none)`; an active connection can become `unmatched` (by either person, or closed automatically when it goes quiet, see Quiet connections) or `blocked`
- **Moderation:** `unreviewed -> machine_allowed | human_review -> allowed | removed -> appealed -> upheld | restored`
- **Account (decided 2026-10-20):** `active -> on_hold (automatic) -> active (dismissed) | suspended until a date (3-day ban) | banned (permanent)`; `suspended -> active` when the date passes; `suspended | banned -> appealed -> upheld | restored`

## P0 scope
Auth, selfie verification, onboarding, profile with posts (photo and audio), audience, Explore with the daily mandatory set and boost slot, perspectives with hints, unlock, Inbox, helpful feedback, Connect with accept/decline and 14-day cooldown, text chat, push, report, block, moderation operations, account deletion, analytics, monitoring.

## Excluded from v1
Public scoring, followers, public comments, anonymous feedback, voice responses, live streaming, groups, ads, boosts, subscriptions and other monetization (to be designed later around the connect economy; paid unlimited Explore is one idea), custom ML, and AI-written human responses.

## Launch (decided 2026-10-20)
- **Beta:** invite-only, 50 to 100 people, mostly the founders' friends, aged 20 to 25, about 60:40 men to women, about one month, English only. Location is ignored. The plan and what it must answer are in `BETA_PLAN.md`.
- **Public launch:** planned worldwide from day one, with location handled as described under Audience.

## Carried over from earlier docs, not re-decided
Perspective lenses, response-style preferences (gentle, direct, and so on), languages, helpfulness tiers, and the earlier request-expiry concept were not part of the product-owner discussion. They are not part of the core model above. Decide them during development; do not assume they are required.

## Implementation assumptions (to confirm with the product owner)
These were not decided in the product discussion. They are implemented as stated and easy to change:
- **Lock rule:** received perspectives and connect requests stay hidden until you finish the set on the day they arrived (or a later day). Once revealed they stay visible.
- **Numbers:** comment minimum 40 characters, up to 3 quick-pick chips, 1 to 3 focus areas per post, prompts 5 to 150 characters, a skipped profile stays hidden for 2 days, "today" is computed in Asia/Kolkata time.
- **Option lists:** genders (woman, man, non-binary), orientations, optional and private (straight, gay, lesbian, bisexual, pansexual, queer, asexual, prefer not to say), the categories and their focus areas, hints and chips in `packages/contracts/src/post.ts`, and the conversation ideas in `packages/contracts/src/conversationIdeas.ts`.
- **Connect edge case:** if the other person already asked you, a new request from you is refused and you are pointed to their request instead.
- **Give-back:** you can always give a perspective back to someone who gave you one, even if they are outside your audience. This is what lets a receiver outside the asker's audience still accept. The received limit never blocks a give-back.

## North star
Helpful Perspectives per Weekly Active Owner. Second metric (decided 2026-10-20): healthy connections, meaning two people connected, both wrote, and nobody reported or blocked within 14 days.

## Guardrails
Reports per 1,000 perspectives; blocks per 1,000 interactions; severe safety incidents; share of profiles with zero perspectives at 24 hours; moderation response time; exposure concentration (how unevenly perspectives are spread across profiles); decline and report rate on connect requests; deletion and notification opt-out.
