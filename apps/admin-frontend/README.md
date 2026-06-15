# Admin frontend

Authenticated Next.js operations desk for provincial staff — projects, budget, progress, approvals, and reports.

| | |
|---|---|
| **Package** | `@workspace/admin-frontend` |
| **Port (native)** | `3001` |
| **Docker URL** | `https://admin.cppms.local` |
| **Auth** | PocketBase admin session — `/login` gate |

## Routes

| Path | Module |
|---|---|
| `/login` | Admin sign-in |
| `/dashboard` | KPI cards, widgets, deadline heatmap |
| `/projects` | CRUD, filters, status popover |
| `/budget` | Summary, breakdown, transaction tabs, Excel export |
| `/progress` | Summary, list, side detail, photo updates |
| `/approvals` | Queue, tabs, detail panel with carousel |
| `/reports` | Filters, tab cards, four report tables, Excel export |

## Stack

- Next.js 16 (App Router)
- `@workspace/ui` — shared shadcn + design tokens
- `@workspace/pocketbase` — client, Zod schemas, realtime
- `xlsx` — admin-only spreadsheet export
- Vitest + Testing Library + journey tests

## Development

```bash
# from repo root
bun run dev --filter=@workspace/admin-frontend

# or from this directory
bun run dev
```

Credentials: `POCKETBASE_ADMIN_EMAIL` / `POCKETBASE_ADMIN_PASSWORD` in `.env.local`.

### Docker

```bash
bun run docker:dev           # repo root
bun run seed:dev:docker      # optional demo data
```

## Auth

`AuthGuard` wraps the `(app)` layout. Unauthenticated users redirect to `/login`. Session uses the shared PocketBase client in `lib/auth.tsx`.

## Testing

```bash
bun run test
```

Coverage includes module components, auth guard, login form, design audit, and journey tests (`j1`–`j5`) for login, guard, public read-only checks, create project, and approve flows.

## Related

- [Root README](../../README.md)
- [Public frontend](../public-frontend/README.md)
- [PocketBase package](../../packages/pocketbase/README.md)
- [Layout wireframes](../../wireframes/admin/README.md)
