# `@workspace/pocketbase`

PocketBase backend package: migrations, collection rules, Zod schemas, client helpers, and dev seed data for CPPMS.

## Contents

| Path | Purpose |
|---|---|
| `pb_migrations/` | PocketBase collection migrations |
| `pb_hooks/` | Server-side hooks (extend here) |
| `schema/manifest.ts` | Collection/field manifest (source of truth) |
| `src/schemas/` | Zod parsers for records and forms |
| `src/domain/` | Budget, progress, project, and report utilities |
| `src/client.ts` | Browser-safe PocketBase client factory |
| `src/realtime.ts` | `subscribe` helper with reconnect on focus |
| `scripts/seed-dev.ts` | Demo data seeder |

## Install (workspace)

Already linked in apps via `workspace:*`. Import from the package root or subpaths:

```ts
import { createPocketBaseClient } from "@workspace/pocketbase/client"
import { projectRecordSchema } from "@workspace/pocketbase/schemas"
import { formatCurrency } from "@workspace/pocketbase/domain/format-currency"
```

### Export map

| Subpath | Module |
|---|---|
| `@workspace/pocketbase` | `src/index.ts` |
| `@workspace/pocketbase/client` | Client factory |
| `@workspace/pocketbase/realtime` | Realtime subscribe |
| `@workspace/pocketbase/schemas` | Zod schemas |
| `@workspace/pocketbase/schema` | Collection manifest |
| `@workspace/pocketbase/domain/*` | Domain helpers |
| `@workspace/pocketbase/files` | File URL helpers |

## Local development

### Docker (recommended)

PocketBase runs inside `docker-compose.local.yml`. Migrations and hooks are bind-mounted from this package.

```bash
bun run docker:dev          # from repo root
bun run seed:dev:docker     # insert demo records
```

### Scripts

```bash
bun run test                # Vitest unit tests
bun run typecheck           # tsc --noEmit
bun run seed:dev            # seed against POCKETBASE_INTERNAL_URL / localhost
bun run seed:dev --force    # replace existing Demo: rows
```

Environment variables (see root `.env.sample`):

- `NEXT_PUBLIC_POCKETBASE_URL` — browser-facing API URL
- `POCKETBASE_INTERNAL_URL` — server-side URL inside Docker (`http://pocketbase:8090`)

## Validation

All PocketBase payloads are parsed with **Zod 4** at the app boundary:

- **Public apps** — `safeParse` on read; skip or fallback bad rows
- **Admin apps** — `safeParse` before `create` / `update`; surface `ZodError` to forms

Schemas live here only — do not duplicate enum unions in app code.

## Docker image

`Dockerfile` in this directory builds the PocketBase service used by local Compose. Production deployment patterns are documented in [docs/specs/local-dev-docker.md](../../docs/specs/local-dev-docker.md).

## Related

- [Root README](../../README.md)
- [Public frontend](../../apps/public-frontend/README.md)
- [Admin frontend](../../apps/admin-frontend/README.md)
