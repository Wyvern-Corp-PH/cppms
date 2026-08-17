# Package scripts & install notes

Add these scripts to the **root** `package.json` (or the package that owns lint). Replace `bun` with `npm` / `pnpm` as needed.

## Oxlint + Oxfmt (recommended)

Docs: Oxlint · Oxfmt

```json
{
  "scripts": {
    "lint": "oxlint",
    "lint:fix": "oxlint --fix",
    "format": "oxfmt",
    "format:check": "oxfmt --check",
    "check:lint": "oxlint --deny-warnings"
  },
  "devDependencies": {
    "oxlint": "latest",
    "oxfmt": "latest",
    "lefthook": "^1.11.0",
    "lint-staged": "^15.0.0"
  }
}
```

Optional type-aware linting (install when you enable `options.typeAware` in `.oxlintrc.json`):

```bash
bun add -d oxlint-tsgolint
```

Install + hooks:

```bash
bun add -d oxlint oxfmt lefthook lint-staged
bunx lefthook install
```

Copy presets: `.oxlintrc.json`, `.oxfmtrc.json` from this folder.

Migrating from ESLint / Prettier / Biome → use pack skills `migrate-oxlint` / `migrate-oxfmt` (or `npx @oxlint/migrate` / `oxfmt --migrate`).

## Biome (alternative all-in-one)

```json
{
  "scripts": {
    "lint": "biome check .",
    "lint:fix": "biome check --write .",
    "format": "biome format --write .",
    "check:lint": "biome check ."
  },
  "devDependencies": {
    "@biomejs/biome": "^2.0.0",
    "lefthook": "^1.11.0",
    "lint-staged": "^15.0.0"
  }
}
```

Edit `lint-staged.config.mjs` to the Biome block.

## ESLint + Prettier (legacy / plugin holdouts)

```json
{
  "scripts": {
    "lint": "eslint .",
    "lint:fix": "eslint . --fix",
    "format": "prettier --write .",
    "check:lint": "eslint . --max-warnings=0"
  },
  "devDependencies": {
    "eslint": "^9.0.0",
    "@eslint/js": "^9.0.0",
    "typescript-eslint": "^8.0.0",
    "globals": "^15.0.0",
    "prettier": "^3.0.0",
    "lefthook": "^1.11.0",
    "lint-staged": "^15.0.0"
  }
}
```

Prefer migrating to Oxc via `migrate-oxlint` / `migrate-oxfmt` when plugins allow.

## Ruff (Python)

```bash
uv add --dev ruff
# staged: ruff check --fix + ruff format on *.py
```

Wire Python into `lint-staged.config.mjs` and/or a second lefthook command.

## Agent / scoped fix (all presets)

Never whole-repo `lint:fix` / `format` during warn burn-down. Pattern:

```bash
# Oxlint + Oxfmt (recommended)
oxlint --fix path/to/file.ts
oxfmt path/to/file.ts

# Biome
biome check --write path/to/file.ts

# ESLint + Prettier
eslint --fix path/to/file.ts
prettier --write path/to/file.ts

# Ruff
ruff check --fix path/to/file.py
ruff format path/to/file.py
```

Order: **lint fix → format → verify zero errors on touched files**.
