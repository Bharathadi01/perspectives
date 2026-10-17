# Collaboration

## Ownership
Two developers, Bharath and Jana, each working with their own Claude agent. **Both work across the whole stack** (mobile, API, database, contracts). There is no fixed mobile-versus-backend split; ownership is per task or feature, and is declared in `docs/ACTIVE_CHANGES.md` for shared files.
- Shared changes require review by the other developer: contracts and API shape, database, design tokens, security policy, analytics, dependencies, CI, CLAUDE.md.
- The product owner is the final authority on business logic. `PRODUCT.md` is the source of truth.

## Contract-first sequence
1. Merge feature brief and acceptance criteria.
2. Agree state machine and error codes.
3. Merge the Zod contract in `packages/contracts` and its tests.
4. Rebuild contracts and the api-client.
5. Split mobile/backend implementation.
6. Integrate and run end-to-end acceptance test.

## Worktrees and agents
Each developer uses a separate Git worktree and one Claude session per issue. Every agent receives exact allowed paths, forbidden shared paths, contract version, acceptance criteria, and required tests. Never assign the same function or shared file to two agents.

## Single-writer files
`pnpm-lock.yaml`, Prisma schema/migrations, contracts, api-client, design tokens, `.env.example`, CI, and CLAUDE.md. Declare owner/branch in `docs/ACTIVE_CHANGES.md` before editing.

## Branches
Branches: `main` (released), `dev` (shared integration), `jana` and `bharath` (each developer's own branch). Work on your own branch, merge into `dev` by pull request reviewed by the other developer, and update `main` from `dev` by pull request. Short feature branches off your own branch are fine for large changes. Rebase only commits that nobody else has pulled. Branches never contain unrelated cleanup.

## PR gate
One issue; human review; current main; format; lint; typecheck; tests; contract drift (contracts and api-client rebuilt and typechecked); migration validation; dependency audit; secret scan. Schema/contract/security changes require the other developer’s approval.

## Conflict rules
- Do not hand-merge build output (`dist/`); rebuild contracts and api-client after merging.
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
