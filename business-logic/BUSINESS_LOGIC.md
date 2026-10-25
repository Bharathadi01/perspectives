# Perspective: how the app works (business logic)

**Last updated:** 2026-10-25 (Explore: black progress pill, notices bell and filter button ("Your feed"), no note above cards, a "things in common" card after the first post, smaller name with the tick beside it and pronouns underneath; sections 9.1 and 9.11)

This is the single place to find out what the app does, in plain words, from the moment someone opens it. It describes what is **actually built and running**, not what is planned. If this file and the code ever disagree, the code is the truth and this file is wrong: fix it.

**Who must keep this file current:** every developer and every AI agent (Jana's, Bharath's, anyone's). After every successful build, feature, rule change or behavior-changing bug fix, update this file **in the same commit** (rules in section 14). The product rules we *want* live in `docs/PRODUCT.md`. This file says what we *have*, and flags where the two differ (section 12).

## How to read this file

Tags used throughout:
- **[Built]** works today.
- **[Placeholder]** looks like it works but is a stand-in (fake or simplified).
- **[Not built]** does not exist yet.
- **[Conflict]** the code does something that `docs/PRODUCT.md` does not say or says the opposite (listed in section 12).
- **Code:** points to where the rule lives, for developers.

## Contents
1. The product in one minute, and the words we use
2. Every number and setting in one place
3. Opening the app
4. Creating an account and signing in
5. Setting up a profile (onboarding)
6. Posts: photos, voice and written questions
7. Photos and voice files
8. Who can see whom, automatic age widening, notices, push notifications
9. Explore and the daily set
10. Giving a perspective
11. The Inbox and giving feedback
12. Connecting: asking, accepting, declining
13. After connecting: the connected moment, chat, quiet connections
14. Safety: reports, blocks, deleting your account
15. Sessions, security and privacy
16. Test accounts and development shortcuts
17. What is fake, missing, or in conflict
18. Error messages and what they mean
19. Automatic background work
20. Change log
21. How to keep this file up to date (mandatory)

---

## 1. The product in one minute

Perspective is an 18+ app. People who are verified adults post photos or voice clips with a question ("Does this outfit work?"). Other people answer with an honest written **perspective**. To read the perspectives you received, you must first give a few yourself that day. After giving someone a perspective, you can ask to connect. They accept (by giving one back) or decline. Only then can the two of you chat.

**Words we use**
- **Profile:** a person's page: basics plus up to 6 posts.
- **Post:** one card on a profile: a photo, a voice clip, or a written question, with a question, a category and focus areas. People give perspectives on one post at a time.
- **Perspective:** a written, honest comment one person gives on another person's post. Only the post's owner and the giver ever see it.
- **Giver / owner:** the person who wrote a perspective / the person whose post it was on.
- **Daily set:** the profiles you must give a perspective to today (1, 2 or 3, by how many people are available).
- **Boost slot:** at most one slot in the daily set for an active person who has had no perspectives in the last 3 days.
- **Goal:** a private answer, "Get perspectives", "Meet new people" or both. Nobody else ever sees it.
- **Audience:** the genders and age range you choose; used both ways (section 8).
- **Notice:** a message from the app about a change it made for you, listed under You → Notices.
- **Unlock:** finishing your daily set reveals the perspectives (and connect requests) you received.
- **Connect request:** one person asking another to chat. It carries the perspective that earned it.
- **Connection:** two people who both said yes. Chat opens.
- **Live profile:** a profile that is complete and visible to others (section 5).

---

## 2. Every number and setting in one place

**Settings you can change on the server (no new app release needed).** Code: `apps/api/src/config/app-config.ts`, examples in `.env.example`.

| Setting | Default | What it does |
|---|---|---|
| `APP_TIMEZONE` | Asia/Kolkata | Decides when "today" starts and ends for the daily set |
| `DAILY_MANDATORY_COUNT` | 3 | The most perspectives you must give in a day; the actual number is 1, 2 or 3 by how many people are available |
| `POOL_FULL_AT` | 15 | People available at which the set is 3 and you get 5 more profiles after it |
| `POOL_PARTIAL_AT` | 6 | People available at which the set is 2 and you get 4 more after it; below this, fewer |
| `AUDIENCE_WIDEN_STEP_YEARS` | 2 | When fewer than `POOL_PARTIAL_AT` people are available, the age range widens by this many years at each end at a time (section 8.1) |
| `AUDIENCE_WIDEN_MAX_YEARS` | 4 | The most the age range can widen beyond what the person chose, at each end (0 turns widening off) |
| `CONNECT_DECLINE_COOLDOWN_DAYS` | 14 | After someone declines you, you cannot ask them again for this long (0 turns it off) |
| `MAX_CONNECT_REQUESTS_PER_DAY` | 5 | Connect requests a person can send per day (empty = unlimited) |
| `MAX_PERSPECTIVES_RECEIVED_PER_DAY` | none | Optional hard cap on perspectives one profile can receive per day; not set (the product has no hard cap) |
| `RECEIVED_SOFT_LIMIT_PER_DAY` | 10 | After this many perspectives received today, a person is put into no more daily sets today (give-backs and chosen perspectives still work; 0 = off) |
| `MANDATORY_INACTIVE_DAYS` | 7 | Someone who has not opened the app in this many days is never put into a daily set (0 = off) |
| `SKIP_HIDE_DAYS` | 2 | A skipped profile stays out of your Explore for this long (2 days, counted from the skip, during the beta) |
| `BOOST_LOOKBACK_DAYS` | 3 | "Recently": the boost needs no perspectives in this many days, and need in the ranking counts them over the same days |
| `MAX_MANDATORY_ASSIGNMENTS_PER_PROFILE_PER_DAY` | 6 | The most daily sets one person can be put into per day, across everyone (0 = no limit). Only broken when nobody else is left |
| `BOOST_CANDIDATE_POOL` | 5 | The boost person is picked at random from up to this many of the qualifying people in the fewest sets today |
| `BOOST_ACTIVE_DAYS` | 3 | The boost only goes to someone who opened Explore or the Inbox today or in this many days before (0 = no check) |
| `BOOST_NEW_PROFILE_HOURS` | 48 | An account younger than this can take the boost even without that check |
| `REPORT_LOOKBACK_DAYS` | 30 | The window for counting how many different people reported a profile |
| `REPORT_HOLD_REPORTERS` | 3 | A person reported by this many different people in 30 days is put **on hold**: hidden from anyone new and put on the admin's list (0 = off; section 14.6) |
| `BAN_TEMPORARY_DAYS` | 3 | Length of a temporary ban, and of each extension |
| `WEAK_GIVER_LINE` | 0.6 | A giver is "weak" when more than this share of their low-effort plus helpful marks are low-effort (section 14.8) |
| `WEAK_GIVER_MIN_MARKS`, `WEAK_GIVER_MIN_MARKERS` | 8, 5 | Judged only with this many low-effort marks, from this many different people |
| `WEAK_GIVER_FLAG_MARKS` | 10 | More low-effort marks after the tip that put a still-weak giver on the admin's list |
| `WEAK_GIVER_PENALTY` | 0.2 | How far back a weak giver is pushed in Explore (taken off their score) |
| `MARK_FADE_DAYS` | 45 | Helpful / not-helpful marks older than this no longer count |
| `HARSH_MARKER_SHARE`, `HARSH_MARKER_MIN_MARKS` | 0.8, 10 | Someone who marked more than 80% of what they received as not helpful (with at least 10 marks) counts half |
| `PUSH_SENDER` | expo | `expo` sends pushes through Expo's push service; `log` only prints them (no sending) |
| `PUSH_DAILY_HOUR` | 9 | Local hour after which the daily "your profiles are ready" push goes out (0 = off) |
| `EXPO_ACCESS_TOKEN` | none | Only needed if push security is turned on for the Expo project |
| `ADMIN_REQUIRE_CODE` | false | Whether admin sign-in also needs the 6-digit authenticator code. **Off for now** (product owner, 2026-10-21): password only; turn on before the beta |
| `ADMIN_SESSION_HOURS` | 8 | How long an admin sign-in lasts (no renewal) |
| `ADMIN_JWT_SECRET` | derived | Optional separate secret for admin tokens; without it, one is derived from the user token secret (never the same) |
| `REPORT_PAUSE_REPORTERS` | 2 | A person reported by this many different people in that window (on their profile, posts, perspectives or messages) is not put into anyone's daily set (0 = off) |
| `RANK_WEIGHT_INTERESTS`, `_NEED`, `_ACTIVE`, `_NEW_MEMBER`, `_QUALITY`, `_FRESH` | 0.45, 0.20, 0.15, 0.10, 0.10, 0.10 | The ranking weights (section 9.5); `_FRESH` is the head start for people you never gave a perspective to |
| `ACCESS_TOKEN_TTL_SEC` | 900 (15 minutes) | How long a sign-in token works before it is renewed |
| `REFRESH_TOKEN_TTL_DAYS` | 30 | How long you stay signed in without opening the app |
| `MEDIA_URL_TTL_SEC` | 3600 (1 hour) | How long a photo or voice link stays valid |
| `FIRST_REPLY_WARN_HOURS` | 24 | Hours after the quiet person opened the chat until they are warned |
| `FIRST_REPLY_CLOSE_HOURS` | 48 | Hours after they opened the chat until the connection closes |
| `FIRST_REPLY_BACKSTOP_DAYS` | 7 | Days after an unanswered first message until it closes even if it was never opened |
| `NO_MESSAGE_REMIND_DAYS` | 2 | Days after connecting with no message until the reminder |
| `NO_MESSAGE_CLOSE_DAYS` | 3 | Days after connecting with no message until it closes |
| `INACTIVITY_CLOSE_DAYS` | 14 | Days of total silence (after both have written) until it closes |
| `REOPEN_COOLDOWN_DAYS` | 0 | Wait before two people whose quiet connection closed can connect again (0 = straight away) |
| `EXPIRY_SWEEP_MINUTES` | 15 | How often the server closes overdue quiet connections nobody is looking at (0 = off) |

**Fixed limits (built into the code).** Code: `packages/contracts/src/common.ts` and the contract files.

| Limit | Value |
|---|---|
| Minimum age | 18 |
| Oldest age someone can choose for their audience | 99 |
| Posts per profile | 1 to 6 |
| Voice clip length | 15 seconds |
| Post question length | 5 to 150 characters |
| Focus areas per post | 1 to 3 (must belong to the post's category) |
| Perspective length | 40 to 1000 characters |
| Quick-pick chips on a perspective | up to 3, no repeats, from the post category's list |
| Chat message length | 1 to 1000 characters |
| Name | 1 to 40 characters |
| Pronouns | up to 30 characters |
| City | 2 to 80 characters |
| Height | 120 to 230 cm |
| Password | 8 to 128 characters |
| Interests chosen | up to 10 (the app asks for at least 3; the server does not check the minimum) |
| Personality answer | 2 to 300 characters |
| Report note | up to 500 characters |
| Photo or voice file size | 8 MB; the whole upload request can be up to 12 MB |

---

## 3. Opening the app

Code: `apps/mobile/app/index.tsx`, `app/(tabs)/_layout.tsx`, `src/session/*`.

1. **Loading.** The app reads the saved sign-in from the phone's secure storage (on the web preview it uses the browser's storage, which is not secure; the web build is only for development). A loading screen shows meanwhile.
2. **Not signed in** → the Welcome screen (Create account / I already have an account).
3. **Signed in** → the app asks the server for "my profile":
   - If the profile is **live** → Explore (the home tab).
   - If it is **not live** → Onboarding.
   - If the account is **suspended or banned** → the ban screen (section 14.7), and nothing else.
   - If the request fails (no internet) → an error screen with Retry.
4. **The tabs** (only for a live profile): Explore, Inbox, Your posts, Connections, You. The tab bar redirects a signed-out person to Welcome and a not-live person to Onboarding, so a half-finished profile can never reach the tabs.
5. **Tab badges.** Inbox shows the number of locked items plus waiting connect requests. Connections shows the number of new connections plus connections where you owe a reply.
6. **While the app is open** it quietly checks for new connections every 15 seconds and whenever you return to it (section 13.1).
7. **Session ends.** If the server says the sign-in can no longer be renewed, the app signs the person out and returns to Welcome.

*Development only:* see section 16 (the app can auto-sign-in as a test user).

---

## 4. Creating an account and signing in

Code: `apps/api/src/auth/*`, `apps/mobile/app/(auth)/*`.

### 4.1 Creating an account [Built]
The person enters: email, password, date of birth, and ticks "I'm 18 or older and I agree to the Terms, Community Guidelines and Privacy Notice."

Rules, in order:
1. The email is trimmed and lowercased and must look like an email (up to 254 characters).
2. The password must be 8 to 128 characters.
3. The date of birth must be a real date. The server calculates the age itself; **under 18 is refused** ("You must be 18 or older to use Perspective") even if the app was bypassed.
4. The box must be ticked. The server records the time terms were accepted.
5. If an account with that email exists: "An account with this email already exists." If the email belonged to someone **banned permanently**, it can't sign up again: "This email can't be used to create an account."
6. On success the server creates the account plus an **empty profile** and signs the person in. They go straight to onboarding.

Not done: email is not verified, there is no phone number, no social login, no password reset [Not built]. The Terms, Community Guidelines and Privacy Notice are not shown anywhere as screens [Not built]; only the tick box exists.

The birthday is stored but never shown to anyone. Only the age is shown.

### 4.2 Signing in [Built]
1. Email and password are checked. The password is never stored; only a salted hash is kept (scrypt). If the email does not exist, the server still does the same amount of work, so nobody can discover which emails exist by timing.
2. Wrong email or password: "Email or password is incorrect."
3. A **suspended or banned** person **can** sign in, but only reaches the ban screen (section 14.7). Every other part of the app refuses them ("This account is suspended." / "This account is banned.").
4. On success the server gives back two tokens: an **access token** (works 15 minutes) and a **refresh token** (works 30 days, used once).

### 4.3 Staying signed in [Built]
- The app attaches the access token to every request.
- If the server answers "not signed in" (the 15 minutes ended), the app **renews once** using the refresh token and repeats the request. Several requests at the same moment share one renewal.
- **Renewing replaces the refresh token.** Each refresh token works only once.
- **If an old refresh token is ever used again** (for example copied by someone), the server cancels the whole chain of tokens for that sign-in and the person must sign in again. This protects against stolen tokens.
- If renewal fails, the app signs the person out.

### 4.4 Signing out [Built]
The server cancels that sign-in's tokens and the app returns to Welcome. Other devices stay signed in. There is no "sign out everywhere" [Not built].

---

## 5. Setting up a profile (onboarding)

Code: `apps/mobile/app/onboarding/index.tsx`, `src/components/onboarding/*`, `src/session/onboardingStore.ts`, `apps/api/src/profiles/*`, `apps/api/src/domain/eligibility.ts`.

### 5.1 What makes a profile "live"
A profile can be seen by others and can use the app only when **all five** are true:
1. **Basics:** name, gender, height and city are filled in. **Orientation is optional** (decided 2026-10-20).
2. **Goal:** "Get perspectives", "Meet new people", or both.
3. **Audience:** at least one gender and an age range are chosen.
4. **Selfie:** a selfie has been verified.
5. **A primary photo post:** the first post (position 1) is a photo.

The server recomputes this every time something changes. **Profiles made before the goal question existed** stay live until the person next changes something on their profile; then the profile goes offline until they answer the goal, and the app opens onboarding straight at the goal step. Until it is live: the tabs are blocked, other people cannot see the profile, and the person is sent to onboarding. The server also refuses Explore, giving perspectives, connecting and viewing profiles until the profile is live ("Verify your selfie to continue" or "Finish your profile to continue").

### 5.2 The seven onboarding steps
A progress bar shows the step. "Back" works. The answers are kept in the phone's memory while moving between steps; on reopening, the app refills them from whatever was already saved on the server.

1. **About you.** First name, gender, pronouns (optional), height, **orientation (optional and private)**, city, and the selfie. Orientation starts with nothing picked; tapping a picked option again clears it. A line says only you see it, it is not shown on your profile and it does not change who you see. **Continue stays disabled** until the name, gender, city and height are valid **and the selfie is verified**.
   - Selfie: a camera photo is uploaded and checked. **The check is a placeholder: it approves any photo** [Placeholder]. The selfie is stored privately and is never shown to anyone. In development builds a button skips the camera with a built-in test image (section 16).
2. **What brings you here? (the goal, private).** Two tick cards: **Get perspectives** and **Meet new people**; pick one or both. A note says only you see it and it is never shown on your profile or to the people you connect with. **Continue** needs at least one. During the beta the goal **does not change matching** (decided 2026-10-20); it words the next step and is kept for the beta measurements.
3. **The audience, worded by the goal.** The step title and question are:
   - Get perspectives only: **"Whose perspectives do you want?"** All three genders start ticked, and a hint says "Including more people brings you more perspectives, faster." (If the person had already picked genders, they are kept.)
   - Meet new people only: **"Who would you like to meet?"**
   - Both: **"Who do you want in your feed?"**

   Then the age range (starts 18 to 35, steppers, lowest 18, highest 99, minimum never above maximum), with a note that the range may be widened a little if very few people fit (section 8.1). **Continue** needs at least one gender. The old "dating intention" and "strict dealbreaker" questions are gone.
4. **Your interests.** Pick from 45 interests in 8 groups, with search. At least 3, at most 10. **Next** is disabled below 3.
5. **What matters to you?** Daily rhythm (Early Riser, Night Owl, Flexible, Always on the Move, Easygoing) and social energy (Introverted, Extroverted, Ambivert, Intimate circles, Social butterfly). Both optional ("Skip for now").
6. **A little more personality.** Choose from 5 questions and answer in up to 300 characters. Optional.
7. **Review & finish.** A summary with "Edit" links back to each step: basics, **your goal (private)** and orientation if given, the audience under its goal-worded question, interests, lifestyle and the personality answer, plus a short explanation that matching is mostly on shared interests and that the goal and orientation stay private. Pressing **Complete & Set Up Profile** saves everything **at once** in one update (nothing in steps 1 to 6 is saved to the server until this moment, except the selfie, which uploaded straight away). Then the person goes to the profile editor.

### 5.3 The profile editor and finishing
After step 7, the person lands on a one-off "Add your first photo" screen (`/me/edit?from=onboarding`) holding the same card editor described in section 6.3. The profile still is not live until a **photo post** exists, so **Finish** stays greyed out until there is one; pressing it anyway gives "Add at least one photo with a question." With a photo, the profile goes live and the person lands in Explore.

This screen deliberately sits outside the five tabs. A profile without a first photo is not live, and the tabs send anyone who is not live back to onboarding, so hosting it inside the tabs would bounce the person between onboarding and the tab forever.

If someone quits halfway: their basics are saved only if they reached step 7; the profile stays not-live, and next time they open the app they are sent back to onboarding with their saved answers refilled.

### 5.4 Changing details later
The **You** tab is only your profile now. At the top it has one switch with two sides:
- **View** — exactly what others see, which is what the tab opens on.
- **Edit** — your cards, described in section 6.3.

Switching between them does not leave the tab. Leaving for another tab and coming back returns to View; stepping into Settings and coming back keeps Edit.

Everything else moved behind the **gear in the top right**, which opens **Settings**:
- **Settings → The basics:** change name, height, gender, orientation (optional, can be cleared), city.
- **Settings → Your goal (private):** change the goal (one or both).
- **Settings → the audience row** (its title is the goal-worded question): change genders and age range. The same setting is also behind Explore's filter button (section 9.11). The age range shown is the one in use, which may have been widened (section 8.1). Picking new ages makes them your chosen range; saving the range already shown (for example while changing genders) keeps your earlier chosen range, so widening never goes further than 4 years past what you actually chose.
- **Settings → Notices:** the notices list (section 8.2). The row shows how many are new.
- **Settings → Perspectives you gave:** the ones you wrote (section 11).
- **Settings → Blocked people:** the people you blocked, with Unblock (section 14.2).
- **Settings → Sign out** and **Delete account** (section 14.3).
- Settings also shows greyed-out **Notifications** and **About** groups marked "Soon". These are layout placeholders: they take no tap and do nothing [Placeholder].
- The birthday cannot be changed.

---

## 6. Posts: photos, voice and written questions

Code: `apps/api/src/posts/posts.service.ts`, `packages/contracts/src/post.ts`, `apps/mobile/src/features/profile-editor/*`, `app/(tabs)/you.tsx`, `app/(tabs)/create.tsx`, `app/post/new.tsx`, `src/components/profile/*`.

### 6.1 What a post is
Every post has: a **question** (5 to 150 characters), one **category**, and **1 to 3 focus areas** from that category. It is one of three kinds:
- **Photo post:** a photo, optionally with a **voice clip attached** (up to 15 seconds). The question shows on the photo.
- **Voice post:** a voice clip only (up to 15 seconds).
- **Written post:** just the question, no media.

### 6.2 Rules for the list of posts
1. A profile has **1 to 6** active posts. A seventh is refused ("You can have up to 6 posts").
2. The **first post (position 1)** is the primary post and **must be a photo**. The very first post a person ever creates must be a photo.
3. The question is checked by the text moderator before saving (section 14.4). If it fails: "That prompt breaks the community guidelines."
4. The photo or voice file must belong to the person, be unused, and be the right kind; otherwise "Upload the photo or audio for this post first."
5. Making or changing a post recomputes whether the profile is live.

### 6.2b Adding a card, step by step
Adding a card is a full-screen flow with one question per screen and a bar at the top showing how far along you are.
- **A photo card: three steps.** 1) Pick the photo. 2) Write the question, with the photo kept in view; the category is one row you open, and the focus areas sit behind another row you only open if you want them. 3) Record a voice note, or skip it.
- **A voice card: two steps.** The question, then the recording (required here).
- **A written card: one step.** Just the question.
- **The voice note is added to the card, not instead of the written question.** Every card has a written question; a photo card can carry a voice note as well. The old screen showed "Written" and "Voice" as a choice between two kinds, which was never how it worked.
- You can go back a step without losing what you typed. Closing from the first step throws the card away.
- Each step's button says what is missing if you press it early (for example "Choose a photo first.").

