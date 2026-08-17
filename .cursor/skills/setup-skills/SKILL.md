---
name: setup-skills
description: Configure this repo for the engineering skills — issue tracker, triage labels, domain docs, and lint/format (presets from references/lint). Run once before first use of the other engineering skills.
disable-model-invocation: true
---

# Setup skills

Scaffold the per-repo configuration that the engineering skills assume:

- **Issue tracker** — where issues live (GitHub by default; local markdown is also supported out of the box)
- **Triage labels** — the strings used for the five canonical triage roles
- **Domain docs** — where `CONTEXT.md` and ADRs live, and the consumer rules for reading them
- **Lint & format** — linter + formatter + pre-commit hooks from pack presets under `references/lint/`

This is a prompt-driven skill, not a deterministic script. Explore, present what you found, confirm with the user, then write.

## Process

### 1. Explore

Look at the current repo to understand its starting state. Read whatever exists; don't assume:

- `git remote -v` and `.git/config` — is this a GitHub repo? Which one?
- `AGENTS.md` and `CLAUDE.md` at the repo root — does either exist? Is there already an `## Agent skills` section in either?
- `CONTEXT.md` and `CONTEXT-MAP.md` at the repo root
- `docs/adr/` and any `src/*/docs/adr/` directories
- `docs/agents/` — does this skill's prior output already exist?
- `.scratch/` — sign that a local-markdown issue tracker convention is already in use
- Is the `triage` skill installed? (a `triage` skill folder alongside this one, or `triage` in your available skills.) This decides whether Section B runs at all.
- Monorepo signals — a `pnpm-workspace.yaml`, a `workspaces` field in `package.json`, or a populated `packages/*` with its own `src/`. Present only in a genuinely large multi-package repo; their absence means single-context, which is almost every repo.
- **Folder layout** — top-level `apps/`, `packages/`, `services/`, or a single `src/`; any existing layout doc under `docs/engineering/` or similar. Note organizational principle if obvious (layer vs feature vs domain). Policy: [`folder-structure`](../../rules/folder-structure.mdc); checklist: [`references/engineering/folder-structure.md`](../../references/engineering/folder-structure.md).
- Lint / format signals — existing `.oxlintrc.json`, `oxlint.config.*`, `.oxfmtrc.json`, `oxfmt.config.*`, `biome.json`, `eslint.config.*`, `.eslintrc*`, `prettier.config.*`, `.prettierrc*`, `ruff.toml`, `[tool.ruff]` in `pyproject.toml`, `lefthook.yml`, `.husky/`, `lint-staged` in `package.json`. Note package manager (`bun.lock` / `pnpm-lock.yaml` / `package-lock.json` / `uv.lock`).

### 2. Present findings and ask

Summarise what's present and what's missing. Then take the sections in order — one section, one answer, then the next.

Lead each section with the recommended answer so the user can accept it in a word. Give a one-line explainer only when the choice genuinely branches; skip the section entirely when exploration already settled it (Section B when `triage` isn't installed, Section C when there's no monorepo).

**Section A — Issue tracker.**

> Explainer: The "issue tracker" is where issues live for this repo. Skills like `to-tickets`, `triage`, `spec`, and `qa` read from and write to it — they need to know whether to call `gh issue create`, write a markdown file under `.scratch/`, or follow some other workflow you describe. Pick the place you actually track work for this repo.

Default posture: these skills were designed for GitHub. If a `git remote` points at GitHub, propose that. If a `git remote` points at GitLab (`gitlab.com` or a self-hosted host), propose GitLab. Otherwise (or if the user prefers), offer:

- **GitHub** — issues live in the repo's GitHub Issues (uses the `gh` CLI)
- **GitLab** — issues live in the repo's GitLab Issues (uses the `glab` CLI)
- **Local markdown** — issues live as files under `.scratch/<feature>/` in this repo (good for solo projects or repos without a remote)
- **Other** (Jira, Linear, etc.) — ask the user to describe the workflow in one paragraph; the skill will record it as freeform prose

Record the choice in `docs/agents/issue-tracker.md`. The GitHub and GitLab templates carry a "PRs as a request surface" flag, defaulted **off** — leave it off and don't raise it; a user who wants external PRs in the triage queue can flip the flag in the file later.

**Section B — Triage label vocabulary.** Skip this section entirely if the `triage` skill isn't installed (exploration told you) — an uninstalled skill needs no labels.

If it is installed, ask exactly one question:

> Do you want to keep the default triage labels? (recommended: **yes**)

The defaults are the five canonical roles, each label string equal to its name: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. On **yes**, write them as-is. Only if the user says no — usually because their tracker already uses other names (e.g. `bug:triage` for `needs-triage`) — collect the overrides so `triage` applies existing labels instead of creating duplicates.

**Section C — Domain docs.** Default to **single-context** — one `CONTEXT.md` + `docs/adr/` at the repo root. This fits almost every repo; write it without asking.

Offer **multi-context** — a root `CONTEXT-MAP.md` pointing to per-context `CONTEXT.md` files — only when exploration found monorepo signals. Then confirm which layout they want.

**Section D — Lint & format.** Always run. Presets live in [`.cursor/references/lint/`](../../references/lint/README.md). Goal: repo has a real linter, formatter, and staged pre-commit — not only playbook rules.

