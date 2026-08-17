# Template — repo root `AGENTS.md`

Copy this to the **repo root** as `AGENTS.md` when installing the pack, then fill the `_TODO_` rows. It is repo-specific and self-maintaining; transferable patterns stay in [`../../rules/`](../../rules/) — never paste a rule body here.

Everything below the line is the template.

---

# AGENTS — agent entry point

> **Read this first.** Repo facts, commands, and routing live here. Procedures live in [`.cursor/skills/`](.cursor/skills/); always-on patterns in [`.cursor/rules/`](.cursor/rules/); pack routing in [`.cursor/AGENTS.md`](.cursor/AGENTS.md).

## Bootstrap (every session)

```
1. Read this file — repo map + commands + learned facts
2. Read .cursor/AGENTS.md — pipelines, skill index, decision router
3. Before a skill → read .cursor/skills/<slug>/SKILL.md (never from memory)
4. Active SPEC.md contract? → read it + references/spec/contract-format.md
5. Missing repo fact? → discover (glob/grep/run), then append to Learned facts
6. Blocked on a user-owned decision → AskQuestion (never A/B/C in prose)
```

## Operating rules

| Rule | Detail |
| ---- | ------ |
| **Read skill first** | Matching `SKILL.md` before invoking a skill |
| **Single contract mutator** | Only `contract` writes `SPEC.md`; `build` flips task status |
| **Fail → backprop** | Test/build fail → classify → `contract-backprop`, not blind retry |
| **Scoped edits** | Minimize diff; no whole-repo lint/format; no drive-by refactors |
| **No secrets** | Never commit, log, or paste credentials |
| **Commit per unit** | Verified ticket/task → one plain Conventional Commit |
| **Ask before push / PR** | Never push unprompted |
| **AskQuestion** | Every clarification goes through the tool |

## Repo map

<!-- Agent: fill as you discover. Factual rows only — no speculation. -->

| Item | Location | Notes |
| ---- | -------- | ----- |
| Agent entry | `AGENTS.md` | This file |
| Pack entry | `.cursor/AGENTS.md` | Pipelines, indexes, routing |
| Contract schema | `.cursor/references/spec/contract-format.md` | `SPEC.md` sections |
| Lint presets | `.cursor/references/lint/` | **Oxlint+Oxfmt** recommended |
| Lint commands | `docs/agents/lint.md` | Filled by `/setup-skills` |
| Apps / packages | _TODO_ | |
| Folder blueprint | _TODO_ | Durable layout doc — see `.cursor/rules/folder-structure.mdc` |
| Dev command | _TODO_ | e.g. `npm run dev` |
| Check command | _TODO_ | lint + typecheck + test gate |
| Run state | `.runs/ship/<id>/` | `state.json`, `SPEC.md`, artifacts |
| Integration branch | _TODO_ | default pack: `dev` |
| Staging / production | _TODO_ | pack: `staging` → `main` + Release Please |
| Release lifecycle | `.cursor/references/ship/release-lifecycle.md` | rebase · promote · Release Please |

## Commands

<!-- Agent: append only commands you have actually run once. -->

| Command | Purpose |
| ------- | ------- |
| _TODO_ | Local dev server |
| _TODO_ | Lint + test gate |
| _TODO_ | Typecheck |

## Learned facts

<!-- Append-only. One durable fact per bullet. Edit or delete when a fact goes stale. -->

- `YYYY-MM-DD` — **topic** — fact (path or command if applicable)

**Belongs here:** package boundaries, non-obvious env var names, "X is canonical over Y", gotchas that cost a session.

**Does not belong:** task status (→ `SPEC.md` or the tracker), transferable patterns (→ a rule), multi-step procedures (→ a new skill).

## Self-maintenance

| You discovered… | Write to… |
| --------------- | --------- |
| Package path, entrypoint, script | **Repo map** / **Commands** |
| Non-obvious gotcha, canonical choice | **Learned facts** |
| Repeatable multi-step procedure | New `.cursor/skills/<slug>/SKILL.md` |
| Wrong or stale fact | Edit/delete the bullet |

Discover before inventing: read `README`, manifest files, task runner config, then glob the workspace — never guess a path into this file. Mention `AGENTS.md updated: <what>` in your summary when you change it.
