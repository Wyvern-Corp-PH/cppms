# local-dev-docker

## §G

Local dev stack: PocketBase + admin/public Next.js via `docker compose`; commitlint + semantic-release for release hygiene.

## §C

- Bun monorepo; workspace root = Docker build context for frontends.
- Frontends via Caddy: `https://public.{DOMAIN}`, `https://admin.{DOMAIN}`; PocketBase `https://pocketbase.{DOMAIN}`.
- Default `DOMAIN=cppms.local`; add hosts entries for `public`, `admin`, `pocketbase` subdomains.
- Browser `NEXT_PUBLIC_POCKETBASE_URL` → `https://pocketbase.{DOMAIN}` (not docker service DNS).
- `.env.local` = local secrets (gitignored); `.env.sample` = committed template.
- `bun run docker:dev` = `compose up --build` (no `--watch`; bind mounts + Next HMR).
- `.next` lives on bind mount (gitignored) — ⊥ named volume for frontends in dev (V69).
- `bun run docker:dev:clean-cache` = wipe `.next` in running frontend containers if routes 404.
- `bun run seed:dev` = insert demo PocketBase records (V70); `seed:dev:force` replaces `Demo:` rows.
- `bun run seed:docker:dev` / `seed:docker:prod` = same seed via Compose `seed` profile (`:force` variants use `SEED_ARGS=--force`).
- optional `bun run docker:dev:watch` = `compose watch pocketbase` (pb_hooks restart).
- Script naming: `docker:<env>:…`, `seed:docker:<env>:…` (`env` = `dev` \| `prod`); host seed = `seed:dev`.
- commitlint `@commitlint/*@21`; semantic-release `25.x`; husky `commit-msg` hook.

## §I

| surface | path |
|---|---|
| compose | `docker-compose.local.yml` |
| caddy | `docker/caddy/Caddyfile` |
| env template | `.env.sample` |
| env local | `.env.local` |
| commitlint | `commitlint.config.mjs` |
| semantic-release | `release.config.mjs` |
| pb image | `packages/pocketbase/Dockerfile` |
| admin image | `apps/admin-frontend/Dockerfile` |
| public image | `apps/public-frontend/Dockerfile` |

## §V

V1: `docker compose config` ! error with `.env.local` present.
V2: frontend Dockerfiles target Next.js `.next` (≠ Vite `dist/`).
V3: frontend build context = repo root; `bun.lock` at root.
V4: ∀ commit → commitlint conventional format passes.
V5: `semantic-release` dry-run ! crash on missing plugins.
V6: PocketBase `pb_migrations` & `pb_hooks` dirs exist (even if empty).
V7: `bun run docker:dev` exits 0; admin/public/pocketbase containers running.

## §T

| id | status | task | cites |
|---|---|---|---|
| T1 | x | `docker-compose.local.yml` — pb + caddy + admin + public dev services | V1,V6 |
| T2 | x | rewrite frontend Dockerfiles for Next monorepo | V2,V3 |
| T3 | x | `.env.local` + `.env.sample` + gitignore `!.env.sample` | V1 |
| T4 | x | commitlint 21 + husky commit-msg | V4 |
| T5 | x | semantic-release 25 + changelog/git plugins | V5 |
| T6 | x | root `.dockerignore` | V3 |
| T7 | x | verify `docker compose up --build` on host | V1,V2 |
| T8 | x | fix `docker:dev` script: drop global `--watch`; add `docker:dev:watch` | V7 |

## §B

| id | date | cause | fix |
|---|---|---|---|
| B1 | 2026-06-15 | `up --watch` w/o `develop` on all services → exit 1 | `docker:dev` = up only; `docker:dev:watch` pb optional | V7 |
