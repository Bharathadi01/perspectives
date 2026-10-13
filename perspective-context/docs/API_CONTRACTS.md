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
    "code": "REQUEST_NOT_ELIGIBLE",
    "message": "This request is no longer available.",
    "requestId": "trace-id",
    "details": null
  }
}
```
Client branches on stable `code`, not human `message`.

## P0 endpoints
- `POST /v1/auth/*`
- `GET/PATCH /v1/me`
- `POST /v1/media/sign`
- `POST/GET/PATCH /v1/requests`
- `GET /v1/explore`
- `POST /v1/requests/:id/skip`
- `POST /v1/requests/:id/responses`
- `GET /v1/inbox`
- `POST /v1/responses/:id/feedback`
- `POST /v1/connection-interests`
- `GET /v1/connections`
- `GET /v1/connections/:id/messages`
- `POST /v1/reports`
- `POST/DELETE /v1/blocks/:userId`
- `POST /v1/account/deletion`

## Realtime
Socket handshake authenticates independently. Joining a connection room rechecks active membership and block status. Sending a message rechecks authorization; room membership alone is insufficient.