### 6.3 Changing posts
- **Edit** the question, category, focus areas, or the attached voice clip, on one screen (editing is not a step-by-step flow — you came to change one thing). Changing the category now also moves the focus areas to ones that belong to it, instead of leaving a combination the server refuses. A photo card's voice note can be played, removed, or added here; a voice card's own clip can be played but not replaced (record a new voice card instead); a written card has no voice note. Changing the photo itself is still not possible (delete and re-add) [Not built].
- **Reorder** (`PATCH /me/posts/reorder`): the list sent must contain **every** active post exactly once, and the first one must be a photo ("The featured item must be a photo"). In the editor you **hold a photo, then drag it onto another photo to swap them** (the photo lifts with a small vibration and the one it will swap with is outlined; letting go without moving puts it back). Swapping photos never moves a voice or written card: those keep their places between the photos. Each card also has a **⋯ menu** with Move earlier, Move later, Edit the question and Remove. For a photo, Move earlier/later swaps it with the photo before or after it. For a voice or written card, Move earlier/later moves it one card along the profile, which changes its "After photo N". Screen-reader users get Move earlier / Move later as actions on a photo (swaps with the next photo) and on a voice or written row (swaps with the next row). Moving a non-photo into the first slot is refused in the app before anything is sent, with "The top card (slot 1) must be a photo to introduce yourself." Cards of different kinds may otherwise be in any order.
- **Remove:** a post is marked removed (it is not erased). Rules: you cannot remove your last post, and if you remove the primary photo the **next photo post is promoted** to the top; if there is no other photo you must add one first. Perspectives already received on a removed post stay in your Inbox.
- Posts cannot be paused or hidden without deleting [Not built].
- **What the editor looks like:** two parts.
  - **Photos:** a grid of six places, three across in two rows. Only photos go here. The tiles are portrait-shaped and carry no question text (tap a photo to see and edit its question; its **⋯** menu also shows it). A photo's voice note is a small play button on the photo. The first photo has a small star. The next free place is a **+ Add** button that adds a photo. Places that are taken up by voice or written cards (see below) show as faint empty boxes without a +; tapping one explains "Your voice and written cards use the other places. A profile holds 6 cards in all." One line under the grid: "Tap a photo to edit it. Hold and drag to reorder. Your first photo leads."
  - **Voice & written:** under the photos, one row per voice or written card, with its question at reading size, its kind (and length for voice), and **where it appears on your profile** ("After photo 1"). A voice card's row has its own play button. **Hold a row and drag it onto another to swap them** (with two or more rows, a line says "Hold and drag to reorder."); this swaps the two cards' places on your profile and never moves a photo. Two buttons, **+ Voice note** and **+ Written**, add one. This part appears once you have a photo, because a voice or written card can never be first.
  - The count "5 of 6 cards" covers both parts: every kind of card shares the same six places. Removing a card asks first in a sheet.
