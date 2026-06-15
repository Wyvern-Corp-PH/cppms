# `@workspace/typescript-config`

Shared TypeScript `extends` presets for the CPPMS monorepo.

## Presets

| File | Use for |
|---|---|
| `base.json` | Node/scripts packages (strict defaults) |
| `nextjs.json` | Next.js apps with path aliases |
| `react-library.json` | React component libraries (`@workspace/ui`) |

## Usage

**Next.js app** — `tsconfig.json`:

```json
{
  "extends": "@workspace/typescript-config/nextjs.json",
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["**/*.ts", "**/*.tsx", "next-env.d.ts"],
  "exclude": ["node_modules"]
}
```

**Library package**:

```json
{
  "extends": "@workspace/typescript-config/react-library.json",
  "compilerOptions": {
    "outDir": "dist"
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
```

## Commands

```bash
# single package
bun run typecheck

# entire workspace
bun run typecheck
```

## Related

- [Root README](../../README.md)
- [`@workspace/eslint-config`](../eslint-config/README.md)
