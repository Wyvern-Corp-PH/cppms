# Lint & format

<!-- Written by /setup-skills. Agents read this before linting or formatting. -->

## Tooling

| Concern | Choice |
| ------- | ------ |
| Primary JS/TS lint | `oxlint` (recommended) \| `biome` \| `eslint` \| `none` |
| Primary JS/TS format | `oxfmt` (recommended) \| `biome` \| `prettier` \| `none` |
| Python | `ruff` \| `none` |
| Hook runner | `lefthook` (+ `lint-staged`) |
| Config paths | e.g. `.oxlintrc.json`, `.oxfmtrc.json`, `lefthook.yml`, `lint-staged.config.mjs` |

Docs: Oxlint · Oxfmt

## Commands

| Intent | Command |
| ------ | ------- |
| Check all (CI / local gate) | _TODO_ e.g. `bun run check:lint` + `bun run format:check` |
| Fix staged (pre-commit) | `bunx lint-staged` |
| Scoped fix (one file) | _TODO_ e.g. `oxlint --fix path` then `oxfmt path` |

## Policy

- Global: correctness **error**; other categories **warn** (burn-down). See `.cursor/rules/lint-strategy.mdc`.
- Size/complexity ceilings (warn): nesting **1**, cyclomatic **10**, fn lines **50**, file **300**, cognitive **15** — encoded in presets; table in `lint-strategy.mdc` + `references/lint/README.md`.
- Pre-commit / agents: `oxlint --deny-warnings` (or equivalent) on staged / new code.
- **Never** whole-repo format/lint-fix while a warn backlog exists — scope to touched paths.
- Order: lint fix → format → verify.
- Migrating: `migrate-oxlint` / `migrate-oxfmt` skills (pack) or skills.sh oxc.

## Presets source

Copied/adapted from `.cursor/references/lint/` on setup. Diff ratchet CI is Phase C of adoption — optional follow-up.
