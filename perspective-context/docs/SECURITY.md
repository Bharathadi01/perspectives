# Security and Safety

## Baselines
Use OWASP MASVS for mobile and OWASP API Security Top 10 for API reviews.

## Authentication
Short-lived access tokens; rotating refresh-token families; store only refresh-token hashes/peppers server-side; revoke family on reuse; keep mobile secrets in OS secure storage; require recent authentication for account deletion and sensitive changes.

## Authorization
Every endpoint/event that receives an object ID loads the object and evaluates action-specific policy. UUID unpredictability is not authorization. Test owner, non-owner, blocked, suspended, deleted, moderator, and anonymous cases. Perspectives are visible only to the post owner and the giver. A connect request is allowed only from a user who has already given the receiver a perspective, and only outside the decline cooldown. Received perspectives are locked until the owner's daily unlock is complete.

## Media
Planned (Cloudinary, ADR-003): API issues short-lived signed Cloudinary upload instructions. Today, uploads go through the API to local disk and are served by short-lived HMAC-signed URLs. Constrain folder, type, size, count, duration (audio posts are capped at 15 seconds), and transformation. Use private/authenticated delivery where needed, remove metadata, moderate before activation, and verify webhook signatures and asset ownership.

## Verification
Selfie verification is required at profile creation. Only verified, 18+ users have an active profile. Verification media is private: never shown to other users, never in public DTOs, and kept only as long as the retention policy defined during implementation allows.

## UGC controls
Terms acceptance before creation; age gate; selfie verification; machine and human moderation before delivery for text, photos, and audio; report profile/post/perspective/message/user; immediate local hide; block from every person/UGC surface; enforcement ladder; appeals; published safety contact; audited moderator actions. The enforcement ladder is: keep out of daily sets (2 reporters), hold (3 reporters, or one serious report), then an admin decision (see Admin access and enforcement).

Perspectives are honest and unfiltered, so criticism is allowed. Moderation targets abuse, not disagreement. Because the daily give-to-get rule assigns profiles that users did not pick themselves (always within their own filters, blocks, and mutes), report and block must be one tap away on every profile and every perspective.

Connect requests carry a perspective, and the receiver sees it before deciding. A hostile perspective attached to a connect request can be declined and reported.

## Admin access and enforcement (decided 2026-10-20; not built yet)
**Why separate:** an admin power attached to a normal user account is the easiest thing to abuse. A stolen phone, a leaked password or one missed role check would give ban powers to whoever has it, and admin screens inside the mobile app would ship to every user's phone. So admin is a separate identity used from a separate web page.
- **Separate admin identities:** admin logins are not Perspective user accounts. They live in their own table with their own password hash. There is no sign-up and no way to create an admin from any app; admins are created by a command run on the server. Each admin has a role (`admin`); more roles later if needed.
- **Second factor:** a 6-digit code from an authenticator app at every admin sign-in (a new dependency, added to the stack table with its ADR when built).
- **Separate web page:** `apps/admin`, a web-only Expo Router project reusing `@perspective/contracts` and `@perspective/api-client`. It is never part of the mobile bundle.
- **Separate API surface:** all admin endpoints live under `/v1/admin/*`, behind an admin guard that accepts only an admin token (its own audience claim). User tokens never work there, and admin tokens never work on user routes. Admin sessions are short (about 8 hours, no long-lived refresh). Every admin endpoint is default-deny like the rest of the API.
- **Audit log:** every admin action (view of reported content, dismiss, ban, extend, restore, appeal decision) is recorded with the admin, time, target, action and reason. The log cannot be edited from the dashboard.
- **Before public launch:** rate limits on admin sign-in, allow-listing or a VPN for the admin page, and a named grievance contact.

**What the dashboard shows:**
- **Review queue:** everyone on hold or flagged, newest serious reports first, then appeals, then the rest. Each row shows the reason (serious report, 3 reporters, weak giver), the reports and marks with the reported content, and the person's history.
- **Actions:** dismiss (the hold is lifted), ban for 3 days, ban permanently, extend a ban, restore after an appeal. A reason is required and is shown to the person.
- **Appeals:** temporary and permanent bans can be appealed; open appeals are highlighted at the top.

**Holds and bans (rules in `PRODUCT.md` → Reports, holds and bans):** automatic steps only hold (keep out of daily sets, or hide while waiting for review). A ban is always an admin action. A suspended account has an end date and returns to active by itself when it passes. Banned and suspended people can sign in only to a screen showing the reason, end date and appeal form; their profile is hidden and chats are paused. Account deletion stays available to them. A permanent ban blocks the email from signing up again; only records needed for safety are kept.

## Prohibited v1 content
Nudity and sexual content, minors in evaluation contexts, body shaming, degrading or abusive comments, threats, hate, harassment, doxxing, scams, impersonation, deceptive synthetic likeness, self-harm encouragement, eating-disorder encouragement, public attractiveness ranking, and non-consensual private media.

Allowed: shirtless, gym, and swimwear photos.

## Logging
Never log access/refresh tokens, authorization headers, message/perspective bodies, phone, email, exact birthday, precise location, signed media URLs, or raw moderation evidence. Use request IDs and redacted structured events.

## Deletion
Immediately hide account; revoke sessions/device tokens; enqueue idempotent deletion; delete/anonymize product records and media; retain only narrowly justified safety/legal records under documented access and retention; record job status without private content.

## Release gate
Authorization integration tests; dependency and secret scanning; backup restoration rehearsal; tested deletion; report/block available everywhere; moderator owner and SLA; incident runbook; privacy/store disclosures; no sensitive production logs.
