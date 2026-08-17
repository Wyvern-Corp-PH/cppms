# Lint & format presets

Copyable starter configs aligned with [`lint-strategy`](../../rules/lint-strategy.mdc) and [`pre-commit`](../../rules/pre-commit.mdc). Installed (or adapted) by [`setup-skills`](../../skills/setup-skills/SKILL.md) § Lint & format.

## Choose one primary JS/TS stack

| Priority            | Stack signal                                                       | Preset                                  | Files                                                                                      |
| ------------------- | ------------------------------------------------------------------ | --------------------------------------- | ------------------------------------------------------------------------------------------ |
| **1 — recommended** | Bun / Vite / TS / greenfield / migrating off ESLint                | **Oxlint + Oxfmt** (linter · formatter) | [`.oxlintrc.json`](./.oxlintrc.json), [`.oxfmtrc.json`](./.oxfmtrc.json)                   |
| 2                   | Want all-in-one toolchain (lint+format one binary)                 | Biome                                   | [`biome.json`](./biome.json)                                                               |
| 3                   | Must keep ESLint plugins / Prettier plugins Oxc does not cover yet | ESLint + Prettier                       | [`eslint.config.mjs`](./eslint.config.mjs), [`prettier.config.mjs`](./prettier.config.mjs) |
| —                   | Python (any of the above)                                          | **Ruff**                                | [`ruff.toml`](./ruff.toml)                                                                 |

**Default for `/setup-skills`:** Oxlint + Oxfmt. ⊥ install Oxlint **and** ESLint as dual primaries on the same tree (incremental migrate is the exception — see migrate skills). ⊥ Biome + Oxfmt on the same tree.

### Why Oxc first

- Oxlint: 50–100× ESLint, correctness-first defaults, ESLint-compatible rules, type-aware linting via tsgo (docs).
- Oxfmt: Prettier-compatible, ~30× Prettier / ~2× Biome, built-in import / Tailwind / package.json sorting (docs).

### Migrating existing repos

| From                      | Skill                                                                |
| ------------------------- | -------------------------------------------------------------------- |
| ESLint → Oxlint           | [`migrate-oxlint`](../../skills/migrate-oxlint/SKILL.md) (skills.sh) |
| Prettier or Biome → Oxfmt | [`migrate-oxfmt`](../../skills/migrate-oxfmt/SKILL.md) (skills.sh)   |

## Pre-commit (always)

| File                                                 | Role                                                |
| ---------------------------------------------------- | --------------------------------------------------- |
| [`lefthook.yml`](./lefthook.yml)                     | Hook runner (preferred — one file)                  |
| [`lint-staged.config.mjs`](./lint-staged.config.mjs) | Staged-only lint → format (Oxlint+Oxfmt by default) |
| [`package-scripts.md`](./package-scripts.md)         | `package.json` scripts + install notes              |

## Size / complexity guardrails

Authoritative policy: [`lint-strategy`](../../rules/lint-strategy.mdc) § Recommended thresholds. Presets below encode them as **warn**.

| Rule family                     | Ceiling               | Oxlint                   | ESLint                   | Biome                            | Ruff                    |
| ------------------------------- | --------------------- | ------------------------ | ------------------------ | -------------------------------- | ----------------------- |
| Nesting depth                   | **1**                 | `max-depth`              | `max-depth`              | —                                | `max-nested-blocks`     |
| Cyclomatic complexity           | **10**                | `complexity`             | `complexity`             | —                                | `mccabe.max-complexity` |
| Lines / statements per function | **50** (target 20–30) | `max-lines-per-function` | `max-lines-per-function` | —                                | `pylint.max-statements` |
| Lines per file                  | **300**               | `max-lines`              | `max-lines`              | —                                | —                       |
| Cognitive complexity            | **15**                | —                        | —                        | `noExcessiveCognitiveComplexity` | —                       |

KISS prose twin: [`coding-principles`](../../rules/coding-principles.mdc) (split ~30 lines, hard ~50, max one nesting).

## Policy baked into presets

| Layer               | Behavior                                                                         |
| ------------------- | -------------------------------------------------------------------------------- |
| Global              | Correctness **error**; suspicious / pedantic / style / perf **warn** (burn-down) |
| Size / complexity   | **warn** at ceilings above — agents treat warn as error on new code              |
| Pre-commit / agents | `oxlint --deny-warnings` (or `--max-warnings=0`) on staged paths                 |
| Format              | Scoped to changed files — never whole-repo format during burn-down               |

## Install flow (human or `/setup-skills`)

1. Detect stack from lockfiles / existing configs.
2. Prefer Oxlint+Oxfmt unless Biome or ESLint+Prettier is already entrenched and the user opts to keep it.
3. Copy the matching preset file(s) to the repo root (or package root in a monorepo).
4. Add scripts from `package-scripts.md`; enable lefthook.
5. If migrating, run `migrate-oxlint` / `migrate-oxfmt` instead of blind overwrite.
6. Record the choice in `docs/agents/lint.md` (seed: [`../../skills/setup-skills/lint.md`](../../skills/setup-skills/lint.md)).