- **Voice notes play right on the card.** A photo's voice note is a play button on the photo showing its length (while playing it shows how far in it is, with a thin progress line); a voice card's play button fills the card. You can listen without opening the card, and only one clip plays at a time: starting another stops the first, and opening any screen over the cards stops playback. There is no waveform, because the app does not keep the sound's levels.
- There is **no on/off switch for the top photo**. The first card is the top card, and the way to change it is to move another photo to the front.

### 6.4 Categories and focus areas
There are 11 categories. Each has focus areas (what the owner wants covered), a hint for each (shown to givers), and quick-pick chips.

| Category | Focus areas |
|---|---|
| Style & outfit | The outfit, Fit, Colors, Hair & grooming, Right for the occasion, Accessories |
| Hair & grooming | The haircut, Beard & facial hair, Fresh & cared for, Overall grooming |
| Fitness & physique | Physique, Posture, Progress, Training advice |
| Looks & photos | First impression, The photo, Expression, Height & presence |
| Voice | Tone, Clarity, Confidence, Warmth |
| Overall vibe | First impression, Energy, Approachability, What stands out |
| Personality & humor | Humor, Kindness, Confidence, Easy-going or serious, Genuine |
| Profile & bio | Feels like the real them, What stands out, What you would ask, What is missing |
| Interests & hobbies | How it comes across, How it is shown, What you would want to know, Something in common |
| Lifestyle & places | What it says about them, What looks fun, The place, What you would ask |
| Something else | Your honest take, What to change |

Hints never use words like "rate" or "score". Code: `packages/contracts/src/post.ts` (`CATEGORY_CATALOG`).

### 6.5 Question suggestions
The editor has a library of ready-made questions (First Impressions, Personality, Dating & Connection, Interests & Lifestyle, Voice), each pre-linked to a category and focus areas, plus "write your own." Code: `apps/mobile/src/lib/promptLibrary.ts`.

---

## 7. Photos and voice files

Code: `apps/api/src/media/*`, `apps/mobile/src/lib/media.ts`.

1. A file is sent to the server as one upload (photo or voice).
2. **Photos:** type must be JPEG, PNG or WebP, and the **file contents are checked** to really be that type. Anything else: "That file is not a supported image."
3. **Voice:** the type must be an accepted audio type, and the app must report a length of **at most 15 seconds**. The server **trusts the reported length**; it does not measure the audio itself [Placeholder]. The recorder in the app stops at 15 seconds.
4. Empty files are refused. The maximum size is 8 MB.
5. Files are saved under a random name on **the server's local disk** [Placeholder: a real storage service replaces this later]. Hidden location data inside photos is **not** removed [Not built]. Photos and voice are **not scanned** for nudity or abuse [Not built].
6. **Nobody gets a permanent link.** Wherever a photo or voice clip appears, the server includes a **signed link that expires after 1 hour**, and only for people who are allowed to see that post. The link cannot be altered.
7. **Selfie images are never served to anyone**, not even the owner.
8. Deleting an account deletes all of that person's files.

---

## 8. Who can see whom

Code: `apps/api/src/domain/eligibility.ts`, `apps/api/src/profiles/profiles.service.ts`.

1. **Audience.** Each profile chooses **genders** and an **age range** (18 to 99). That choice is used **both ways** (decided 2026-10-20: one setting): it decides who can see you **and** whose profiles you see. The age range can widen automatically (8.1).
2. **Two people see each other only when each is inside the other's audience** (gender and age).
3. **Orientation** is optional and **private**: it is never shown to anyone and is **not used** to decide who sees whom (decided 2026-10-20 for the beta). The **goal** is private too and does not change who sees whom.
4. **Blocks** hide people from each other in both directions, always.
5. **Opening someone's profile page** (from the Inbox, a chat or your given list) is allowed when: you can see each other under rule 2, **or** you have already exchanged a perspective, **or** you are connected. Otherwise: "This profile is not available." You cannot open your own profile this way, a blocked person's, or a profile that is not live.
6. A **give-back** is always allowed even outside your audience: if someone gave you a perspective, you can give them one back even if they are outside your audience. (This is how someone can accept a connect request from a person outside their own audience.)
7. **Muting** someone does not exist yet [Not built].
8. **What others can see on a profile:** name, age, gender, height, city, pronouns, interests, daily rhythm, social energy, personality answers, the verified badge, and posts. **Never:** email, birthday, orientation, the goal, audience settings, the selfie, account status, notices.

### 8.1 Automatic age widening [Built, decided 2026-10-20]
Code: `apps/api/src/domain/widening.ts`, `daily/daily.service.ts` (`widenIfNeeded`).
1. **When:** on a person's first visit of the day, while their daily set is being built, if **fewer than 6 people** could be put into their set (the point where the set would be 1 or 0; setting `POOL_PARTIAL_AT`).
2. **How:** the age range widens **2 years at each end** at a time, up to **4 years beyond the range they chose** at each end, **never below 18** (and never above 99). **Genders are never changed.** Example: chosen 22 to 26 → 20 to 28 → 18 to 30 at most.
3. **Only useful steps are kept:** the server tries the steps in order and keeps the widest one that actually brought in more people, stopping as soon as 6 or more are available. If widening would bring in nobody, nothing changes and no notice is sent.
4. **It is saved:** the wider range becomes the range in use (it is what the audience screen shows and it works both ways, like any audience). The range the person chose is remembered separately, so the limit of 4 years is always counted from their own choice. There is no undo button; the person changes it back in their audience settings if they want.
5. **It can continue on later days** (one check per day, plus the check when they save a new audience, see below) until it reaches the limit.
6. **When someone saves a new audience during the day** [Built, decided 2026-10-20], today's set follows it:
   - **No daily set yet today:** nothing to change; the first visit builds it from the new audience.
   - **Nothing given yet:** the whole set is thrown away and rebuilt from the new audience, with the count (1 to 3) and the widening check done again.
   - **Part of the set given:** what was given stays, and the number they owe stays the same. The age range may widen. Waiting slots that the new audience excludes are replaced the next time they would be shown; if nobody is left to replace them, the number owed shrinks, as with a skipped profile.
   - **Set finished:** nothing is rebuilt and they stay unlocked. The age range may widen, and the profiles after the set are always picked from the current audience.
   - People already given to or skipped today are never put back into a rebuilt set.
7. **The person is told:** a notice "We widened your age range to 20–28" explaining that very few people fit the range they chose, that gender is never changed, and that they can set it back, with a button to the audience settings. At most one widening notice per day.

### 8.2 Notices [Built, decided 2026-10-20]
Code: `apps/api/src/notices/*`, `apps/mobile/app/me/notices.tsx`.
- **You → Notices** lists the latest 50 notices, newest first, each with how long ago it came. New ones have a dot, and the You button shows "Notices (N new)".
- Opening the list marks everything as read.
- Today the only kind is the age-widening notice (8.1). Hold, ban and weak-giver notices come with the next steps [Not built].
- Notices are private to their owner. A new notice also sends a push (8.3).

### 8.3 Push notifications [Built 2026-10-21, placeholder texts]
Code: `apps/api/src/push/*`, `apps/mobile/src/push/push.ts`. Decided 2026-10-21: every event sends a push for now, to check delivery works; the real rules come later.
- **When the app asks:** once the person is in the main app (after onboarding), the phone asks for permission. Saying no just means no pushes.
- **Where they work:** only in an Expo **development build on a real phone**, with the Expo project set up (`eas init`). In Expo Go, the simulator and the web preview the app quietly registers nothing [Placeholder until a development build exists].
- **What sends a push** (texts are placeholders; none ever contains message or perspective text):

| Event | Who gets it | Text |
|---|---|---|
| Someone asked to connect | The receiver | "Someone wants to connect with you." (no name: requests stay locked until the daily set is done) |
| A request was accepted | The person who asked | "You and Meera are connected. Say hi!" |
| A new message | The other person | "Meera sent you a message." |
| Daily reminder | People with a device who opened the app in the last 7 days and not yet today, after 9:00 local time | "Your profiles for today are ready." (once a day) |
| A new perspective | The post owner | "You got a new perspective. Finish today's set to read it." |
| Nobody wrote for 2 days after connecting | Both | "Say hi to Meera. This connection closes soon if nobody writes." (once) |
| Someone is waiting for a reply (24 h after the quiet person opened the chat) | The quiet person | "Meera is waiting. This connection closes in about a day if you don't reply." (once) |
| A ban, an extension, an appeal decision, or any new notice | The person | "There's an update about your account." / "Your appeal was reviewed." / "You have a new notice." |

- **Tapping a push** opens the matching screen: Explore, the Inbox, the chat, Notices or the ban screen.
- **Suspended or banned people** only get account updates. **Signing out** removes the device, so the next person on that phone doesn't get the pushes. A device Expo says is gone is switched off.
- Sending never slows down or blocks the action that caused it. There are no push settings in the app, no quiet hours, and no grouping yet [Not built].

---

## 9. Explore and the daily set

Code: `apps/api/src/daily/*`, `apps/api/src/explore/explore.service.ts`, `apps/api/src/domain/assignment.ts`, `domain/ranking.ts`, `domain/daily.ts`, `domain/random.ts`, `apps/mobile/app/(tabs)/explore.tsx`. Rules decided 2026-10-20 (`docs/PRODUCT.md` → Daily give-to-get, ADR-018).

### 9.1 What Explore shows
**One profile at a time.** Order of what appears:
1. First, the profiles of **today's daily set** (1, 2 or 3 people, see 9.3), one after another. The boost person (9.3) looks exactly like everyone else in the set.
2. After the set is done, **4 to 5 more profiles** (fewer when few people are left, see 9.8).
   Cards carry **no note** about which kind they are (removed 2026-10-25): a set, boost or bonus profile all look the same. The progress pill is what tells you how much of the set is left.
3. When nothing is left: "You're done for today" (if the set is finished) or "No one to show right now" (if nobody is available). The second one has a **"Change who you see"** button that opens "Your feed" (9.11).

The **top bar** has, on the left, a **black progress pill**, and on the right a **bell** and a **filter button**. The bell opens **Notices** (8.2) and shows a small black badge with the number of new notices (up to "9+"); opening Notices marks them read, which clears the badge. The filter button opens "Your feed" (9.11). The pill shows "X of N given today" with one dot per profile, and "Today's perspectives are unlocked" once finished (the Inbox keeps the same pill in its usual purple). Each card starts with the person's **name** with a **verified tick** right beside it (only for selfie-verified people), and their **pronouns** on the line underneath (left out when they gave none). A "..." button beside the name offers Report or Block. A close (X) button **skips** the profile.

