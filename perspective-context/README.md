# Perspective Context Pack

This is the shared source of truth for two developers and their separate Claude Code agents.

Read in this order:
1. `CLAUDE.md`
2. `docs/PRODUCT.md`
3. `docs/ARCHITECTURE.md`
4. The document relevant to the task
5. `docs/COLLABORATION.md`
6. `docs/DEVELOPMENT_PLAN.md`

Stack: see `docs/ARCHITECTURE.md` → "Stack: built now vs planned" (ADR-013). Built now: Expo + React Native, NestJS, PostgreSQL + Prisma, Zod contracts, pnpm workspaces. Everything else (Cloudinary, pg-boss, Socket.IO, Redis, pgvector, FastAPI, S3, Turborepo) is planned and activated by ADR.
