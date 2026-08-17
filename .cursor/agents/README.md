# Pack subagents

Cursor loads markdown files here as delegatable specialists. Sync to project `.cursor/agents/` on install.

## Layout

```
.cursor/
  agents/           ← this directory
  rules/            ← topics + subagents.mdc
  skills/           ← procedures (main thread)
  commands/         ← /ship only
```

Workflow topics (`ship`, `concise`, `simplicity`, `delegation`, `design`) live under `rules/<slug>.mdc`.

## File format

```markdown
---
name: my-agent
description: One sentence — when Agent should delegate. Be specific.
model: inherit
readonly: false
is_background: false
---

Prompt body: role, workflow, output contract, boundaries.
```

## Installed (~13)

### Tier 1 — core

| Agent | Role | Flags |
| ----- | ---- | ----- |
| **investigator** | Locate defs/callers/usages | `readonly` |
| **builder** | Surgical edit ≤2 files | editable |
| **diff-reviewer** | Compressed diff bug hunt | `readonly` |
| **verifier** | Skeptical post-build check | `readonly` |
| **ci-investigator** | CI failure → root cause | `readonly`, `is_background` |

### Tier 2 — `/ship`

| Agent | Phase |
| ----- | ----- |
| **ship-setup** | Ticket + branch |
| **ship-spec** | PRD / contract draft |
| **ship-spec-review** | Adversarial contract review |
| **design-architect** | Plan — unified data + arch design (**mandatory**) |
| **design-auditor** | Review — unified design audit (**mandatory**) |
| **ship-execute** | One-ticket implement (+ review fix mode) |
| **ship-review** | Review — ac + quality + simplicity |
| **ship-verify** | Tests + QA notes |

Parent rules: [`../rules/subagents.mdc`](../rules/subagents.mdc).

### What not to add

- Main-thread skills → `skills/<slug>/`
- Workflow essays → `rules/<slug>.mdc`
- Thin specialist commands — `/ship` only
- Second design delivery trunk

## Counts

| Kind | Count |
| ---- | ----- |
| Agents (excl. README) | 13 |
| Commands | 1 (`ship`) |
