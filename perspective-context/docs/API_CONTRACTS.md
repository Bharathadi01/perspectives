# API Contracts

## Authority
`packages/contracts` (Zod) is the single source of request/response types. The API validates every body with these schemas, and `packages/api-client` is a typed HTTP client that validates every response against the same schemas, so drift fails loudly at runtime and in typecheck. Swagger at `/docs` lists the routes, but its schemas are not generated from Zod yet (add `zod-to-openapi` or similar when an OpenAPI document becomes a deliverable).

## Conventions
- Prefix `/v1`.
- UUID/opaque IDs; IDs never replace authorization.
- ISO-8601 UTC timestamps.
- Cursor pagination, not offset pagination for feeds/messages.
- Explicit request/response DTOs with unknown fields rejected.
- Mutations that may retry accept `Idempotency-Key`.

## Error envelope
```json
{
  "error": {
    "code": "POST_NOT_ELIGIBLE",
    "message": "This post is no longer available.",
    "requestId": "trace-id",
    "details": null
  }
}
```
Client branches on stable `code`, not human `message`.

Error codes are the `ErrorCode` enum in `packages/contracts/src/error.ts`. Notable business codes: `PERSPECTIVE_REQUIRED_BEFORE_CONNECT` (the gate), `CONNECT_COOLDOWN_ACTIVE` (with `details.availableAt`), `CONNECT_REQUEST_PENDING`, `ALREADY_CONNECTED`, `CONNECTION_CLOSED` (a quiet connection closed on its own), `ALREADY_SUBMITTED`, `DAILY_UNLOCK_INCOMPLETE`, `SELFIE_VERIFICATION_REQUIRED`, `PROFILE_INCOMPLETE`, `PRIMARY_POST_REQUIRED`, `POST_LIMIT_REACHED`, `POST_NOT_ELIGIBLE`, `PROFILE_NOT_ELIGIBLE`, `BLOCKED_PAIR`, `MODERATION_FAILED`, `CAP_REACHED`, `IDEMPOTENCY_KEY_REQUIRED`. There are no intent or mode codes.

## Endpoints (implemented)
Every authenticated mutation needs an `Idempotency-Key` header (UUID); a retry with the same key returns the stored result.

**Auth (public):** `POST /v1/auth/signup` (email, password, birthDate, acceptTerms; 18+ enforced) · `POST /v1/auth/login` · `POST /v1/auth/refresh` (rotating; reuse revokes the family) · `POST /v1/auth/logout`

**Me and posts:** `GET /v1/me` · `PATCH /v1/me` (basics, audience) · `POST /v1/me/selfie-verification` (`mediaId`) · `POST /v1/me/posts` · `PATCH /v1/me/posts/:id` · `DELETE /v1/me/posts/:id`

**Media:** `POST /v1/media` (base64 JSON body: photo, or audio with `durationSec` ≤ 15) · `GET /v1/media/:id/content?exp&sig` (public but only via short-lived signed URLs placed in DTOs; selfie media is never served)

**Explore (live profile required):** `GET /v1/explore` (daily status, one card, remaining batch) · `POST /v1/explore/skip` (`profileId`)

**Profiles:** `GET /v1/profiles/:id` (public profile, relationship state for the Connect bar, posts already answered)

**Perspectives and inbox:** `POST /v1/perspectives` (`postId`, `comment`, `chips`, `connect`) · `GET /v1/perspectives/given` · `POST /v1/perspectives/:id/feedback` (`helpful` / `not_helpful` + reason, `thankPrivately`) · `GET /v1/inbox` (daily status, `lockedCount`, perspectives grouped by post, incoming connect requests)

**Connect and chat:** `POST /v1/connect-requests` (`receiverId`) · `POST /v1/connect-requests/:id/accept` · `POST /v1/connect-requests/:id/decline` · `GET /v1/connections` · `GET /v1/connections/:id/messages` (latest 200; cursor pagination is a follow-up) · `POST /v1/connections/:id/messages` · `DELETE /v1/connections/:id` (unmatch) · `GET /v1/connections/unseen` (new connections the viewer has not seen the connected moment for) · `POST /v1/connections/seen` (`connectionIds`; marks only the viewer's own side, safe to repeat)

Each `Connection` carries `origin.postCategory` (picks the conversation ideas), `connectedAt` (resets on reconnect), `isNew`, `expiry` (`ok`, `remind`, `you_owe_reply` with `closesAt`, or `waiting`; the person who wrote first only ever gets `waiting`) and `closedReason`. Opening a chat (`GET .../messages`) counts as seeing the connected moment and starts the first-reply clock for the person who owes a reply. A connection that closed because it went quiet answers `CONNECTION_CLOSED` (410) with `details.reason`.

**Safety:** `POST /v1/reports` · `POST /v1/blocks/:userId` · `DELETE /v1/blocks/:userId` · `POST /v1/account/deletion` (password + `DELETE MY ACCOUNT`)

**Health:** `GET /health` (public)

No endpoint has connection-intent or connection-mode fields.

## Realtime
v1 chat is polled (`GET /v1/connections/:id/messages` every few seconds); PostgreSQL is canonical. When Socket.IO is added: the socket handshake authenticates independently. Joining a connection room rechecks active membership and block status. Sending a message rechecks authorization; room membership alone is insufficient.
