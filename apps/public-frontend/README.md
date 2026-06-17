# Public frontend

Read-only Next.js app for citizens, journalists, and partners to browse provincial project data.

| | |
|---|---|
| **Package** | `@workspace/public-frontend` |
| **Port (native)** | `3000` |
| **Docker URL** | `https://public.cppms.local` |
| **Auth** | None — all routes are public |

## Routes

| Path | Module |
|---|---|
| `/` | Landing — hero, carousel, accountability preview |
| `/projects` | Project cards with filters |

## Stack

- Next.js 16 (App Router)
- `@workspace/ui` — shadcn components + tokens
- `@workspace/pocketbase` — client, schemas, realtime
- `next-themes` — dark/light toggle in nav (hotkey `d`)
- Vitest + Testing Library

## Development

```bash
# from repo root
bun run dev --filter=@workspace/public-frontend

# or from this directory
bun run dev
```

Set `NEXT_PUBLIC_POCKETBASE_URL` in `.env.local` (see root `.env.sample`).

### Docker

Served by Caddy in the local stack:

```bash
bun run docker:dev    # repo root
```

## Realtime

Subscribes to PocketBase collections on mounted data modules. Shows a **Live** pill when connected; retries subscribe on window focus after disconnect.

Does not subscribe on routes that do not load live data.

## Testing

```bash
bun run test
```

Includes component tests (`public-landing`, `public-projects`, `public-shell`, `theme-toggle`, `live-pill`) and pocketbase client tests.

## Related

- [Root README](../../README.md)
- [Admin frontend](../admin-frontend/README.md)
- [Layout wireframes](../../wireframes/public/README.md)
