---
name: migrate-oxfmt
description: |
  Migrate a JS/TS repo from Prettier or Biome to Oxfmt. Use when the user says
  migrate to oxfmt, replace prettier/biome formatter, or setup-skills recommends
  Oxc formatting. Uses oxfmt --migrate when the config is a static object.
  Upstream:
---

# Migrate Prettier / Biome → Oxfmt

Oxfmt is a high-performance, Prettier-compatible formatter (docs). Prefer Oxfmt as the dedicated formatter; use Vite+ only when the team wants a full Oxc toolchain product.

Pack seed config: [`../../references/lint/.oxfmtrc.json`](../../references/lint/.oxfmtrc.json).

## Steps

### 1. Explore

- Prettier: `prettier.config.*`, `.prettierrc*`, `package.json#prettier`
- Biome: `biome.json` / `biome.jsonc` (formatter section)
- Dynamic JS/TS config (env branches, computed values)? → **manual** migrate; `--migrate` only snapshots resolved values
- Nested per-directory configs? → migrate each manually after root

### 2. Automated migration (static config)

Install Oxfmt, then from the config's directory:

```bash
bun add -d oxfmt
# From Prettier (typical):
oxfmt --migrate prettier
# From Biome:
oxfmt --migrate biome
```

If the CLI flag set differs in your installed version, run `oxfmt --help` and use the documented migrate path. Fallback: copy pack `.oxfmtrc.json` and map options from Oxfmt configuration.

**Static root config** (JSON/YAML or JS that exports a plain object) → automated migrate is fine.
**Dynamic config** → port logic into `oxfmt.config.ts` with `defineConfig` — do not pretend `--migrate` preserved branches.

### 3. Wire scripts & hooks

Per [`../../references/lint/package-scripts.md`](../../references/lint/package-scripts.md):

```json
{
  "scripts": {
    "format": "oxfmt",
    "format:check": "oxfmt --check"
  }
}
```

lint-staged: run `oxfmt` on staged JS/TS/JSON/MD/CSS (see pack `lint-staged.config.mjs`). Remove Prettier/Biome format scripts once `oxfmt --check` is green.

### 4. Verify

```bash
oxfmt --check
oxfmt path/to/touched-file.ts   # scoped — never whole-repo format during burn-down
```

Oxfmt aims to match Prettier JS/TS formatting; treat unexpected diffs as bugs to investigate, not silent style churn. Update `docs/agents/lint.md` formatter → `oxfmt`. Pair linter migrate with [`migrate-oxlint`](../migrate-oxlint/SKILL.md) when ESLint remains.

## Boundaries

- One formatter per tree — ⊥ Oxfmt + Prettier or Oxfmt + Biome format both active.
- Do not whole-repo format to “finish” the migrate under a warn backlog; format touched paths / follow team waiver.
- Nested configs: migrate root first, then package-level overrides explicitly.
