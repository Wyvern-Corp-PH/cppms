---
name: migrate-oxlint
description: |
  Migrate a JS/TS repo from ESLint to Oxlint. Use when the user says migrate
  to oxlint, replace eslint with oxlint, or setup-skills finds ESLint and the
  recommended path is Oxc. Runs @oxlint/migrate; does not invent rule maps from
  memory. Upstream:
---

# Migrate ESLint → Oxlint

Oxlint is a high-performance JS/TS linter with broad ESLint-compatible coverage (docs). Prefer **replace ESLint** for most projects; use **incremental** (Oxlint + `eslint-plugin-oxlint`) only for large complex repos.

Official migrate tool: `@oxlint/migrate`. Pack seed config: [`../../references/lint/.oxlintrc.json`](../../references/lint/.oxlintrc.json).

## Steps

### 1. Explore

- Locate ESLint config: `eslint.config.*`, `.eslintrc*`, `package.json#eslintConfig`
- Note plugins / type-aware rules / flat vs legacy
- Check whether Oxlint already exists (`.oxlintrc.json`, `oxlint` dep)

### 2. Run automated migration

From the package (or repo) root that owns ESLint:

```bash
npx @oxlint/migrate
```

This reads the ESLint config and writes `.oxlintrc.json`. Pass flags from the tool's `--help` when the config path is non-standard.

If migration fails or the config is heavily dynamic, fall back to the pack preset `.oxlintrc.json` and port critical rules manually — cite config file reference.

### 3. Wire scripts & hooks

- Add `lint` / `lint:fix` / `check:lint` per [`../../references/lint/package-scripts.md`](../../references/lint/package-scripts.md)
- Point lint-staged at `oxlint --fix --deny-warnings`
- Remove or narrow ESLint scripts once CI is green on Oxlint alone

**Incremental path (large repos):** keep ESLint temporarily; add `eslint-plugin-oxlint` to disable overlapping rules; run Oxlint first in CI.

### 4. Optional type-aware

When the old setup used type-aware TypeScript rules:

```bash
bun add -d oxlint-tsgolint   # or npm/pnpm
```

Enable in `.oxlintrc.json`:

```json
{
  "options": { "typeAware": true }
}
```

See type-aware linting.

### 5. Verify

```bash
oxlint
oxlint --fix   # review diff; do not dump unrelated churn
```

Update `docs/agents/lint.md` primary JS/TS → `oxlint`. Pair formatter migrate with [`migrate-oxfmt`](../migrate-oxfmt/SKILL.md) when Prettier/Biome is still in use.

## Boundaries

- Do not delete ESLint config until Oxlint CI is green (or incremental dual-run is documented).
- Do not invent rule IDs — use migrate output + Oxlint docs.
- Scoped fixes only during burn-down (lint-strategy).