**Highly recommended default:** Oxlint + Oxfmt (fast, ESLint/Prettier-compatible, AI-friendly diagnostics).

Default posture from exploration:

| Found | Propose |
| ----- | ------- |
| Nothing / Bun / Vite / TS greenfield | **Oxlint + Oxfmt** (recommended) |
| ESLint present | **Migrate to Oxlint** via [`migrate-oxlint`](../migrate-oxlint/SKILL.md) (recommended) — or keep ESLint+Prettier if user insists on unsupported plugins |
| Prettier or Biome formatter present | **Migrate to Oxfmt** via [`migrate-oxfmt`](../migrate-oxfmt/SKILL.md) (recommended) |
| Oxlint / Oxfmt already | Keep; wire lefthook + lint-staged if missing |
| Biome all-in-one already and user wants to keep | Keep Biome; do not dual-run Oxfmt |
| `ruff.toml` / `[tool.ruff]` | Keep Ruff; add Oxlint+Oxfmt if a JS/TS tree exists |
| Python only | **Ruff** |

Ask (AskQuestion), lead with the recommended row:

> Lint/format for this repo? (recommended: **Oxlint + Oxfmt**)

Options: Oxlint+Oxfmt (Recommended) · Oxlint+Oxfmt+Ruff · Biome · ESLint+Prettier · Ruff only · Skip (document `none` — not recommended).

On accept:

1. Copy/adapt preset files from `references/lint/` into the repo root (or the package that owns lint). ⊥ dual primary JS linters/formatters on the same tree (except documented incremental ESLint+Oxlint migrate).
2. If migrating from ESLint / Prettier / Biome → invoke `migrate-oxlint` / `migrate-oxfmt` rather than overwriting blindly.
3. Add scripts + deps from [`package-scripts.md`](../../references/lint/package-scripts.md); keep `lint-staged.config.mjs` on the Oxc blocks unless another preset won.
4. Run install + `lefthook install` when the user confirms executing commands.
5. Fill `docs/agents/lint.md` from [lint.md](./lint.md) with concrete commands.

If tooling already exists, **do not** overwrite configs silently — propose a diff / migrate skill path and confirm first.

### 3. Confirm and edit

Show the user a draft of:

- The `## Agent skills` block to add to whichever of `CLAUDE.md` / `AGENTS.md` is being edited (see step 4 for selection rules)
- The contents of `docs/agents/issue-tracker.md`, `docs/agents/domain.md`, `docs/agents/lint.md`, and `docs/agents/triage-labels.md` (the last only when `triage` is installed)
- The list of lint/format files to create or patch (paths only)

Let them edit before writing.

### 4. Write

**Pick the file to edit:**

- If `CLAUDE.md` exists, edit it.
- Else if `AGENTS.md` exists, edit it.
- If neither exists, ask the user which one to create — don't pick for them.

Never create `AGENTS.md` when `CLAUDE.md` already exists (or vice versa) — always edit the one that's already there.

If an `## Agent skills` block already exists in the chosen file, update its contents in-place rather than appending a duplicate. Don't overwrite user edits to the surrounding sections.

The block:

```markdown
## Agent skills

### Issue tracker

[one-line summary of where issues are tracked]. See `docs/agents/issue-tracker.md`.

### Triage labels

[one-line summary of the label vocabulary]. See `docs/agents/triage-labels.md`.

### Domain docs

[one-line summary of layout — "single-context" or "multi-context"]. See `docs/agents/domain.md`.

### Lint & format

[one-line summary — e.g. "Biome + lefthook; scoped fix only"]. See `docs/agents/lint.md`.
```

Include the `### Triage labels` sub-block, and write `docs/agents/triage-labels.md`, only when `triage` is installed and Section B ran. When it isn't, both are omitted. Always include `### Lint & format` and write `docs/agents/lint.md` (use `none` only if the user skipped Section D).

Then write the docs files using the seed templates in this skill folder as a starting point:

- [issue-tracker-github.md](./issue-tracker-github.md) — GitHub issue tracker
- [issue-tracker-gitlab.md](./issue-tracker-gitlab.md) — GitLab issue tracker
- [issue-tracker-local.md](./issue-tracker-local.md) — local-markdown issue tracker
- [triage-labels.md](./triage-labels.md) — label mapping (only if `triage` is installed)
- [domain.md](./domain.md) — domain doc consumer rules + layout
- [lint.md](./lint.md) — lint/format commands + policy pointer

Copy or adapt configs from [`.cursor/references/lint/`](../../references/lint/README.md) per Section D.

For "other" issue trackers, write `docs/agents/issue-tracker.md` from scratch using the user's description.

### 5. Done

Tell the user the setup is complete and which engineering skills will now read from these files. Mention:

- They can edit `docs/agents/*.md` directly later — re-run this skill only to switch tracker, restart domain layout, or change lint tooling.
- Lint policy details stay in `.cursor/rules/lint-strategy.mdc` and `pre-commit.mdc`; `docs/agents/lint.md` holds **this repo's** commands.
- Diff-ratchet CI is adoption Phase C — optional next step after hooks are green.
- If no durable folder map exists, point them at [`folder-structure`](../../rules/folder-structure.mdc) and seed **Repo map** rows (apps/packages paths) in root `AGENTS.md`; a full blueprint can wait for adoption Phase A.
