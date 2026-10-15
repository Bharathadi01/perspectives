# API Contracts

## Authority
NestJS DTOs generate OpenAPI. `packages/api-client` is generated and never manually edited. CI fails on OpenAPI/client drift.

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

Business error codes the contract must define (names are indicative, final names are set in `@perspective/contracts`): post not eligible, blocked pair, perspective-required-before-connect (the gate), connect cooldown active, already submitted, daily unlock not complete, selfie verification required, moderation failed, rate limited, and the usual unauthorized, forbidden, not found, and internal errors. Mutual-intent error codes belong to the removed intent model and should be dropped.

## P0 endpoints
The endpoint list follows `PRODUCT.md`. Paths below are the target; the skeleton's paths differ.
- `POST /v1/auth/*`
- `POST /v1/me/selfie-verification`
- `GET/PATCH /v1/me` (basics, audience)
- `POST /v1/media/sign` (photo and 15-second audio uploads)
- `POST/GET/PATCH/DELETE /v1/me/posts` (1 to 6 posts)
- `GET /v1/explore` (the daily batch, starting with the mandatory set)
- `POST /v1/posts/:id/skip`
- `POST /v1/posts/:id/perspectives` (required comment, optional chips; optional connect flag)
- `GET /v1/inbox` (received perspectives, locked until the daily unlock, plus incoming connect requests)
- `POST /v1/perspectives/:id/feedback` (helpful, not helpful with reason, thank privately)
- `POST /v1/connect-requests` (requires a prior perspective to the receiver)
- `POST /v1/connect-requests/:id/accept`
- `POST /v1/connect-requests/:id/decline`
- `GET /v1/connections`
- `GET /v1/connections/:id/messages`
- `POST /v1/reports`
- `POST/DELETE /v1/blocks/:userId`
- `POST /v1/account/deletion`

There are no connection-intent or connection-mode fields on any endpoint.

## Realtime
Socket handshake authenticates independently. Joining a connection room rechecks active membership and block status. Sending a message rechecks authorization; room membership alone is insufficient.
