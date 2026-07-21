# Cagayan Provincial Project Monitoring System

> Public read-only project transparency plus authenticated admin tools for tracking, budget, progress, and approvals.

![Cagayan PPMS public home shown in browser](https://raw.githubusercontent.com/bakajieyan/cppms/master/docs/screenshots/public-home.png)

[![Bun](https://img.shields.io/badge/Bun-1.3+-000?style=flat&logo=bun&logoColor=white)](https://bun.sh)
[![Node](https://img.shields.io/badge/Node-%3E%3D20-339933?style=flat&logo=node.js&logoColor=white)](https://nodejs.org)
[![Next.js](https://img.shields.io/badge/Next.js-16-000?style=flat&logo=next.js&logoColor=white)](https://nextjs.org)
[![PocketBase](https://img.shields.io/badge/PocketBase-backend-B8DBE4?style=flat)](https://pocketbase.io)
[![Turborepo](https://img.shields.io/badge/Turborepo-monorepo-EF4444?style=flat&logo=turborepo&logoColor=white)](https://turbo.build)

**[Public site](https://public.cppms.local)** · **[Admin portal](https://admin.cppms.local)** · **[Docker setup](docs/specs/local-dev-docker.md)** · **[Report a bug](https://github.com/bakajieyan/cppms/issues)**

---

## Table of contents

- [About](#about)
- [Features](#features)
- [Architecture](#architecture)
- [Quick start](#quick-start)
- [Development](#development)
- [Workspace packages](#workspace-packages)
- [UI components](#ui-components)
- [Testing](#testing)
- [Contributing](#contributing)

## About

CPPMS helps citizens and partners browse provincial project status, budgets, progress, and reports without logging in. Provincial staff use the admin portal for daily CRUD on projects, budget entries, progress photos, and completion approvals.

| Audience | Goal |
|---|---|
| **Public** | Find authoritative project facts fast — read-only, no export |
| **Admin** | Update records with minimal friction — desktop-first operations desk |

## Features

**Public (`apps/public-frontend`)**

- Landing hero with project carousel and admin portal preview
- Read-only modules: projects, budget, progress, reports
- PocketBase realtime with Live status pill
- Dark/light theme toggle (keyboard shortcut `d`)

**Admin (`apps/admin-frontend`)**

- Authenticated CRUD across projects, budget, progress, approvals, reports
- Dashboard with KPI cards and deadline heatmap
- Excel export (admin only)
- Shared UI, schemas, and realtime helpers from workspace packages

**Backend (`packages/pocketbase`)**

- PocketBase migrations, collection rules, and Zod schemas
- Shared client, realtime subscribe helper, and domain utilities
- Dev seed script for demo projects

## Architecture

```text
cppms/
├── apps/
│   ├── public-frontend/   # Next.js — port 3000 (read-only)
│   └── admin-frontend/    # Next.js — port 3001 (authenticated)
├── packages/
│   ├── pocketbase/        # API client, schemas, migrations, seed
│   ├── ui/                  # shadcn/ui + design tokens
│   ├── eslint-config/       # shared ESLint presets
│   └── typescript-config/   # shared TS configs
├── docker/                  # Caddy reverse proxy config
└── docs/specs/              # operational specs (e.g. local Docker)
```

| Service | Local URL (Docker) | Native dev |
|---|---|---|
| Public frontend | `https://public.cppms.local` | `http://localhost:3000` |
| Admin frontend | `https://admin.cppms.local` | `http://localhost:3001` |
| PocketBase API | `https://pocketbase.cppms.local` | `http://localhost:8090` |

Stack: **Bun** workspaces · **Turborepo** pipelines · **Next.js 16** · **PocketBase** · **Zod 4** · **Vitest** · **shadcn/ui**

## Quick start

### Prerequisites

- [Bun](https://bun.sh) 1.3+ (package manager)
- [Docker](https://docs.docker.com/get-docker/) (recommended local stack)
- Node.js 20+ (engines requirement)

### 1. Clone and install

```bash
git clone https://github.com/bakajieyan/cppms.git
cd cppms
bun install
```

### 2. Configure environment

```bash
cp .env.sample .env.local
```

Edit `.env.local` — at minimum set `POCKETBASE_ADMIN_PASSWORD` and review `DOMAIN`.

### 3. Add hosts entries

```text
127.0.0.1 public.cppms.local admin.cppms.local pocketbase.cppms.local
```

On Windows: `C:\Windows\System32\drivers\etc\hosts`  
On macOS/Linux: `/etc/hosts`

### 4. Start the Docker stack

```bash
bun run docker:dev
```

Open:

- Public — https://public.cppms.local
- Admin — https://admin.cppms.local (credentials from `.env.local`)
- PocketBase — https://pocketbase.cppms.local

### 5. Seed demo data (optional)

```bash
bun run seed:docker:dev
# or, with PocketBase reachable from the host:
bun run seed:dev
```

Force-replace demo rows: `seed:dev:force`, `seed:docker:dev:force`, `seed:docker:prod:force`.

Against a running `docker:prod` stack:

```bash
bun run seed:docker:prod
bun run seed:docker:prod:force
```

Full Docker details: [docs/specs/local-dev-docker.md](docs/specs/local-dev-docker.md)

## Development

### Root scripts

Convention: `docker:<env>:…` and `seed:docker:<env>:…` where `<env>` is `dev` or `prod`. Host demo seed stays `seed:dev`. Caddy log helpers are env-agnostic (`docker:caddy:logs*`).

| Command | Description |
|---|---|
| `bun run dev` | Start all apps via Turborepo |
| `bun run build` | Production build (all packages) |
| `bun run test` | Run Vitest across workspace |
| `bun run lint` | ESLint via Turborepo |
| `bun run typecheck` | TypeScript check |
| `bun run docker:dev` | Local Compose up (build) |
| `bun run docker:prod` | Prod Compose up (detached, recreate) |
| `bun run docker:dev:down` / `docker:prod:down` | Stop stack |
| `bun run docker:dev:clean-cache` | Clear `.next` in local frontend containers |
| `bun run seed:dev` | Host seed via `.env.local` |
| `bun run seed:docker:dev` / `seed:docker:prod` | Seed via Compose `seed` profile |
| `bun run seed:*:force` | Force-replace `Demo:` rows |

### Filter to one app

```bash
bun run dev --filter=@workspace/public-frontend
bun run dev --filter=@workspace/admin-frontend
bun run test --filter=@workspace/pocketbase
```

### Commit conventions

Commits are validated with [Conventional Commits](https://www.conventionalcommits.org/) via Husky + commitlint. Example:

```text
feat(public): add project filter chips
fix(pocketbase): parse budget expense dates
```

## Workspace packages

| Package | README |
|---|---|
| `@workspace/public-frontend` | [apps/public-frontend/README.md](apps/public-frontend/README.md) |
| `@workspace/admin-frontend` | [apps/admin-frontend/README.md](apps/admin-frontend/README.md) |
| `@workspace/pocketbase` | [packages/pocketbase/README.md](packages/pocketbase/README.md) |
| `@workspace/ui` | [packages/ui/README.md](packages/ui/README.md) |
| `@workspace/eslint-config` | [packages/eslint-config/README.md](packages/eslint-config/README.md) |
| `@workspace/typescript-config` | [packages/typescript-config/README.md](packages/typescript-config/README.md) |

Layout wireframes (ASCII): [wireframes/README.md](wireframes/README.md)

## UI components

Shared shadcn/ui components live in `packages/ui/src/components`.

Add a component from the repo root:

```bash
bunx shadcn@latest add button -c apps/public-frontend
```

Use in any app:

```tsx
import { Button } from "@workspace/ui/components/button"
```

See [packages/ui/README.md](packages/ui/README.md) for tokens and testing.

## Testing

- Runner: **Vitest** with Testing Library (no browser E2E runners)
- Pattern: unit tests for libs/hooks, component tests for pages, journey tests for critical admin/public flows
- Run all: `bun run test`
- Run one package: `bun run test --filter=@workspace/admin-frontend`

## Contributing

1. Fork and branch from `master`
2. Write or update tests for behavior changes
3. Use Conventional Commits (`feat`, `fix`, `chore`, …)
4. Open a pull request with a short test plan

Questions or bugs → [GitHub Issues](https://github.com/bakajieyan/cppms/issues)
