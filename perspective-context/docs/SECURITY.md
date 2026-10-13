# Security and Safety

## Baselines
Use OWASP MASVS for mobile and OWASP API Security Top 10 for API reviews.

## Authentication
Short-lived access tokens; rotating refresh-token families; store only refresh-token hashes/peppers server-side; revoke family on reuse; keep mobile secrets in OS secure storage; require recent authentication for account deletion and sensitive changes.

## Authorization
Every endpoint/event that receives an object ID loads the object and evaluates action-specific policy. UUID unpredictability is not authorization. Test owner, non-owner, blocked, suspended, deleted, moderator, and anonymous cases.

## Media
API issues short-lived signed Cloudinary upload instructions. Constrain folder, type, size, count, and transformation. Use private/authenticated delivery where needed, remove metadata, moderate before activation, and verify webhook signatures and asset ownership.

## UGC controls
Terms acceptance before creation; age gate; machine and human moderation; report content/user/message; immediate local hide; block from every person/UGC surface; enforcement ladder; appeals; published safety contact; audited moderator actions.

## Prohibited v1 content
Pornographic/sexual requests, minors in evaluation contexts, threats, hate, harassment, doxxing, scams, impersonation, deceptive synthetic likeness, self-harm encouragement, eating-disorder encouragement, public attractiveness ranking, and non-consensual private media.

## Logging
Never log access/refresh tokens, authorization headers, message/response bodies, phone, email, exact birthday, precise location, signed media URLs, or raw moderation evidence. Use request IDs and redacted structured events.

## Deletion
Immediately hide account; revoke sessions/device tokens; enqueue idempotent deletion; delete/anonymize product records and media; retain only narrowly justified safety/legal records under documented access and retention; record job status without private content.

## Release gate
Authorization integration tests; dependency and secret scanning; backup restoration rehearsal; tested deletion; report/block available everywhere; moderator owner and SLA; incident runbook; privacy/store disclosures; no sensitive production logs.
