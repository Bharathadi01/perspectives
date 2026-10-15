# Perspective

> **“See yourself through other people’s eyes—and connect through what you notice.”**

Perspective is an 18+ app where selfie-verified users give each other honest, text-only perspectives on how they look, dress, sound, and show up, and can then connect. It is a dating app at its core with a unique hook (perspectives), marketed perspectives-first, and open Connect also serves friends, gym buddies, and networking.

Each profile has basics plus 1 to 6 **posts** (a photo or a 15-second audio clip with a prompt or question). Each day, users give perspectives on a mandatory set of profiles to unlock the perspectives they received. You can ask to connect with someone only after giving them a perspective; they accept or decline; chat opens only on accept.

The business rules live in [`docs/PRODUCT.md`](docs/PRODUCT.md) and win over any other doc.

---

## Authoritative v1 Stack

- **Mobile**: React Native, Expo (SDK 52+), TypeScript, Expo Router, TanStack Query, Zustand, React Hook Form + Zod.
- **Backend API**: Modular NestJS monolith, TypeScript, REST/OpenAPI, Socket.IO.
- **Database**: PostgreSQL with `pgvector` for canonical relational data and vector similarity.
- **Cache & Queues**: Redis & BullMQ for rate limits, caching, and durable jobs.
- **Media**: Signed Cloudinary media workflows.
- **AI/ML Service**: Isolated Python/FastAPI service for vision, embeddings, and moderation adapters.
- **Monorepo**: `pnpm` workspaces.

---

## Monorepo Structure

```text
├── apps/
│   ├── mobile/         # Expo React Native mobile client (5-tab shell, design system)
│   ├── api/            # NestJS modular monolith with REST & Swagger OpenAPI
│   └── ai-service/     # FastAPI service for AI moderation & embeddings
├── packages/
│   ├── contracts/      # Zod validation schemas & shared TypeScript interfaces
│   ├── design-tokens/  # Warm editorial design system tokens (colors, radius, spacing)
│   ├── api-client/     # Typed HTTP client, validated against the contracts
│   └── config/         # Shared TypeScript base configuration
├── docs/               # Architecture, Product, Database, Security & Blueprint docs
├── perspective-context/# Context pack that mirrors docs/ (keep in sync; docs/PRODUCT.md wins)
├── docker-compose.yml  # Local PostgreSQL (pgvector) & Redis infrastructure
└── pnpm-workspace.yaml
```

---

## Quick Start & Local Development

### 1. Prerequisites
- Node.js >= 20 and pnpm (`corepack enable pnpm`)
- PostgreSQL 16, either `brew install postgresql@16 && brew services start postgresql@16`, or `docker compose up -d postgres`

### 2. Database and environment
```bash
# Local role and databases (Homebrew Postgres; skip if you use docker compose and adjust DATABASE_URL)
psql -d postgres -c "CREATE ROLE perspective LOGIN PASSWORD 'perspective' CREATEDB"
createdb -O perspective perspective && createdb -O perspective perspective_test

cp .env.example apps/api/.env      # then replace the three secrets
pnpm install
pnpm build                          # builds tokens, contracts, api-client, api
pnpm db:migrate                     # applies prisma/migrations
pnpm db:seed                        # 7 verified test users, password: perspective123
```

### 3. Run
```bash
pnpm dev:api                        # http://localhost:3000 (Swagger at /docs)
pnpm dev:mobile                     # Expo; press w for web, or scan the QR code with Expo Go
```
Seed logins: `ravi@`, `meera@`, `asha@`, `kabir@`, `nisha@`, `priya@`, `arjun@perspective.test` (password `perspective123`). Ravi starts with yesterday's perspectives visible, one locked perspective plus a connect request from Priya, and a connection with Asha.

On a phone with Expo Go, set `EXPO_PUBLIC_API_URL=http://<your-computer-LAN-IP>:3000` before `pnpm dev:mobile` so the phone can reach the API.

### 4. Tests
```bash
pnpm test        # unit tests (contracts, domain rules, api-client, mobile helpers)
pnpm test:e2e    # API end-to-end tests against the perspective_test database
```

---

## Architecture Principles & Guardrails

1. **Specific beats generic**: Every post must include a clear question.
2. **Context beats score**: No public attractiveness scores, popularity leaderboards, or follower counts.
3. **Mutuality before chat**: Connect is open and unlabeled. You can ask to connect only after giving the other person a perspective, and private chat opens only when they accept.
4. **Give to get**: A daily mandatory set of perspectives unlocks the ones you received, and no profile is left without perspectives.
5. **Safety & DPDP**: 3-tap reporting, instant bidirectional blocking, and in-app DPDP-compliant account deletion.
