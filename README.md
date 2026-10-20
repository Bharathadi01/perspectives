# Perspective

> **“See yourself through other people’s eyes—and connect through what you notice.”**

Perspective is an 18+ app where selfie-verified users give each other honest, text-only perspectives on how they look, dress, sound, and show up, and can then connect. It is a dating app at its core with a unique hook (perspectives), marketed perspectives-first, and open Connect also serves friends, gym buddies, and networking.

Each profile has basics plus 1 to 6 **posts** (a photo or a 15-second audio clip with a prompt or question). Each day, users give perspectives on a mandatory set of profiles to unlock the perspectives they received. You can ask to connect with someone only after giving them a perspective; they accept or decline; chat opens only on accept.

The business rules we want live in [`docs/PRODUCT.md`](docs/PRODUCT.md) and win over any other doc. What the app actually does today, in plain words, is in [`business-logic/BUSINESS_LOGIC.md`](business-logic/BUSINESS_LOGIC.md); it must be updated after every change.

---

## Stack

**Built and used now:** pnpm workspaces and TypeScript; Expo SDK 58 with Expo Router, TanStack Query, Zustand, React Hook Form + Zod (run in Expo Go); NestJS 10 with Zod validation, Swagger, JWT auth; PostgreSQL 16 with Prisma 6; local-disk media, polled chat, and stub moderation and selfie verification.

**Planned, added by ADR when needed:** Cloudinary media, pg-boss jobs, Socket.IO chat, a moderation and liveness vendor, Redis (only with several API instances), pgvector, the FastAPI service, Development Builds.

The full table, with triggers, is in [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) → Stack (ADR-013). It wins over any other stack mention.

---

## Monorepo Structure

```text
├── apps/
│   ├── mobile/         # Expo React Native mobile client (5-tab shell, design system)
│   ├── admin/          # Admin dashboard, web only (review list, bans, appeals); never in the mobile app
│   ├── api/            # NestJS modular monolith with REST & Swagger OpenAPI
│   └── ai-service/     # FastAPI skeleton, not wired in v1
├── packages/
│   ├── contracts/      # Zod validation schemas & shared TypeScript interfaces
│   ├── design-tokens/  # Warm editorial design system tokens (colors, radius, spacing)
│   ├── api-client/     # Typed HTTP client, validated against the contracts
│   └── config/         # Shared TypeScript base configuration
├── docs/               # Architecture, Product, Database, Security & Blueprint docs
├── perspective-context/# Context pack that mirrors docs/ (keep in sync; docs/PRODUCT.md wins)
├── docker-compose.yml  # Optional local PostgreSQL (Homebrew works too)
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
pnpm --filter @perspective/admin web  # admin dashboard on http://localhost:8082
```

**Admin sign-in.** In development, sign in on the admin page as `admin@perspective.test` / `perspective123` (created by `pnpm db:seed`; the 6-digit code is switched off for now with `ADMIN_REQUIRE_CODE=false`). Admins are not app accounts. On a real server, create one with `pnpm admin:create -- --email you@example.com` (add `--reset` for a new password and secret). It prints a password and an authenticator secret once: add the secret (or the `otpauth://` link) to an authenticator app such as Google Authenticator or 1Password, then sign in on the admin page with the email, the password and the 6-digit code.
Seed logins: `ravi@`, `meera@`, `asha@`, `kabir@`, `nisha@`, `priya@`, `arjun@perspective.test` (password `perspective123`). Ravi starts with yesterday's perspectives visible, one locked perspective plus a connect request from Priya, and a connection with Asha.

### iOS Simulator (Xcode 27)
Xcode 27 no longer includes a separate Simulator app (it's in `DeviceHub`), so `expo start --ios` can't auto-launch it. Install Expo Go into the simulator by hand (the SDK 58 build works on iOS 27).
```bash
xcrun simctl list devices available            # pick an iPhone, for example "iPhone 17" under iOS 27.0
xcrun simctl boot <device-id>
# one-time: install Expo Go 58.0.4 (SDK 58) into the simulator
curl -L -o expogo.tar.gz https://github.com/expo/expo-go-releases/releases/download/Expo-Go-58.0.4/Expo-Go-58.0.4.tar.gz
mkdir "Expo Go.app" && tar -xzf expogo.tar.gz -C "Expo Go.app" && xcrun simctl install <device-id> "Expo Go.app"
# every time: start the servers, then open the app in the simulator
pnpm dev:api
EXPO_PUBLIC_API_URL=http://localhost:3000 pnpm dev:mobile
xcrun simctl openurl <device-id> exp://localhost:8081   # then tap Open; view the device in Xcode's DeviceHub app
```
The simulator has no camera, so the selfie step needs a real phone (on web and the simulator it falls back to choosing a photo).

On a phone with Expo Go (the App Store version supports SDK 57 until Expo ships the SDK 58 build; until then use a development build), set `EXPO_PUBLIC_API_URL=http://<your-computer-LAN-IP>:3000` before `pnpm dev:mobile` so the phone can reach the API.

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