On each profile, a person gives a perspective on **one specific post** by tapping its "Give perspective" button. Posts you already answered on someone who comes back are **hidden** from the card. **Right after the first post**, a black card says **"You + Tara have 4 things in common"** and lists them as chips (decided 2026-10-25). What counts, in this order: **shared interests**, then the **same city** (ignoring capitals and spaces), the **same daily rhythm**, and the **same social energy**. Only answers both people actually gave count; two blank answers never match. When nothing is shared the card is not shown. It is worked out in the app from both public profiles and is **display only**: it never changes who you see or the ranking. Code: `apps/mobile/src/features/explore/inCommon.ts`, `src/components/profile/InCommonCard.tsx`. (This replaced the purple "You both share passion for…" line that used to sit above the name; the server still sends that line, but the app no longer shows it.)

### 9.2 What "today" means
"Today" is the calendar date in `APP_TIMEZONE` (India time by default), decided by the server's clock. At midnight in that timezone the day changes and a fresh set is made on the person's first visit.

### 9.3 Building today's set (first visit of the day)
1. The server finds everyone **eligible** for this viewer (9.4). It then decides **who the set is drawn from** (fresh people first, 9.9): only people you never gave a perspective to while at least 6 of them could be put into a set, otherwise those plus people you gave to before who still have a post to answer. If fewer than 6 people are in that pool, the viewer's age range may widen first (8.1), and the set is built from the wider range.
2. **Who can be put into a set at all:** eligible people who
   - have **opened the app in the last 7 days** (today or the 7 days before; "opened" means they opened Explore or the Inbox, which the app does as soon as it starts; an account under 48 hours old counts as active),
   - have **not already received 10 perspectives today** (the soft limit: they can still receive perspectives people choose to give, and give-backs always work),
   - and were **not reported by 2 or more different people** in the last 30 days (9.5).
3. **How many you must give (the count):** from how many people in that pool could be put into your set right now: **3** when 15 or more, **2** when 6 to 14, **1** when 1 to 5, and **0** when nobody (you are unlocked straight away).
4. **The boost slot (at most 1):** someone who can be put into a set **and** opened the app in the last 3 days (or is under 48 hours old) **and received no perspectives in the last 3 days**, and is in fewer than 6 daily sets today. From those, the app takes the ones in the fewest sets today (and anyone just one above them), at most 5, and picks one **at random**, giving someone who shares more of your interests a somewhat higher chance (at most about 3 to 1). The random pick is fixed per person per day: opening the app again gives the same pick. **If nobody qualifies, there is no boost slot**: every slot is a best match.
5. **The other slots:** the people with the **highest scores** (9.5), skipping anyone already in 6 daily sets today unless nobody else is left.
6. If fewer people are available than the count, the set is smaller and the requirement is that smaller number.

Code: `apps/api/src/domain/daily.ts` (`mandatoryCount`), `domain/assignment.ts` (who may hold a slot, the boost, the picks), `domain/random.ts` (the fixed-per-day random pick), `daily/candidates.service.ts` (the facts).

### 9.4 Who is eligible for you
All must be true:
1. Active account, not you, **live** profile.
2. Their gender is one you chose, and **you are both inside each other's audience** (gender and age).
3. Not blocked either way.
4. Not already in today's set, not given to **today**, and not skipped in the last **2 days**.
5. They have **at least one active post you have not answered**.
6. They have not reached the optional hard received cap (not set: the product has no hard cap).

The old relationship-goal "dealbreaker" is gone: it hid nobody from step 1 and the question was removed in step 2 (2026-10-20). The goal and orientation do not affect eligibility.

### 9.5 How people are ranked (for set slots and the profiles after the set)
Score = **0.45 × shared interests + 0.20 × need + 0.15 × recently active + 0.10 × new member + 0.10 × giving quality + 0.10 × fresh − report penalty.** Weights are server settings (`RANK_WEIGHT_*`), to be tuned with the simulator and the beta.
- **Shared interests** (0 to 1): the interests you both picked, divided by all the interests either of you picked. 0.5 when either of you picked none.
- **Need:** 1 divided by (1 + perspectives received in the last 3 days + daily sets they are already in today). Fewer means higher.
- **Recently active:** opened the app today or yesterday 1.0; 2 to 3 days ago 0.5; 4 to 7 days ago 0.2; longer 0. A new account (under 48 hours) counts as today.
- **New member:** 1.0 during the first 7 days of their profile, then 0.
- **Giving quality:** how often owners marked this person's own perspectives helpful, starting neutral: (helpful marks + 2.5) divided by (all helpful/not-helpful marks + 5). With no marks it is 0.5; it only moves away from 0.5 as marks build up.
- **Fresh:** 1.0 when you never gave this person a perspective, else 0. It is a small head start (worth about the same as a third of a point of shared interests), so a clearly better older match can still come first. It only matters when seen-before people are in the pool (9.9).
- **Report penalty:** 0.1 for each **different person** who reported them in the last 30 days, up to 5 people. Reports on their **profile, posts, perspectives or messages** all count, each reporter once. Reports a reviewer marked as allowed, and reports whose reporter deleted their account, do not count.
- **Not used:** daily rhythm, social energy, relationship goals, orientation, post categories, or any attractiveness or popularity score.

### 9.6 Skipping
Tapping X on a profile: the skip is recorded privately (the other person is never told), the profile is hidden for **2 days** (48 hours from the skip; a skipped person who you never gave to counts as fresh again afterwards), and:
- If it was one of today's set, it is **replaced** by another person in the same kind of slot (a boost slot gets another qualifying person, chosen as in 9.3; a normal slot gets the next best). If nobody qualifies for a boost slot, it is refilled as a normal slot.
- If **no replacement exists**, today's requirement drops by 1 (never below what you already gave), and if you have now given enough, you unlock.

### 9.7 Staying valid
Every time the next profile in the set is about to be shown, the server re-checks it. If that person has since been blocked, gone offline, has no unanswered post left, has been reported by 2 or more different people, has not opened the app for 7 days, or has reached 10 perspectives today, the slot is quietly **replaced** (or the requirement shrinks).

### 9.8 After the set
After the set (drawn from the same fresh-first pool, 9.9), you get **5 more profiles** when 15 or more people are left for you that day, **4** when 6 to 14 are left, and when fewer than 6 are left, as many as are left up to 3. Each profile you give to or skip counts. They are the best matches (9.5), except the **last one of the day, which is a random "discovery" pick** (fixed for that day). These can include people who would not be put into a set (for example someone who has not opened the app for a while, or someone with 10 perspectives today). Random picks never appear in the daily set. A paid option for more is a later idea, not built.

### 9.9 Fresh people first, returning profiles [Built, decided 2026-10-20]
Code: `domain/assignment.ts` (`freshFirstPool`), `daily/daily.service.ts` (`freshFirst`), `explore/explore.service.ts`.
- **Fresh** means you never gave that person a perspective. **Returning** means you gave to them on an earlier day and they still have a post you have not answered.
- **While at least 6 fresh people are left**, both the daily set and the profiles after it are drawn from fresh people only. Someone seen before does not appear, however good the match.
- **When fewer than 6 fresh people are left**, returning people join the same pool and the best score wins across everyone. Example: 4 fresh and 10 returning make a pool of 14, so a set of 2 and 4 more after it. Fresh people still get the small head start in the score (9.5), so a clearly better older match can come first.
- **The count and the widening check use this pool.** Widening (8.1) happens only when the pool, with returning people included once they join, is under 6.
- **Returning profiles show only the posts you have not answered.** If you answered all their posts, they never reappear.
- **It stays steady through the day:** fresh people you already used up today still count towards the "6 left" check, so the allowance does not jump around while you scroll.
- In the after-set count, the 6 is checked against fresh people left for that stage of the day (after the daily set was taken out).

### 9.10 Unlocking
The set unlocks the moment you have given a perspective to **every person currently required**. Only perspectives given to people **in your set** count toward the set; giving to a profile after the set does not.

**History:** before 2026-10-19 the boost went to the single profile with the fewest perspectives, so one person could land in everyone's set (fixed: today's sets count, a random pick, at most 6 sets a day). On 2026-10-20 the set became 1 to 3 by pool size, the boost became "active, no perspectives in 3 days, or none", inactive people and people at 10 perspectives today stopped being put into sets, and the ranking changed to the formula above.

### 9.11 The filter button: "Your feed" [Built 2026-10-25]
Code: `apps/mobile/app/filters/*`, `apps/mobile/src/features/filters/audienceUpdate.ts`.
- The filter button at the top right of Explore opens a full-screen **"Your feed"** page (close it with the ✕). It holds **exactly the settings that already exist**, nothing new (decided 2026-10-25):
  - **Who you see → Show me:** the genders (shows "Women, Men", or "Everyone" when all three are picked).
  - **Who you see → Age range:** youngest and oldest (shows "22–28"). This is the range in use, which may have been widened (8.1).
  - **Just for you → Your goal:** the private goal, with the note "Only you see this. In the beta it only changes how we word things."
- Each row opens its own small page with a **Save** button, then comes back to the list showing the new value. Save stays greyed out until something actually changed, and Show me cannot be saved with no gender picked.
- These are the **same settings** as Settings → the audience row and Settings → Your goal; changing them in either place changes both. Interests, height, lifestyle and the other "about me" answers are not filters (they only affect ranking, 9.5).
- **Changing it mid-day follows the usual rule** (8.1 point 6): profiles you haven't given to yet follow the new audience; perspectives already given stay counted.
- **An unchanged audience is never sent.** Saving it would rebuild today's set for nothing, so both "Your feed" and Settings now skip the save when the genders and ages are the same as before.
- A notice created by the save (for example an age widening) now shows up right away in Notices.
- Not built: neighbourhood, distance and other filters some apps have; a card at the top of "Your feed" when the age range was widened (possible follow-up).

---

## 10. Giving a perspective

Code: `apps/api/src/perspectives/perspectives.service.ts`, `apps/mobile/app/give/[postId].tsx`.

### 10.1 What the person does
They tap "Give perspective" on a post. The screen shows the post, a list of **hints** (from the post's category and the owner's focus areas), a text box (40 to 1000 characters, with a counter), optional chips (up to 3), and, depending on the situation, a **connect switch** (section 12). Tapping a hint puts the cursor in the box and shows that hint as the grey placeholder text; it does not write anything for the person. "Send perspective" is disabled until the length is right.

### 10.2 What the server checks, in order
1. The post exists and is active, else "This is no longer available."
2. It is not your own post.
3. The owner exists, has a live profile, and has not blocked you, else "no longer available."
4. You have not blocked them ("You blocked this person").
5. You can see each other (section 8, rule 2), **or** they already gave you a perspective (the give-back), else "not available to you."
6. Every chip is from that category's chip list ("Pick chips from the list for this post").
7. The owner has not hit the daily received cap (only if one is set).
8. The comment passes the text moderator. Failing: "Honest is welcome, abuse is not. Please rewrite your perspective without insults or sexual content." The moderator is a **placeholder** that blocks only a small list of clear phrases (for example self-harm encouragement and requests for nude photos). Honest criticism is allowed [Placeholder].
9. It is saved. **One perspective per person per post**: a second one on the same post gives "You already gave a perspective on this post."

### 10.3 After it is saved
- The perspective is stored as delivered. It is **hidden from the owner until the owner finishes their own daily set** (section 11).
- If the owner was one of the giver's daily-set people, that slot is marked given, and the giver may unlock.
- If the connect switch was on, a connect attempt is made (section 12).
- The screen goes back with a message ("Perspective sent. Your inbox is unlocked!" if that finished the set).

### 10.4 Who can ever read it
Only the **owner** (after their unlock) and the **giver**. There are no public comments, likes or scores.

---

## 11. The Inbox and giving feedback

Code: `apps/api/src/perspectives/perspectives.service.ts` (inbox, feedback, given), `apps/mobile/app/(tabs)/inbox.tsx`, `app/me/given.tsx`.

### 11.1 Locked and unlocked
- A perspective or connect request is stamped with the **day it was received**.
- It is **revealed** when you have unlocked **that day or any later day**. Items that arrive **after** you already unlocked today are visible straight away.
- Until then the Inbox says how many items are waiting ("N things are waiting for you") and shows nothing else about them. A person who never unlocks a day sees that day's items once they unlock a later day.
- People you blocked or who blocked you are left out.

