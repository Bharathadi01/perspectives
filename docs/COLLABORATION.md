# Collaboration

## Stable ownership
- Developer A: mobile/product lead—Expo, screens, design system, accessibility, mobile tests.
- Developer B: backend/data/security lead—NestJS, Prisma, auth, policies, jobs, media, API tests.
- Shared changes require review: OpenAPI, database, design tokens, security policy, analytics, dependencies, CI, CLAUDE.md.

## Contract-first sequence
1. Merge feature brief and acceptance criteria.
2. Agree state machine and error codes.
3. Merge API DTO/OpenAPI and fixture contract.
4. Generate client.
5. Split mobile/backend implementation.
6. Integrate and run end-to-end acceptance test.

## Worktrees and agents
Each developer uses a separate Git worktree and one Claude session per issue. Every agent receives exact allowed paths, forbidden shared paths, contract version, acceptance criteria, and required tests. Never assign the same function or shared file to two agents.

## Single-writer files
`pnpm-lock.yaml`, Prisma schema/migrations, generated client, contracts, design tokens, `.env.example`, CI, and CLAUDE.md. Declare owner/branch in `docs/ACTIVE_CHANGES.md` before editing.

## Branches
`feat/<issue>-<scope>`, `fix/<issue>-<scope>`, `chore/<issue>-<scope>`. Branches are short-lived, rebased before review, and never contain unrelated cleanup.

## PR gate
One issue; human review; current main; format; lint; typecheck; tests; OpenAPI drift; migration validation; dependency audit; secret scan. Schema/contract/security changes require the other developer’s approval.

## Conflict rules
- Do not resolve generated-client conflicts manually; regenerate from merged OpenAPI.
- Do not edit old migrations to resolve conflicts; create a reviewed forward migration.
- Do not accept both competing dependencies; choose one in an ADR.
- Do not silently rename DTO fields; version or coordinate the contract.
- If docs and code disagree, stop and fix the source-of-truth document before continuing.

## Claude task prompt
```text
Read CLAUDE.md and required docs.
Issue: <ID/title>
Owner: <developer>
Allowed files: <paths>
Forbidden shared files: <paths>
Merged dependencies: <commits/PRs>
Acceptance criteria: <Given/When/Then>
Contract version: <hash>
Schema impact: none | approved migration
Security/design impacts: <details>
Tests: <list>

Before editing, report conflicts or missing decisions. Do not invent fields, endpoints, enums, dependencies, variables, tables, or shared components. Stop and propose an ADR/contract change if required. After implementation run all required checks and return changed files, commands/results, assumptions, and risks. Do not start adjacent work.
```
