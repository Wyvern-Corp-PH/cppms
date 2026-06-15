# `@workspace/eslint-config`

Shared [ESLint 9](https://eslint.org) flat configs for the CPPMS monorepo.

## Exports

| Import path | Use for |
|---|---|
| `@workspace/eslint-config/base` | Generic TypeScript packages |
| `@workspace/eslint-config/next-js` | Next.js apps (`admin-frontend`, `public-frontend`) |
| `@workspace/eslint-config/react-internal` | React libraries (`@workspace/ui`) |

## Usage

**Next.js app** — `eslint.config.js`:

```js
import { nextJsConfig } from "@workspace/eslint-config/next-js"

/** @type {import("eslint").Linter.Config[]} */
export default [...nextJsConfig]
```

**Package / library** — extend `base` or `react-internal` the same way.

## What it enforces

- TypeScript-aware rules via `typescript-eslint`
- Next.js plugin rules for app directories
- React + React Hooks recommended settings
- Prettier compatibility (`eslint-config-prettier`)
- Turbo-aware env var linting (`eslint-plugin-turbo`)

## Commands

From a consuming package:

```bash
bun run lint
```

From the repo root (all packages):

```bash
bun run lint
```

## Related

- [Root README](../../README.md)
- [`@workspace/typescript-config`](../typescript-config/README.md)