### 11.2 What the Inbox shows
1. **Wants to connect:** requests, each with the perspective that came with it (section 12).
2. **Perspectives, grouped by the post** they are about, newest first.
3. A row of actions on each perspective: **Helpful**, **Thank** (helpful and a private thank-you), **Not helpful**, **Connect**. A "..." menu offers Report or Block.

### 11.3 Feedback rules
- Only the **owner**, only **after the perspective is revealed**.
- **Helpful:** the perspective is marked helpful. Adding **Thank** also records a private thank-you.
- **Not helpful:** needs a reason (vague, didn't answer my question, insulting or body shaming, sexual or inappropriate, spam, unsafe). The perspective is archived, and any earlier thank-you is cleared.
- The owner can change their mind later; the newest answer replaces the old one.
- **What the giver sees:** only whether they were **thanked** ("Thanked you"). They **never** see helpful / not helpful or the reason.
- **What it affects** (decided 2026-10-21):
  - How often a giver's perspectives were marked helpful feeds the **quality** part of that giver's own ranking (section 9.5).
  - **Vague, didn't answer, spam** count toward the **weak-giver line** (section 14.8). One mark changes nothing visible.
  - **Insulting or body shaming** counts as **one report** against the giver. **Sexual** and **unsafe** count as a **serious report**: the giver is hidden at once and goes to the top of the admin's list (section 14.6). The owner does not need to press Report as well, and a mark counts once per perspective.
  - The giver never learns who marked them or why.

### 11.4 Perspectives you gave
**You → Perspectives you gave** lists up to the latest 100, each with the post's question and "Thanked you" when applicable. Tapping a person opens their profile (and from there you can connect if you have not). People you blocked are left out.

---

## 12. Connecting: asking, accepting, declining

Code: `apps/api/src/connect/connect.service.ts`, `apps/api/src/domain/connect.ts`.

**The rule in one sentence:** the asker gives a perspective first, the other person gives one back to accept, and only then can the two chat. **Both must give.**

### 12.1 Ways to ask
Always the same rule (12.2). The app offers:
1. **While giving a perspective:** a switch "Also ask [name] to connect". The perspective is sent either way; if the request cannot be sent (for example during a cooldown), a short note says why.
2. **From their profile:** a "Connect with [name]" button, shown only once you have given them a perspective. Before that it says "Give [name] a perspective on any post to be able to connect."
3. **From the Inbox:** the **Connect** action on a perspective you received opens the giver's profile. If you have not given to them yet you give one first (this is how the owner starts a connection).

A profile can be opened from Explore, the Inbox, a chat, or your given list.

### 12.2 What stops a request (checked in this order)
1. It is yourself, or the person is not available (not live, or they blocked you): "This person is not available."
2. You blocked them: "You blocked this person."
3. You are already connected.
4. You already have a request waiting for them.
5. **They already asked you:** you are told to answer their request in your Inbox (no second request).
6. You have **not given them a perspective** (the gate): "Give them a perspective first, then you can ask to connect."
7. **A cooldown:** they declined you in the last 14 days, or (if configured) your connection closed for being quiet recently: "You can ask this person again later," with the date.
8. The daily limit: **5 connect requests a day** ("You have reached today's connect limit").

If allowed, a request is stored carrying **your latest perspective to them**, stamped with today's date.

### 12.3 What the receiver sees
- The request is **hidden until the receiver finishes their own daily set** (same lock as perspectives). It then appears in their Inbox under "Wants to connect", with the perspective that earned it and the post it was about.
- On the card: if they have **not yet given back**, it says "To connect, give [name] a perspective too" and the button reads **"Give [name] a perspective"** instead of Connect. Once they have given one, the button reads **Connect**.
- On the asker's profile page the bar says the same ("[name] asked to connect. Give [name] a perspective on any post to accept"), with a Decline button.

### 12.4 Accepting (both must give) [Built, decided 2026-10-18]
1. The request must exist, be addressed to you, still be pending, and be revealed (you have unlocked), else the matching message.
2. Neither of you may have blocked the other.
3. **You must have given the asker a perspective** (any perspective that is not removed). If not: "Give them a perspective first, then you can accept" (`PERSPECTIVE_REQUIRED_BEFORE_ACCEPT`).
4. If so, in one safe step: the request becomes accepted; **any request you had sent to them is cancelled** (so two requests cannot cross); the connection is created, or **reopened** if these two were connected before (all its clocks start fresh); **your side is marked as having seen the connected moment**; theirs is not.
5. The person who accepts sees the connected moment immediately (section 13).

**Giving back and accepting in one step:** if the asker's request is waiting and you tick the connect switch while giving them a perspective, the perspective is saved and then the request is **accepted automatically**, and you go to the connected moment.

### 12.5 Declining
Needs the same conditions as accepting except the give-back. The request becomes declined. **The asker is not told.** They can see on the profile that they cannot ask again until a date 14 days later, so they can work it out. After 14 days they may ask again.

### 12.6 What else ends or cancels requests
Blocking cancels requests in both directions. Accepting cancels the accepter's own request to the same person.

---

## 13. After connecting

Code: `apps/api/src/connect/*`, `apps/api/src/domain/connection-expiry.ts`, `apps/mobile/app/connected.tsx`, `app/chat/[id].tsx`, `app/(tabs)/connections.tsx`, `src/components/connect/ConnectedMomentWatcher.tsx`, `packages/contracts/src/conversationIdeas.ts`.

### 13.1 The connected moment [Built]
A short celebration the first time each person learns they are connected.
- **What it is:** a deep purple screen, both photos sliding together with a soft glow and confetti, the words "You're connected" (or "N new connections"), the post's question the connection started from, and "Tap to say hi". It plays **our own two-note chime** (follows the phone's silent switch) and a **success vibration**. If the phone's "reduce motion" setting is on, there is no movement or confetti, only a fade. It lasts about 2.6 seconds; a tap continues at once.
- **Where it goes next:** **one** new connection → straight into that chat, with the keyboard up. **Several** → the Connections list, with the new ones tagged "New".
- **Who sees it when:**
  - The person **who accepts** sees it immediately.
  - The person **who asked** sees it the next time the app finds out: when the app opens, when it returns to the foreground, or within 15 seconds while it is open.
- **Only once:** the server records, per person, that they have seen it. It will not repeat on another phone.
- **It never interrupts** writing: it waits while the person is giving a perspective, creating a post, in a chat, editing their profile or in onboarding.

### 13.2 The Connections list
Active connections, newest activity first. Each row shows the photo, name, verified badge, the last message (or "Connected over: [post question]"), and how long ago. Tags: **New** (not yet celebrated), **Reply soon** (you owe a reply and the warning has started), **Say hi** (nobody has written and the reminder has started).

### 13.3 The chat
- **Opening:** from the connected moment, the Connections list, or "Message [name]" on a profile. When the chat is **empty or opened from the connected moment, the keyboard opens**.
- **The top card, "How you connected":** the asker's perspective and the post it was on, and, below, the perspective the other person gave back (older connections may only have the first).
- **Idea cards:** while the chat is empty, three small cards under "Ideas to start" suggest what to ask (for example, "Ask what got them into it"). They depend on the **category** of the post the connection started from and on whether you are the giver or the owner. They are **guidance only**: tapping does nothing, they never fill the message box, and they disappear after the first message. They are **hard-coded**; no AI reads any perspective.
- **Messages:** text only, 1 to 1000 characters. Each message is checked by the text moderator (the same placeholder). Failing: "That message breaks the community guidelines." The conversation must be active and neither person may have blocked the other.
- **Paused chats:** while one person is suspended or banned, the other can still open the chat, but sending says "This conversation is paused. The other person can't use Perspective right now." Nothing is deleted; it works again when the ban ends or is lifted.
- **Refresh:** the chat asks the server for new messages every 4 seconds; it loads the **latest 200** messages [Placeholder: no older history, no instant delivery]. There are no read ticks, typing signs, photos, voice notes or reactions [Not built].
- **Header menu:** tap the name to open their profile. The "..." menu offers **Unmatch** and **Report or block**.
- **Unmatch** closes the conversation for both. Nothing is deleted. Either person may ask to connect again straight away (there is no cooldown after an unmatch).

### 13.4 Quiet connections close on their own [Built, decided 2026-10-18]
So the list stays meaningful. The rule counts only messages since the two people last became connected. Numbers are the settings in section 2.

**A. Connected but nobody writes**
- Day 0: connected.
- Day 2: both see a notice "Nobody has said hi yet. This connection closes in … if nobody writes", and the row says **Say hi**.
- Day 3: the connection closes.

**B. Someone writes first and the other does not reply**
- The person who wrote is only ever told "Waiting for [name] to reply." They are **never told** whether the message was seen.
- The clock for the quiet person **starts the first time they open the chat after that message** ("seen"). This is tracked privately.
- **24 hours after they opened it**, they see: "[name] is waiting. This connection closes in about a day if you don't reply", and the row says **Reply soon**.
- **48 hours after they opened it**, with still no reply, the connection closes.
- **If they never open the chat**, it closes **7 days after the first message**.
- More messages from the person who wrote first do **not** restart the clock.
- **Any reply from the quiet person ends this rule.**

**C. Both have written**
- It closes only after **14 days with no messages from anyone**.

**What "closes" means**
- It is treated like an unmatch: status becomes closed, the chat is closed for both, **nothing is deleted**. It also records the reason (no reply, nobody wrote, inactive).
- Opening or sending in a closed chat shows a calm screen: "This connection closed. Conversations stay open when both people reply. You can still connect again from their profile."
- The pair may connect again straight away (unless `REOPEN_COOLDOWN_DAYS` is set). Reconnecting starts every clock fresh.

**When the check runs:** whenever someone lists their connections, opens a chat, sends a message, or views the other person's profile; and every 15 minutes automatically for connections nobody is looking at (section 19).

---

## 14. Safety: reports, blocks, deleting your account

Code: `apps/api/src/safety/*`, `apps/mobile/src/components/SafetyMenu.tsx`.

### 14.1 Reporting [Built]
On profiles, posts, perspectives and chats, a "..." menu offers **Report**. The person picks a reason: nudity or sexual content, body shaming, harassment or hate, threats or violence, self-harm, scam or fake profile, might be under 18, spam, something else (optional note up to 500 characters). The reporter's identity is stored; the reported person is never told.
- **What the server does with it:** saves it with **who it is about** (the profile owner, post owner, perspective giver or message sender), applies the automatic steps below, and shows it to admins on the review list (section 14.6). Some "not helpful" marks count as reports too (section 11.3).
- **Effects (automatic).** Reports on a person's **profile, posts, perspectives or messages** all count against that person (since 2026-10-20; before, only profile reports counted):
  - Each **different person** who reported them in the last 30 days adds 0.1 to their ranking penalty (up to 5 people), so they appear less in other people's Explore (section 9.5).
  - Once **2 or more different people** reported them in the last 30 days, they are **never put into anyone's daily set** (not the boost, not a normal slot), and a pending slot holding them is replaced. They can still appear after the set.
  - Several reports from the same person count once, so one person cannot push someone out alone.
  - **3 different people**, or **one serious report**: a **hold** (section 14.6).
  - Reports an admin **dismissed** stop counting.
- [Conflict] The confirmation says "it's hidden for you", but the server does **not** hide reported content or people for the reporter.

### 14.2 Blocking [Built]
From the same menu: **Block this person**. Effect, immediately and in **both directions**:
- Each of you disappears from the other's Explore, profile views, Inbox, given list and connections.
- Pending connect requests between you are cancelled.
- An existing connection is closed (status blocked).
- Today's daily-set slot with them is replaced the next time Explore loads.
- Neither can give the other a perspective, ask to connect, or message.
- **You → Blocked people** [Built 2026-10-21] lists everyone you blocked, newest first, with their photo, name, age and when you blocked them. Only you see it; the people you blocked never see a list of who blocked them. If someone deleted their account they drop off the list.
- **Unblock** (from that list, after a confirmation): you may see each other again in Explore and on profiles, if you are in each other's audience. They are not told. What blocking ended stays ended: the closed conversation and any cancelled connect requests do not come back.

