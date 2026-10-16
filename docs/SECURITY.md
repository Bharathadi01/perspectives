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
Terms acceptance before creation; age gate; selfie verification; machine and human moderation before delivery for text, photos, and audio; report profile/post/perspective/message/user; immediate local hide; block from every person/UGC surface; enforcement ladder; appeals; published safety contact; audited moderator actions.

Perspectives are honest and unfiltered, so criticism is allowed. Moderation targets abuse, not disagreement. Because the daily give-to-get rule assigns profiles that users did not pick themselves (always within their own filters, blocks, and mutes), report and block must be one tap away on every profile and every perspective.

Connect requests carry a perspective, and the receiver sees it before deciding. A hostile perspective attached to a connect request can be declined and reported.

## Prohibited v1 content
Nudity and sexual content, minors in evaluation contexts, body shaming, degrading or abusive comments, threats, hate, harassment, doxxing, scams, impersonation, deceptive synthetic likeness, self-harm encouragement, eating-disorder encouragement, public attractiveness ranking, and non-consensual private media.

Allowed: shirtless, gym, and swimwear photos.

## Logging
Never log access/refresh tokens, authorization headers, message/perspective bodies, phone, email, exact birthday, precise location, signed media URLs, or raw moderation evidence. Use request IDs and redacted structured events.

## Deletion
Immediately hide account; revoke sessions/device tokens; enqueue idempotent deletion; delete/anonymize product records and media; retain only narrowly justified safety/legal records under documented access and retention; record job status without private content.

## Release gate
Authorization integration tests; dependency and secret scanning; backup restoration rehearsal; tested deletion; report/block available everywhere; moderator owner and SLA; incident runbook; privacy/store disclosures; no sensitive production logs.
