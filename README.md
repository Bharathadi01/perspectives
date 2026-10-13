# Perspective

> **“See yourself through other people’s eyes—and connect through what you notice.”**

Perspective is an 18+ structured human-feedback and mutual-connection application. Users create a **Perspective Request** (a photo, situation, idea, profile element, or decision with a specific question); qualified users give structured perspectives; compatible mutual intent can open a private connection.

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
│   ├── api-client/     # Typed client interface, mock adapter & authentic fixtures
│   └── config/         # Shared TypeScript base configuration
├── docs/               # Architecture, Product, Database, Security & Blueprint docs
├── perspective-context/# Upstream context pack source of truth
├── docker-compose.yml  # Local PostgreSQL (pgvector) & Redis infrastructure
└── pnpm-workspace.yaml
```

---

## Quick Start & Local Development

### 1. Prerequisites
- Node.js >= 20
- pnpm >= 10 (`corepack enable pnpm`)
- Docker & Docker Compose (for PostgreSQL & Redis)

### 2. Setup Dependencies
```bash
# Clone the repository
git clone https://github.com/Bharathadi01/perspectives.git
cd perspectives

# Install dependencies
pnpm install

# Build shared packages
pnpm build
```

### 3. Run Tests
```bash
# Run test suites across packages and apps
pnpm test
```

### 4. Run the Mobile App
```bash
# Start Expo development server
pnpm dev:mobile
```

### 5. Run the Backend API
```bash
# Start local Postgres + Redis
docker compose up -d

# Generate Prisma client
pnpm --filter @perspective/api prisma:generate

# Start NestJS in watch mode (Swagger at http://localhost:3000/docs)
pnpm dev:api
```

---

## Architecture Principles & Guardrails

1. **Specific beats generic**: Every post must include a clear question.
2. **Context beats score**: No public attractiveness scores, popularity leaderboards, or follower counts.
3. **Mutuality before chat**: Private conversations only unlock when both users share compatible mutual intent (`friends`, `collaborate`, `network`, `date`, `chat`).
4. **Safety & DPDP**: 3-tap reporting, instant bidirectional blocking, and in-app DPDP-compliant account deletion.