### 14.3 Muting [Not built]

### 14.4 The text moderator [Placeholder]
Used for post questions, perspectives and chat messages. It blocks a short fixed list of phrases (self-harm encouragement, requests for nude photos). Everything else passes. There is **no** check for photos, voice, or the chat context.

### 14.5 Deleting your account [Built, simplified]
**You → Delete account** (also on the ban screen): type your password and the phrase DELETE MY ACCOUNT.
1. The password must be right ("Password is incorrect").
2. A deletion record is created (it holds no personal data).
3. All the person's photo and voice files are removed.
4. The account is **deleted at once**, and with it the profile, posts, perspectives they gave **and received**, requests, connections, messages and skips.
5. Reports they filed are kept, anonymous.
6. The record is marked completed (or failed, and the error is shown).
7. The person is returned to Welcome. Their old sign-in stops working.
There is **no waiting period** and no way back [Placeholder: a grace period is planned]. After a **permanent ban**, the email stays blocked from signing up again even after deletion.

### 14.6 Holds and the admin's review list [Built, decided 2026-10-20 and 2026-10-21]
Code: `apps/api/src/enforcement/enforcement.service.ts`, `domain/enforcement.ts`.
**The system only holds; a person decides.** Nothing automatic ever bans anyone.
- **Hold after 3 different reporters** in 30 days, or **at once after one serious report** (nudity or sexual content, threats or violence, possibly under 18, self-harm, including "sexual" and "unsafe" marks) from a verified account that is not itself on hold or banned.
- **What a hold does:** the person is hidden from **anyone new**: not in Explore (no set, no profiles after the set) and their profile page says "not available" to people who don't already know them. People who already exchanged perspectives or are connected still see them, and their **existing chats keep working**. They can still use the app normally.
- **They are not told** they are on hold. If an admin dismisses it, it is lifted quietly.
- **It lasts until an admin decides.** A serious report on someone already on hold moves them to the top.
- **The review list** (admin dashboard) shows serious reports first (newest first), then open appeals, then 3-reporter holds, then weak givers.

### 14.7 Bans, the ban screen and appeals [Built, decided 2026-10-20 and 2026-10-21]
Code: `apps/api/src/admin/*`, `safety/restriction.service.ts`, `apps/mobile/app/restricted.tsx`.
- **Only an admin can ban.** Choices: **3-day ban**, **permanent ban**, **extend** (3 more days each time, from the current end), **restore** (lift the ban). Each needs a reason, and the ban's reason is shown to the person as written.
- **A temporary ban ends by itself** when its date passes (checked when they open the app and every 15 minutes).
- **While banned:** their profile is hidden from everyone, their chats are paused (section 13.3), and they are out of every daily set. They can still sign in, but only see the **ban screen**: "Your account is suspended" (or banned), until when (or "This ban is permanent"), the reason, and:
  - **This was a mistake**: one appeal per ban, 10 to 1000 characters. While it waits: "We're looking at it again." If the admin keeps the ban: "The decision stays" with the admin's reason, and that ban can't be appealed again. **An extension is a new ban**, so it can be appealed once more.
  - **Sign out** and **Delete account**.
- **When a ban is lifted** (after an appeal or by an admin), the account is active straight away and the person gets a notice "Your account is back to normal" with the admin's reason.
- **A permanent ban** also blocks the email from signing up again; restoring removes that block.
- **Dismissing** a hold lifts it, and the reports reviewed so far stop counting.

### 14.8 Weak givers (the quality loop) [Built, decided 2026-10-21]
Code: `domain/enforcement.ts` (`assessGiver`), `enforcement/enforcement.service.ts` (`reassessGiver`).
1. **What counts:** "not helpful" marks with the reasons **vague, didn't answer, spam** (low effort), against **helpful** marks, from the last **45 days**. An owner who marked more than 80% of what they received as not helpful (at least 10 marks) counts **half**.
2. **The line (fixed):** someone is a weak giver when **more than 60%** of those marks are low-effort, judged only once there are **at least 8 low-effort marks from at least 5 different people**.
3. **First step** (the moment they cross the line): a private notice "Make your perspectives count" with tips, no names and no numbers; they are **pushed back in Explore** (0.2 off their score, like 2 reporters); and their **daily set skips brand-new members** (profiles in their first 7 days).
4. **Second step:** if they get **10 more low-effort marks from at least 5 people** and are still over the line, they go on the admin's list (not hidden). The admin decides: nothing (dismiss; they then need 10 new marks to be flagged again), a 3-day ban, or a permanent ban.
5. **It clears by itself:** checked after every mark on their perspectives and on their first visit of each day, so once old marks fade and they are back under the line, the push-back and the set rule stop.

### 14.9 The admin dashboard [Built, decided 2026-10-20]
Code: `apps/admin` (web only), `apps/api/src/admin/*`. It is **not part of the phone app**.
- **Admins are not app accounts.** They are created only with a command on the server (`pnpm admin:create -- --email ...`), which prints a password and an authenticator secret once. There is no sign-up.
- **Sign-in:** email and password. **For now the 6-digit authenticator code is switched off** (product owner, 2026-10-21) [Placeholder]; with `ADMIN_REQUIRE_CODE=true` the code from an authenticator app (Google Authenticator, the Mac Passwords app, 1Password, ...) is required too, and a code can't be used twice. Sessions last 8 hours and are not renewed. Admin sign-ins only work on the admin API, and app sign-ins never work there.
- **Screens:** the review list; a person's page with their photo, email, age and status, the reports with the reported content (text, post question, and a 1-hour photo or voice link) and an anonymous label per reporter, their giving quality, their bans and appeals, the history of admin actions, and the action buttons (with a confirmation for bans).
- **Audit log:** every sign-in, every view of a person's page and every action is recorded with the admin, time, person and reason. It can't be edited from the dashboard.
- **Run it locally:** `pnpm --filter @perspective/admin web` opens it on port 8082.

---

## 15. Sessions, security and privacy

1. **Default deny.** Every server route needs a valid sign-in except: creating an account, signing in/refreshing/out, the health check, and the signed media links. A suspended account is refused everywhere.
2. **Live-profile routes.** These additionally require a live profile: Explore, everything about perspectives and the Inbox, everything about connecting and chat, and viewing another person's profile.
3. **Routes open to a not-yet-live user** (so onboarding works): my profile, saving profile details, selfie, posts, uploading files, reports, blocks, account deletion.
   - **Routes open to a suspended or banned person:** only the ban screen, the appeal, account deletion, and signing in, renewing and out.
   - **Admin routes** (`/v1/admin`) accept only an admin token (section 14.9).
4. **Idempotency.** Every signed-in change (create, update, delete) must carry a unique key. If the app retries the same action (for example a flaky connection), the server returns the first result instead of doing it twice. Failed actions are not stored, so they can be retried. Account deletion is exempt.
5. **Passwords** are stored as salted scrypt hashes, compared in constant time.
6. **Tokens:** short access token plus single-use rotating refresh token (section 4). On phones they live in the secure keychain/keystore; in the web preview, in the browser's storage.
7. **Photo and voice links** expire after 1 hour and cannot be guessed or altered.
8. **Never in what other people see:** email, birthday, exact location (we only store a city name typed by the person), orientation, the goal, audience settings, the selfie, account status, notices, moderation notes. There are no analytics events today, so orientation cannot leak there; when analytics are added it must stay out (`docs/BETA_PLAN.md`).
9. **Rate limits: none** [Not built]. **CORS** (which websites may call the server) is open to all [Not built: to be restricted].
10. **What is logged:** request ids and errors; the code is written not to log tokens, passwords or message and perspective text.

---

## 16. Test accounts and development shortcuts

**Seeded test people** (`pnpm db:seed`; every password is `perspective123`; resetting wipes and recreates them):

| Person | Email | About |
|---|---|---|
| Ravi | ravi@perspective.test | Man, 24, Bengaluru; goal: meet; audience: women 18 to 30; 3 posts (style, fitness, voice) |
| Meera | meera@perspective.test | Woman, 23, Bengaluru; goal: both; audience: men 21 to 32 |
| Asha | asha@perspective.test | Woman (bisexual, private), 26, Mumbai; goal: perspectives; audience: men and women 22 to 35 |
| Kabir | kabir@perspective.test | Man, 28, Bengaluru; goal: meet; audience: women 21 to 35 |
| Nisha | nisha@perspective.test | Woman, 22, Delhi; goal: both; audience: men 18 to 28 |
| Priya | priya@perspective.test | Woman, 25, Bengaluru; goal: perspectives; audience: men 21 to 35 |
| Arjun | arjun@perspective.test | Man (gay, private), 30, Bengaluru; goal: meet; audience: men 24 to 40 |

Seed state: everyone "opened the app" yesterday (so they count as active). With only the seed people, widening never triggers for them (a wider range brings in nobody new); accounts you created yourself in the local database can change that. With 4 women in his audience, Ravi's daily set is **1** profile, then 3 more after it. Ravi starts with yesterday's perspectives already visible, one more perspective that is locked until he finishes today's set, a pending connect request from Priya, and a connection with Asha (connected 2 hours ago, with two messages). Photos are generated color gradients, not real people.

**The test world** (`pnpm db:seed:world`, guide: `business-logic/TEST_WORLD.md`): 100 more fake people (`name@world.test`, password `perspective123`), each set up so a rule actually happens: sets of 1, 2 and 3, a boost, widening, the soft limit, reports and holds, a ban with an appeal, weak givers, fresh-first, shared interests, inactive and brand-new members. Re-running it wipes and recreates only the `@world.test` people.

**Admin (development):** the seed also creates `admin@perspective.test` with password `perspective123` for the admin page. On a real server admins are made only with `pnpm admin:create -- --email you@example.com`, which prints a password and an authenticator secret once (section 14.9). The admin page runs with `pnpm --filter @perspective/admin web` on port 8082.

**Development-only shortcuts** (all off in a release build):
- If no sign-in is saved, the app **signs in as Ravi automatically** (it calls the local server).
- The login screen is pre-filled with Ravi and has quick sign-in buttons.
- Links like `/login?autoLogin=ravi` or `autoLogin=fresh` sign in or create a throwaway account and jump into onboarding.
- The selfie step has a "Take Selfie (Dev Bypass)" button that uploads a built-in image instead of using the camera.

---

## 17. What is fake, missing, or in conflict

**Looks real but is a stand-in [Placeholder]**
- The **Notifications** and **About** groups in Settings are layout only: every row is greyed out, marked "Soon", and takes no tap. Nothing behind them is built.
- Selfie verification approves any photo (no liveness, no face match).
- Text moderation is a tiny phrase list; no photo or voice moderation.
- Photos and voice are stored on the server's disk; hidden location data is not removed.
- Ranking weights (decided starting values, not yet tuned on real data).
- Account deletion is instant and total.
- Reports and holds are reviewed by hand on the admin dashboard; there is no automatic photo, voice or text moderation behind them yet.
- Voice length is trusted from the app.
- Admin sign-in is password only: the authenticator code exists but is switched off (`ADMIN_REQUIRE_CODE`) until before the beta.
- Chat refreshes by asking every 4 seconds; only the latest 200 messages load.

**Does not exist yet [Not built]**
- Password reset, email verification, "sign out everywhere", other sign-in methods.
- Mute.
- Using orientation to decide who sees whom.
- Replacing a post's photo; pausing a post.
- Push settings in the app, quiet hours, grouping several messages into one push; emails.
- Instant (real-time) chat, older message history, read receipts, typing signs, photos or voice in chat.
- Before public launch (docs/SECURITY.md): rate limits on admin sign-in, allow-listing or a VPN for the admin page, a named grievance contact and response times. An admin's password can only be reset with the server command (`--reset`).
- Rate limits, restricted CORS, hosting, backups, monitoring, analytics.
- Terms, privacy and guidelines screens; data download.
- Dark mode; an accessibility review; Android has not been tried.
- Payments.
- A hosted admin page: today it runs locally (`pnpm --filter @perspective/admin web`).

