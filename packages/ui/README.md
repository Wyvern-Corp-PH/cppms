# `@workspace/ui`

Shared UI package for CPPMS: [shadcn/ui](https://ui.shadcn.com) components, Tailwind design tokens, and global styles used by both frontends.

## Structure

```text
packages/ui/
├── src/
│   ├── components/     # shadcn primitives (button, card, dialog, …)
│   └── styles/
│       ├── globals.css   # theme tokens (dark default, light inverse)
│       └── design-tokens.test.ts
└── vitest.config.ts
```

## Usage

Import components in any app:

```tsx
import { Button } from "@workspace/ui/components/button"
import { Card, CardHeader, CardTitle } from "@workspace/ui/components/card"
```

Global styles are pulled in by each app's `app/layout.tsx` via `@workspace/ui/globals.css`.

## Adding components

From the repo root, target the app that owns `components.json`:

```bash
bunx shadcn@latest add dialog -c apps/admin-frontend
bunx shadcn@latest add carousel -c apps/public-frontend
```

New files land in `packages/ui/src/components/` per monorepo shadcn config.

## Design tokens

- **Dark product** canvas — near-black background, light gray ink, lavender accent used sparingly
- **Light theme** — `.light` class inverse tokens in `globals.css`
- **Motion** — 150–250ms ease-out; respect `prefers-reduced-motion`
- **a11y** — WCAG 2.1 AA target; focus-visible rings; status never color-only

Token regressions are guarded by `design-tokens.test.ts`.

## Commands

```bash
bun run test        # Vitest (token + component tests)
bun run lint
bun run typecheck
```

From repo root:

```bash
bun run test --filter=@workspace/ui
```

## Related

- [Root README](../../README.md)
- [Public frontend](../../apps/public-frontend/README.md)
- [Admin frontend](../../apps/admin-frontend/README.md)
