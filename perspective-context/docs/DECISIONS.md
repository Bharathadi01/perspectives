# Architecture Decisions

## ADR-001: Modular monolith
Status: accepted. One NestJS app with clear modules; extract only from measured need.

## ADR-002: PostgreSQL is canonical
Status: accepted. Product truth, audit state, idempotency, and initial jobs reside in PostgreSQL.

## ADR-003: Cloudinary for v1 media
Status: accepted. Do not carry both S3 and Cloudinary during v1.

## ADR-004: Deferred complexity
Status: accepted. Redis, FastAPI, custom ML, active pgvector ranking, microservices, and Turborepo require a new ADR with evidence.

## ADR template
- ID/title
- Status: proposed/accepted/superseded
- Context
- Decision
- Consequences
- Alternatives
- Activation/rollback criteria
- Owners/date