**Conflicts with the product rules** (code vs `docs/PRODUCT.md`). On 2026-10-20 the product owner decided the beta model (ADR-018); steps 1 to 3 are built, so what is left here is still open:
1. **More profile questions than the product defines:** personality answers and pronouns are still not mentioned in `docs/PRODUCT.md`.
2. **The word "perspective" is used for two things:** the feedback one person gives (the product's meaning) and, in the profile editor, the question attached to a post. Needs one clear word for the second.
3. **The report confirmation promises to hide the content**, but the server does not.
4. **"Declined. They won't be told."** is true (no message is sent), but the asker can work it out from the 14-day note.

---

## 18. Error messages and what they mean

| Code | When | What the person sees (roughly) |
|---|---|---|
| UNAUTHORIZED | Not signed in or session ended | "Please sign in again." |
| INVALID_CREDENTIALS | Wrong email/password, or wrong password on deletion | "Email or password is incorrect." |
| EMAIL_TAKEN | Email already used | "An account with this email already exists." |
| UNDERAGE | Under 18 | "You must be 18 or older to use Perspective." |
| ACCOUNT_SUSPENDED / ACCOUNT_BANNED | A suspended or banned person tries anything but the ban screen | The app opens the ban screen |
| EMAIL_BLOCKED | Signing up with the email of someone banned permanently | "This email can't be used to create an account." |
| APPEAL_NOT_ALLOWED | A second appeal on the same ban | "You have already appealed this decision." |
| CONNECTION_PAUSED | Sending to someone who is suspended or banned | "This conversation is paused…" |
| SELFIE_VERIFICATION_REQUIRED / PROFILE_INCOMPLETE | Using the app before the profile is live | "Verify your selfie to continue" / "Finish your profile to continue" |
| PRIMARY_POST_REQUIRED, POST_LIMIT_REACHED | Post list rules (section 6) | The server's message |
| MEDIA_INVALID | Bad or unusable upload | The server's message |
| MODERATION_FAILED | Text blocked | "Honest is welcome, abuse is not…" |
| POST_NOT_ELIGIBLE, PROFILE_NOT_ELIGIBLE, NOT_FOUND | Not available to you | "This is no longer available." |
| BLOCKED_PAIR | One of you blocked the other | "You blocked this person." |
| ALREADY_SUBMITTED | Second perspective on the same post | "You already gave a perspective on this post." |
| DAILY_UNLOCK_INCOMPLETE | Acting on received items before unlocking | "Finish today's perspectives to see this." |
| PERSPECTIVE_REQUIRED_BEFORE_CONNECT | Asking without giving first | "Give them a perspective first, then you can ask to connect." |
| PERSPECTIVE_REQUIRED_BEFORE_ACCEPT | Accepting without giving back | "Give them a perspective first, then you can accept." |
| CONNECT_COOLDOWN_ACTIVE | Within 14 days of a decline | "You can ask this person again later" (with the date) |
| CONNECT_REQUEST_PENDING | Already waiting, or they already asked you | The server's message |
| ALREADY_CONNECTED | Already connected | "You are already connected." |
| CONNECTION_CLOSED | Chat closed because it went quiet | The "This connection closed" screen |
| CAP_REACHED | The 5 connect requests a day are used (or an optional hard received cap, if one is ever set) | "You have reached today's connect limit." |
| IDEMPOTENCY_KEY_REQUIRED | The app forgot the unique key | (a bug if ever seen) |
| VALIDATION_FAILED | Input does not fit the rules | The server's message |
| NETWORK_ERROR | No connection | "Could not reach Perspective. Check your connection and try again." |

---

## 19. Automatic background work

Three things run by themselves:
- **Every 15 minutes** (same setting) the server checks whether it is past 9:00 local time and sends the daily "your profiles are ready" push to whoever hasn't had it today (section 8.3).
- **Every 15 minutes** (the same setting) the server ends temporary bans whose date has passed.
- **Every 15 minutes** (setting `EXPIRY_SWEEP_MINUTES`; 0 turns it off) the server closes quiet connections that are overdue (section 13.4). It runs inside the API process. With several servers each would run it, which is harmless.

Everything else happens when someone does something: the daily set is built on a person's first visit of the day (and the age range widens then, if needed, section 8.1); locked items reveal when the set is finished; quiet connections are also checked whenever they are read.

---

## 20. Change log

Newest first. Add an entry for every change that affects how the app behaves.

### 2026-10-25: Explore gets a filter button, a black progress pill and a new name header
- **Filter button** at the top right of Explore opens a full-screen **"Your feed"** page: Show me (genders), Age range and Your goal, each with its current value and its own small page to change it. Nothing new is decided; these are the settings that were only in Settings. Changing them mid-day follows the existing rule. (Section 9.11.)
- **The progress pill on Explore is black** and sits on the left. The Inbox pill is unchanged. (Section 9.1.)
- **A bell** next to the filter button opens Notices, with a badge for new ones. (Section 9.1.)
- **The note above each card is gone** ("Part of today's set. Give a perspective on any one post." and "Bonus profile…"). All cards look the same; the pill shows progress. (Section 9.1.)
- **Every profile header is now a smaller name with the verified tick right beside it, and the pronouns underneath** (Explore, your own View tab, and opened profiles). Only the tick is shown, no "Verified" word. The "..." Report/Block button on Explore moved next to the name. (Section 9.1.)
- **"No one to show right now"** now points to the filter button and has a "Change who you see" button (it used to say "You → Edit", which no longer exists).
- **Saving an unchanged audience no longer rebuilds today's set.** Both "Your feed" and Settings skip the save when nothing changed. Notices refresh right after a profile save.
- **Decided by the product owner: the limit stays at 1 to 6 posts in total** (photos, voice and written together). The request to allow 6 photos *plus* voice and written cards is closed; the profile editor will be adjusted to match.
- **New "things in common" card** right after the first post: "You + Tara have 4 things in common", listing shared interests, same city, same daily rhythm and same social energy. Black card; hidden when nothing is shared. It replaces the purple "You both share passion for…" line above the name. (Section 9.1.)
- No rule, number, server or database change.

### 2026-10-26: voice and written cards can be reordered by dragging
- **Hold a voice or written row and drag it onto another to swap them**, the same way photos work. Swapping two rows trades their places on your profile; photos never move. The ⋯ menu still moves a card past a photo ("After photo 1" → "After photo 2"). (Section 6.3.)
- **Not changed: the limit of 6 cards in total.** A request to allow 6 photos *plus* voice and written cards on top would change the rule "1 to 6 posts" in `docs/PRODUCT.md`. (Decided 2026-10-25: the limit stays at 6 in total; see the entry above.)
- No rule, number, server or database change.

### 2026-10-25 (after midnight): photos in the grid, voice and written cards in a list under it
- **The grid holds only photos now.** A voice or written card has no picture, so as a tile it was a box with a play button or a few squeezed words. They are now listed under the photos, one row each, with the question at reading size. This is how the big dating apps' editors are laid out too (photos grid first, prompts listed below). (Section 6.3.)
- **Each voice or written row says where it shows on your profile**, for example "After photo 1", and can be played right there (voice). Its ⋯ menu moves it one card earlier or later.
- **Dragging photos never moves a voice or written card.** Swapping two photos leaves the other cards where they were.
- **+ Voice note** and **+ Written** buttons under the list add those cards; the **+ Add** in the grid now adds a photo directly. The old "what kind of card?" sheet is gone.
- All kinds still share the same six places ("5 of 6 cards"). Grid places that the voice and written cards are using show as faint empty boxes with no +.
- No rule, number, server or database change.

### 2026-10-25 (late night): the six slots are three across, in two rows
- **The grid is two rows of three**, as asked, the same shape as the other big dating apps' editors, so all six slots fit on the screen at once. The cards are portrait-shaped rather than square, so each photo gets about a third more room than a square of the same width.
- **No question text on the cards any more.** At a third of the screen wide it could not be read. Tap a card to see and edit its question; the card's ⋯ menu also shows it. A written card still shows the start of its question, since it has nothing else to show. (Section 6.3.)
- The first card is marked with a small star instead of a "LEADS" label; the next free slot shows a **+ Add** button.
- Holding and dragging to swap, the ⋯ menu, playing voice notes on the cards, and the first-card-must-be-a-photo rule all work as before.
- No rule, number, server or database change.

### 2026-10-25 (night): the editor is a six-slot grid again — bigger, readable, and you hold to drag
- **Back to six slots with "+"**, as asked, but two columns instead of three. Each card is about twice the size of the old grid's (and about twice Hinge's, checked against the screenshots in Hinge's own help centre), and portrait-shaped like the photos people post.
- **The question is readable on every card.** It sits under the card at normal reading size. The old grid squeezed it to a tiny size inside the photo and then printed it again in a list below; Hinge does not show it in the grid at all. (Section 6.3.)
- **The next free slot says what it does** ("Add a photo or voice note"); the other empty slots stay quiet, so the six-slot shape is visible without five loud boxes.
- **Hold, then drag onto another card to swap.** The old grid started a drag as soon as a finger moved, which on a screen this full of cards would make it impossible to scroll; now a card lifts only after a short hold, and the page stops scrolling only while a card is lifted. The card menu (Move earlier / Move later) and screen-reader actions do the same without dragging. The first card still has to be a photo. (Section 6.3.)
- **Voice notes still play on the cards**, now as a play button on the photo, or the whole face of a voice card. One clip at a time; lifting a card stops playback.
- No rule, number, server or database change.

### 2026-10-25 (evening): voice notes play on the cards; the edit screen's options work again
- **Bug fixed: on the edit screen, "Browse questions", "Category" and "What should people focus on?" did nothing when tapped.** The same was true on step 2 of adding a card. Their sheets were placed beside the full-screen window instead of inside it, and the phone will not open a second window from underneath one that is already showing. They now open over it. (Sections 6.2b, 6.3.)
- **Voice notes now show and play on the cards in Edit.** A photo's voice note sits right under the photo, the way it reaches people viewing the profile; a voice card plays under its question. One clip at a time. (Section 6.3.)
- **The edit screen no longer offered "Add a voice note" on a voice card**, which already is one; that came from reading the wrong field. It also no longer offers a voice note on a written card. (Section 6.3.)
- **Categories are back to how they were before the redesign**: a photo card can be filed under Voice (the old screen did this itself when a clip was attached); a written card cannot. The redesign had briefly hidden Voice for photo cards, which was a rule nobody decided.
- No rule, number, server or database change.

### 2026-10-25 (later): adding a card is three short steps, and voice joins a photo instead of replacing it
- **The add-a-card screen was one long form**: a photo box, a Written/Voice switch, the question, eleven category chips and a focus-area row, all on one scroll. It is now a full-screen flow with one question per screen and a progress bar — photo, then question, then an optional voice note. Apple's guidance is that a sheet suits one scoped task and that a multi-step job like putting a photo together belongs in a full-screen view. (Section 6.2b.)
- **"Written" and "Voice" were never two kinds of card.** Every card has a written question; a photo card can also carry a voice note. The old switch made them look mutually exclusive. The voice note is now the last, skippable step, and the screen shows the card being built so it is clear the voice joins it. (Section 6.2b.)
- **The eleven category chips became one row you open**, and the focus areas another, so the question itself is no longer competing with two walls of chips.
- **Three bugs went with the old screens.** (1) Changing the category left the old focus areas in place, producing a card the server refused ("Not a focus area of looks: tone"); the focus areas now follow the category. (2) The add screen kept its state between opens, so the question, category and focus areas from one card leaked into the next; every open now starts clean. (3) A custom question written in the question browser was saved with a category and focus areas that did not match, so it was always refused.
- **Editing a card is now one screen** rather than the same long form, and the removal of a voice note is explicit.
- No rule, number, server or database change. The question, category, focus areas and limits are exactly as before.

### 2026-10-25: the profile tab is View/Edit, the editor is rebuilt, Settings holds the rest
- **The You tab is only your profile now.** It opens on **View** (what others see) with a switch to **Edit** beside it. The old route of tapping "Edit Profile & Live Preview" to reach a second screen is gone, along with that screen's Cancel/Done bar. (Section 5.4.)
- **Everything else moved to a new Settings screen**, behind a gear in the top right: the basics, your goal, your audience, Notices, Perspectives you gave, Blocked people, Sign out and Delete account. They all work exactly as before; only where you find them changed. Settings also shows greyed-out Notifications and About groups marked "Soon" that do nothing [Placeholder]. (Sections 5.4, 17.)
- **The editor was rebuilt around the photos.** One card per row: a photo now fills the width with its question readable underneath, instead of a 3x2 grid of small tiles where the question was printed twice (once unreadably small on the tile, once again in an "Attached perspectives" list). Voice and written cards stay compact. The five empty dashed boxes are replaced by one "Add a photo or voice note" button that says how many slots are left. Each card has a ⋯ menu with Move up, Move down, Edit the question and Remove. (Section 6.3.)
- **Two things that never worked are gone or fixed.** The "Top Photo" on/off switch did nothing at all — it was never saved and there is no such setting; it is removed, and the first card is simply the top card. The "Get verified" row could only ever say "Verified", because an unverified profile is not live and never reaches this tab; it now appears only if the selfie is ever not verified, and tapping it opens a working selfie screen (`/me/verify`). The old tap went to a screen that could not open. (Sections 6.3, 17.)
- **Removing a card now asks in a sheet** like the rest of the app, instead of a blocking pop-up.
- No rule, number, server or database change. Old links still work: `/me/edit?section=basics|goal|audience` lead to the new screens, and the end of onboarding still lands on its own "Add your first photo" screen. (Section 5.3.)

### 2026-10-24: Explore now actually shows the shared-interest note
- The server has always computed the "You both share passion for X & Y" line correctly (section 9.1), but `apps/mobile/app/(tabs)/explore.tsx` never passed it to the screen, so it silently never appeared on a real card. Found by an independent round of browser-driven testing of steps 1 to 5 (direct interaction with the running app, not just the API), separate from Bharath's own test pass. One-line fix; no rule changed, no server change. (Section 9.1.)

### 2026-10-21: the test world (no app change)
- `pnpm db:seed:world` creates 100 fake people set up to show every rule from steps 1 to 5, with a guide in `business-logic/TEST_WORLD.md` listing who to sign in as and what to expect (checked against the running app). (Section 16.)

### 2026-10-21: beta step 5, push notifications (placeholder)
- **Pushes for every event for now**, to check they work: connect requests, new connections, messages, a daily "profiles ready" reminder, new perspectives, quiet-chat nudges, and account updates and notices. No push contains message or perspective text. They need a development build on a real phone (section 8.3).
- Signing out removes the device; banned people only get account updates. (Sections 2, 8.3, 17, 19; database: `push_tokens`, `push_log`; ADR-020.)

### 2026-10-21: beta step 4, the blocked people list
- **You → Blocked people** lists everyone you blocked (newest first) with **Unblock** after a confirmation. Unblocking lets you see each other again where your audiences allow; the old conversation and cancelled requests stay closed. (Sections 5.4, 14.2, 17.)

### 2026-10-21: beta step 3, holds, bans, appeals, weak givers and the admin dashboard
- **Holds:** 3 different reporters, or one serious report from a verified account, hide the person from anyone new until an admin decides. They are not told; their existing chats keep working.
- **"Not helpful" marks:** insulting counts as one report, sexual and unsafe as a serious report.
- **Bans** are admin decisions only: 3 days, permanent, extend by 3 days, restore. Temporary bans end by themselves. Banned people only see the ban screen (reason, end date, one appeal per ban, sign out, delete account); their profile is hidden and chats are paused. A permanent ban blocks the email.
- **Weak givers:** over a fixed 60% line (8+ low-effort marks from 5+ people, harsh markers half, 45-day fade) → a private tip, 0.2 lower in Explore, no brand-new members in their set; 10 more low-effort marks → the admin's list. Clears by itself.
- **The admin dashboard** (`apps/admin`, web only): separate admin sign-ins made by a server command (plus a seeded development admin), password sign-in (the 6-digit authenticator code is built but switched off for now, product owner 2026-10-21), 8-hour sessions, review list, person pages with the reported content, actions with reasons, and an audit log.
- New notices: "Make your perspectives count" and "Your account is back to normal". (Sections 2, 3, 4, 11.3, 13.3, 14, 15, 17, 18, 19; database: review cases, bans, appeals, admins, audit log, blocked emails, giver quality; ADR-019.)

### 2026-10-20: fresh people first, and skips hidden for 2 days
- **Fresh people first.** The daily set and the profiles after it come from people you never gave a perspective to while at least 6 are left. Below 6, people you gave to before (with a post still to answer) join, and the set size follows the combined pool.
- **A small head start in the score for fresh people** (new `RANK_WEIGHT_FRESH`, 0.10), so a clearly better older match can still come first.
- **A skipped profile stays hidden for 2 days** (was 7).
- (Sections 2, 9.3, 9.4, 9.5, 9.6, 9.8, 9.9; `docs/PRODUCT.md`; ADR-018.)

### 2026-10-20: beta step 2, the goal, the audience step, private orientation, widening and notices
- **New onboarding step: the goal** ("Get perspectives", "Meet new people", or both). Private, required to go live, changeable under You. It does not change matching in the beta (decided 2026-10-20).
- **The audience step is worded by the goal** ("Whose perspectives do you want?", "Who would you like to meet?", "Who do you want in your feed?"). Perspectives-only starts with every gender ticked and a hint that more people bring more perspectives.
- **Orientation is optional and private:** no longer required, no longer shown on profiles, never used for matching.
- **The dating intention and its dealbreaker are gone** from onboarding, profiles and the server's answers (the old saved values stay in the database, unused).
- **Automatic age widening:** when fewer than 6 people are available, 2 years at each end at a time, at most 4 beyond the chosen range, never below 18, never by gender; only steps that bring in more people are kept; saved, with a notice.
- **Notices list** under You, with a "new" count; opening it marks them read.
- **Changing the audience during the day updates today's set** (see 8.1 point 6): rebuilt if nothing was given, otherwise given work is kept and waiting slots follow the new audience. Explore also refreshes straight after saving (before, the old card could stay on screen).
- Onboarding now has 7 steps. Profiles made earlier stay live until their next change, then ask for the goal. (Sections 1, 2, 5, 8, 9.3, 9.4, 15, 16, 17, 19; ADR-018; database: new `goals` and chosen-range columns and a `notices` table.)

### 2026-10-20: beta step 1, the daily set and ranking
- **Daily set of 1, 2 or 3** by how many people could be put into it (15 or more: 3; 6 to 14: 2; 1 to 5: 1; none: unlocked straight away).
- **Boost** only for someone active in the last 3 days with **no perspectives in the last 3 days**; if nobody qualifies there is no boost slot. The "hasn't had many perspectives yet" note is gone: the boost card looks like any other.
- People who have **not opened the app for 7 days**, and people who already **received 10 perspectives today**, are not put into daily sets (they can still be shown after the set; give-backs always work).
- **5 connect requests a day.**
- After the set: **5 more profiles** (15+ people left), **4** (6 to 14), or as many as are left up to 3; the last one is a random discovery pick. This replaces the 10-a-day batch.
- **New ranking:** shared interests, need, recently active, new member and giving quality, minus reports. Daily rhythm, social energy, relationship goals and post categories are no longer used, and the relationship-goal dealbreaker no longer hides anyone.
- **Reports on posts, perspectives and messages** now count against the person, like reports on their profile.
- Seed data: everyone opened the app yesterday. (Sections 2, 9, 12.2, 14.1, 16, 17, 18; ADR-018.)

### 2026-10-20: beta decisions written down (no app change)
- The product owner decided the beta model: a private goal question, one audience setting, optional private orientation, new daily-set and ranking rules, beta caps, holds and admin-decided bans with appeals (`docs/PRODUCT.md`, `docs/SECURITY.md`, `docs/BETA_PLAN.md`, ADR-018 and ADR-019). Nothing in the app has changed yet, so section 17 lists what the code still does differently.

### 2026-10-19: the boost slot no longer piles onto one person
- The boost used to be the single profile with the fewest perspectives, so everyone opening the app the same morning got the same person. It now also counts the sets a person is already in today, picks at random (fixed per person per day) among the few least-served with a small preference for shared interests, and stops at 6 sets per person per day.
- The boost only goes to someone who opened the app in the last 3 days or is new (under 48 hours), so givers don't write to people who have left.
- Reports now count **different people** in the last 30 days. A profile reported by 2 or more different people stays out of everyone's daily set. Before, one person reporting 5 times gave the full penalty, and reported people could even be boosted.
- New settings in section 2. (Sections 9.3, 9.5, 9.6, 9.7, 9.10, 14.1; ADR-017.)

### 2026-10-18: this file was created
- Written from the code as it stands, so the product owner can see how the app behaves without asking. From now on it is updated with every change (section 21 and `CLAUDE.md`).

### 2026-10-18: both people must give before a connection opens
- To accept a connect request, the person accepting must first give the asker a perspective. Ticking the connect switch while giving to someone who already asked **accepts their request in one step**. The Inbox card and the profile say what is needed. The chat shows both perspectives. (Sections 12, 13.3; ADR-016.)

### 2026-10-18: the connected moment, chat ideas, quiet connections, 11 categories
- New "You're connected" moment with chime, vibration and motion; the keyboard opens in the new chat; unseen connections are picked up on open, on return, and every 15 seconds.
- Idea cards in an empty chat, by post category and role (hard-coded).
- Quiet connections close on their own (rules in 13.4) and a closed connection shows a calm screen.
- Post categories grew from 6 to 11 with new focus areas and hints.
- Explore hides posts you already answered when a profile returns.
- A missing database migration from the previous push was added. (ADR-015.)

### 2026-10-17: new onboarding and matching (by Bharath)
- Six-step onboarding (about you, who to meet, interests, rhythm, personality, review) and a richer profile editor with photo grid, voice and written posts, reordering, live preview.
- New matching score (interests, relationship goals, post categories, lifestyle) used to rank profiles; relationship goals can hide people when a dealbreaker is on. Flagged as conflicting with the product rules (section 17).

### 2026-10-16: the core loop
- Sign-up with age gate and rotating sign-in, profiles with up to 6 posts, audience, daily set with a boost slot, perspectives with hints and chips, locked Inbox that unlocks after the daily give, helpful/not-helpful feedback, asking to connect (gated on a perspective), accept/decline with a 14-day cooldown, chat, report, block, account deletion, safe signed media links.
- Upgrade to Expo SDK 58 (app libraries only; no change to behavior).

---

## 21. How to keep this file up to date (mandatory)

This rule applies to **everyone and every AI agent**, including Bharath's.

**When to update:** after every successful build, every feature, every change to a rule, number, message or screen flow, and every bug fix that changes what a person experiences. If in doubt, update.

**What to do, in the same commit as the change:**
1. Edit the section that describes the behavior. Write in plain words a non-programmer can follow. Keep the tags ([Built], [Placeholder], [Not built], [Conflict]) accurate.
2. If a number or setting changed, update section 2.
3. If a limit, error or message changed, update section 18.
4. If something fake became real (or a gap closed), update section 17.
5. Add a dated entry at the top of the change log (section 20), saying what changed and why in one or two sentences.
6. Update **"Last updated"** at the top.
7. If the change disagrees with `docs/PRODUCT.md`, add it to the conflicts list (section 17) and tell the product owner. Do not change `docs/PRODUCT.md` without the owner's approval.

**What not to do:** do not delete sections for things not built yet (mark them [Not built]); do not describe planned behavior as built; do not leave this file for "later".

**Checks:** the pull request template and the sync manifest both have a tick box for this. A change is not finished until this file is updated.
