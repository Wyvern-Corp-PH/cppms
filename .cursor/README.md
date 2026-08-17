# Cursor agent pack

Self-contained. Everything agents need lives under this `.cursor/` folder — no outside companions.

| Dir | Holds | Naming |
| --- | ----- | ------ |
| [`agents/`](./agents/) | Subagent presets (~13) | `<name>.md` + YAML frontmatter |
| [`rules/`](./rules/) | Always-on topics + workflow | `<slug>.mdc` |
| [`skills/`](./skills/) | Skill folders | `<slug>/SKILL.md` (+ companions) |
| [`references/`](./references/) | Deep reference docs | `<category>/<slug>.md` |
| [`commands/`](./commands/) | Slash commands | **`ship.md` only** |

**Agents vs rules:** Subagents in `agents/` (investigator, builder, diff-reviewer, `ship-*`, `design-*`). Workflow essays under `rules/`. Delegation: [`rules/subagents.mdc`](./rules/subagents.mdc).

**Entry:** [`AGENTS.md`](./AGENTS.md) · **Ship:** [`commands/ship.md`](./commands/ship.md) (owns unified design phases 6+8) · **Contract schema:** [`references/spec/contract-format.md`](./references/spec/contract-format.md) · **Lint presets:** [`references/lint/`](./references/lint/README.md)

## Counts

| Kind | Count |
| ---- | ----- |
| Agents | 13 (+ README) |
| Rules | always-on `*.mdc` under `rules/` |
| Skills | folders under `skills/` (incl. `design`, `simplicity` companions) |
| References | engineering · data-systems · system-design-101 · refactoring · lint · spec · ship · pack · guardrails |
| Commands | **1** (`ship`) |

## Content policy

- **No degradation** — keep full procedures; densify, don't hollow out.
- **Standalone** — no external URLs or book attributions inside the pack.
- Deep refs load on demand: `references/data-systems/NN-*.md` · `references/system-design-101/part*-*.md` · `references/refactoring/{catalog,foundations,smells,techniques}.md` · `references/lint/` · `references/ship/` (snake_case `state.schema.json` + release-lifecycle).

## Install

Copy this folder to the target repo as `.cursor/`. Run **`/setup-skills`** once. Delivery: **`/ship`** only.

**Rules policy:** every `rules/*.mdc` is `alwaysApply: true`. Do not turn them off.
