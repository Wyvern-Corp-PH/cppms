# AGENTS — pack entry

> **Audience:** AI coding assistants.
> **This pack is the playbook.** Content under `.cursor/{rules,skills,agents,commands,references}/`.
> Standalone — nothing outside `.cursor/` required. Sole slash command: **`/ship`**.

---

## Bootstrap (every session)

```
1. Read this file (.cursor/AGENTS.md)
2. All rules/*.mdc alwaysApply — enforce pack
3. Lost? → skills/ask/SKILL.md
4. Before skill → read skills/<slug>/SKILL.md (+ companions)
5. Workflow → rules/{ship,design,simplicity,delegation,concise,skill-library,subagents,stacking-prs,folder-structure,…}.mdc
6. Orchestrated delivery → /ship (commands/ship.md)
7. Locate/fix/review → agents/ (investigator · builder · diff-reviewer · ship-* · design-*)
8. Deep refs → references/<category>/
9. Contract mode? → SPEC.md (repo root or .runs/ship/<id>/) + references/spec/contract-format.md
10. User choice → AskQuestion (never A/B/C prose)
```

---

## Layout

```
.cursor/
├── AGENTS.md
├── agents/<name>.md      ← Tier 1 + ship specialists
├── commands/ship.md      ← sole slash command
├── rules/<slug>.mdc      ← alwaysApply topics
├── skills/<slug>/        ← procedures + companions
└── references/<cat>/     ← deep refs
```

| Kind | Path |
| ---- | ---- |
| Agents | `agents/<name>.md` |
| Rules | `rules/<slug>.mdc` |
| Skills | `skills/<slug>/SKILL.md` |
| References | `references/<category>/` |
| Command | `commands/ship.md` |

Install: copy pack `.cursor/` → project `.cursor/`.

---

## Operating rules

| Rule | Detail |
| ---- | ------ |
| **Read skill first** | Full `SKILL.md` — not memory |
| **Pack rules always on** | Every `rules/*.mdc` → `alwaysApply: true` |
| **No content degradation** | Edit skills/rules in place; ⊥ empty stubs |
| **Contract schema** | [`references/spec/contract-format.md`](./references/spec/contract-format.md) |
| **Single contract mutator** | `contract` (or `ship-spec` in `/ship`); `build` flips §T status only |
| **No secrets** | Never commit credentials |
| **Commit per unit** | `build` / `ship-execute`: commit when unit verifies — plain Conventional Commits; ⊥ batch; ⊥ `§T`/`§V`/`Tn`/`Vn` in commits or product code |
| **Ask before push / PR** | Never auto-push; Phase 9 AskQuestion |
| **Ask before ad-hoc commit** | Outside execute loop → commit only on user ask |
| **awaiting_human** | Clarify → AskQuestion + `status: awaiting-human` + `awaiting_human` object; stop |
| **AskQuestion** | All human gates via tool — never prose menus |
| **state.json** | Snake_case keys (`ticket_id`, `run_dir`, `spec_path`, `base_ref`, `phase_name`, `awaiting_human`, `done_units`, `skills_loaded`, `gates.design_done`, …) |

---

## Pipelines

Unsure which path? → `ask`. Orchestrated delivery → **`/ship`**.

```
setup-skills (once)
    → grill* / on-ramps
    → [prototype · research]
    → spec | contract
    → to-tickets?
    → build × N (fresh ctx) → tdd → code-review → commit/unit
    → large land? → stacking-prs
```

Layout: always-on [`folder-structure`](./rules/folder-structure.mdc). Layers/ports → `clean-ddd-hexagonal`.

**Context hygiene:** grill → (prototype) → (research) → spec → to-tickets = one window. Each `build` = fresh. ~120k tokens → `handoff`.

### A. Main delivery

```
setup-skills
  → grill-with-docs | grill  (+ domain-modeling if terms/ADRs)
  → [handoff ↔ prototype]
  → [research]
  → multi-session?  yes → spec → to-tickets → build × N
                    no  → build
  → tdd → code-review → commit/unit
  → multi-layer? → stacking-prs
```

| Step | Skill |
| ---- | ----- |
| Setup | `setup-skills` |
| Sharpen | `grill` / `grill-with-docs` |
| Spike | `prototype` + `handoff` |
| Facts | `research` |
| PRD | `spec` |
| Slice | `to-tickets` |
| Code | `build` → `tdd` → `code-review` · **commit/unit** |
| Land large | `stacking-prs` |

### B. On-ramps → merge into A

```
triage              → build
wayfinder           → spec → to-tickets → build × N
diagnosing-bugs     → fix + regression → [improve-codebase-architecture] → grill-with-docs → A
```

### C. Vocabulary & health

```
under trunk:
  domain-modeling · codebase-design · clean-ddd-hexagonal
  logging-best-practices · folder-structure (always-on)

health (not a trunk):
  improve-codebase-architecture → grill-with-docs → A
  layout drift → folder-structure + custom-validators · clean-ddd-hexagonal
```

### D. Standalone

```
ask · teach · writing-great-skills · resolving-merge-conflicts
stacking-prs · handoff · research · prototype
migrate-oxlint · migrate-oxfmt
```

### E. Rails / contract / ship

```
Contract mode (SPEC.md root or .runs/ship/<id>/SPEC.md)
  idea → [grill] → contract NEW → OK? → [research] → [review] → build → §T x
  fail → amend / contract-backprop ← contract-check (read-only)
  ⊥ sub-agents for contract / build / contract-check / contract-backprop
  schema: references/spec/contract-format.md

  spec     = PRD → tracker → to-tickets (pipeline A)
  contract = SPEC.md §G…§B
  Active SPEC.md → contract mode. PRD + tickets → A.

/ship  Setup → Ticket+Branch → Clarify → Spec(HUMAN) → Slice
       → Plan+Design → Execute → Review → Tests/QA
  state: .runs/ship/<id>/state.json  (snake_case; schema references/ship/state.schema.json)
  design mandatory phases 6+8 → design_design.json · design_audit.json
  agents: ship-setup · ship-spec · ship-spec-review · design-architect
          · ship-execute · ship-review · design-auditor · ship-verify

Delegation
  investigator → builder (≤2 files) → diff-reviewer
  verifier · ci-investigator
  ⊥ rewrite §G…§B · ⊥ builder without path · ⊥ contract/PRD writes
```

### F. Release lifecycle + decision router

Release (process beside `/ship`) — [`references/ship/release-lifecycle.md`](./references/ship/release-lifecycle.md) · [`branching.mdc`](./rules/branching.mdc):

```
feature/* → rebase origin/dev → /ship 3–9 → PR → dev
  → promote: dev → staging → main → Release Please
```

```
First time?                    → setup-skills
Migrate ESLint → Oxlint?       → migrate-oxlint
Migrate Prettier/Biome → Oxfmt? → migrate-oxfmt
Lost / which skill?            → ask

Fuzzy + codebase?              → grill-with-docs
Fuzzy, no codebase?            → grill
Runnable spike?                → handoff ↔ prototype
External facts?                → research
PRD?                           → spec
Tracer tickets?                → to-tickets
Implement?                     → build → tdd → code-review
Issue queue?                   → triage → build
Hard bug?                      → diagnosing-bugs
Foggy multi-session?           → wayfinder → spec → …
Deepen architecture?           → improve-codebase-architecture
Design vocabulary?             → codebase-design
File layout / path map?        → folder-structure · references/engineering/folder-structure.md
Domain terms / ADRs?           → domain-modeling
DDD / hex / layers?            → clean-ddd-hexagonal
Logging / wide events?         → logging-best-practices
YAGNI / delete bloat?          → simplicity (companions review/audit/debt)
Design-intensive / API scale?  → /ship (design mandatory)
Code smells / extract?         → skills/design mode smells · or simplicity
                               ⊥ /data-systems · ⊥ /sd · ⊥ /refactoring
Merge conflict?                → resolving-merge-conflicts
Multi-layer PR?                → stacking-prs
Env promote / release?         → references/ship/release-lifecycle.md
Active SPEC.md?                → contract · build · contract-check · contract-backprop
Orchestrated delivery?         → /ship
file:line?                     → investigator
≤2 file fix?                   → builder
Diff bugs?                     → diff-reviewer
Dual Standards+Spec?           → code-review (⊥ same wave as ship Phase 8)
Done / handoff?                → verifier
CI fail?                       → ci-investigator
```

---

## Agent index

### Tier 1

| Agent | Path |
| ----- | ---- |
| investigator | [`agents/investigator.md`](./agents/investigator.md) |
| builder | [`agents/builder.md`](./agents/builder.md) |
| diff-reviewer | [`agents/diff-reviewer.md`](./agents/diff-reviewer.md) |
| verifier | [`agents/verifier.md`](./agents/verifier.md) |
| ci-investigator | [`agents/ci-investigator.md`](./agents/ci-investigator.md) |

### Tier 2 — `/ship`

| Agent | Path |
| ----- | ---- |
| ship-setup | [`agents/ship-setup.md`](./agents/ship-setup.md) |
| ship-spec | [`agents/ship-spec.md`](./agents/ship-spec.md) |
| ship-spec-review | [`agents/ship-spec-review.md`](./agents/ship-spec-review.md) |
| design-architect | [`agents/design-architect.md`](./agents/design-architect.md) |
| ship-execute | [`agents/ship-execute.md`](./agents/ship-execute.md) |
| ship-review | [`agents/ship-review.md`](./agents/ship-review.md) |
| design-auditor | [`agents/design-auditor.md`](./agents/design-auditor.md) |
| ship-verify | [`agents/ship-verify.md`](./agents/ship-verify.md) |

Roster: [`agents/README.md`](./agents/README.md) · [`rules/subagents.mdc`](./rules/subagents.mdc).

---

## Skill index

| Skill | Path |
| ----- | ---- |
| ask | [`skills/ask/`](./skills/ask/SKILL.md) |
| setup-skills | [`skills/setup-skills/`](./skills/setup-skills/SKILL.md) |
| migrate-oxlint | [`skills/migrate-oxlint/`](./skills/migrate-oxlint/SKILL.md) |
| migrate-oxfmt | [`skills/migrate-oxfmt/`](./skills/migrate-oxfmt/SKILL.md) |
| grill | [`skills/grill/`](./skills/grill/SKILL.md) |
| grill-with-docs | [`skills/grill-with-docs/`](./skills/grill-with-docs/SKILL.md) |
| domain-modeling | [`skills/domain-modeling/`](./skills/domain-modeling/SKILL.md) |
| prototype | [`skills/prototype/`](./skills/prototype/SKILL.md) |
| research | [`skills/research/`](./skills/research/SKILL.md) |
| spec | [`skills/spec/`](./skills/spec/SKILL.md) · PRD |
| contract | [`skills/contract/`](./skills/contract/SKILL.md) · sole `SPEC.md` mutator |
| contract-check | [`skills/contract-check/`](./skills/contract-check/SKILL.md) · read-only |
| contract-backprop | [`skills/contract-backprop/`](./skills/contract-backprop/SKILL.md) |
| to-tickets | [`skills/to-tickets/`](./skills/to-tickets/SKILL.md) |
| build | [`skills/build/`](./skills/build/SKILL.md) |
| tdd | [`skills/tdd/`](./skills/tdd/SKILL.md) |
| code-review | [`skills/code-review/`](./skills/code-review/SKILL.md) |
| triage | [`skills/triage/`](./skills/triage/SKILL.md) |
| wayfinder | [`skills/wayfinder/`](./skills/wayfinder/SKILL.md) |
| diagnosing-bugs | [`skills/diagnosing-bugs/`](./skills/diagnosing-bugs/SKILL.md) |
| handoff | [`skills/handoff/`](./skills/handoff/SKILL.md) |
| teach | [`skills/teach/`](./skills/teach/SKILL.md) |
| writing-great-skills | [`skills/writing-great-skills/`](./skills/writing-great-skills/SKILL.md) |
| codebase-design | [`skills/codebase-design/`](./skills/codebase-design/SKILL.md) |
| improve-codebase-architecture | [`skills/improve-codebase-architecture/`](./skills/improve-codebase-architecture/SKILL.md) |
| clean-ddd-hexagonal | [`skills/clean-ddd-hexagonal/`](./skills/clean-ddd-hexagonal/SKILL.md) |
| logging-best-practices | [`skills/logging-best-practices/`](./skills/logging-best-practices/SKILL.md) |
| resolving-merge-conflicts | [`skills/resolving-merge-conflicts/`](./skills/resolving-merge-conflicts/SKILL.md) |
| simplicity | [`skills/simplicity/`](./skills/simplicity/SKILL.md) · companions [`review`](./skills/simplicity/review.md) / [`audit`](./skills/simplicity/audit.md) / [`debt`](./skills/simplicity/debt.md) |
| design | [`skills/design/`](./skills/design/SKILL.md) · ship phases 6+8 · agents `design-architect` / `design-auditor` |
| stacking-prs | [`skills/stacking-prs/`](./skills/stacking-prs/SKILL.md) · rule [`stacking-prs.mdc`](./rules/stacking-prs.mdc) |

Refs: engineering → [`references/engineering/`](./references/engineering/) · contract → [`references/spec/contract-format.md`](./references/spec/contract-format.md) · design packs → [`references/data-systems/`](./references/data-systems/) · [`references/system-design-101/`](./references/system-design-101/) · smells → [`references/refactoring/`](./references/refactoring/) · lint → [`references/lint/`](./references/lint/README.md) · guardrails → [`references/guardrails/catalog.md`](./references/guardrails/catalog.md).

---

## Rule index

All `rules/*.mdc` — **`alwaysApply: true`**.

| Rule | Path |
| ---- | ---- |
| adoption | [`rules/adoption.mdc`](./rules/adoption.mdc) |
| anti-patterns | [`rules/anti-patterns.mdc`](./rules/anti-patterns.mdc) |
| architecture | [`rules/architecture.mdc`](./rules/architecture.mdc) |
| branching | [`rules/branching.mdc`](./rules/branching.mdc) |
| ci-taxonomy | [`rules/ci-taxonomy.mdc`](./rules/ci-taxonomy.mdc) |
| coding-principles | [`rules/coding-principles.mdc`](./rules/coding-principles.mdc) |
| concise | [`rules/concise.mdc`](./rules/concise.mdc) |
| contract-mode | [`rules/contract-mode.mdc`](./rules/contract-mode.mdc) |
| custom-validators | [`rules/custom-validators.mdc`](./rules/custom-validators.mdc) |
| delegation | [`rules/delegation.mdc`](./rules/delegation.mdc) |
| design | [`rules/design.mdc`](./rules/design.mdc) · ship-owned unified design |
| design-goals | [`rules/design-goals.mdc`](./rules/design-goals.mdc) |
| folder-structure | [`rules/folder-structure.mdc`](./rules/folder-structure.mdc) |
| glossary | [`rules/glossary.mdc`](./rules/glossary.mdc) |
| lint-strategy | [`rules/lint-strategy.mdc`](./rules/lint-strategy.mdc) |
| model | [`rules/model.mdc`](./rules/model.mdc) |
| observability | [`rules/observability.mdc`](./rules/observability.mdc) |
| pre-build | [`rules/pre-build.mdc`](./rules/pre-build.mdc) |
| pre-commit | [`rules/pre-commit.mdc`](./rules/pre-commit.mdc) |
| review-policy | [`rules/review-policy.mdc`](./rules/review-policy.mdc) |
| security | [`rules/security.mdc`](./rules/security.mdc) |
| ship | [`rules/ship.mdc`](./rules/ship.mdc) · [`commands/ship.md`](./commands/ship.md) |
| simplicity | [`rules/simplicity.mdc`](./rules/simplicity.mdc) |
| skill-library | [`rules/skill-library.mdc`](./rules/skill-library.mdc) |
| stacking-prs | [`rules/stacking-prs.mdc`](./rules/stacking-prs.mdc) |
| subagents | [`rules/subagents.mdc`](./rules/subagents.mdc) |
| summary | [`rules/summary.mdc`](./rules/summary.mdc) |
| testing | [`rules/testing.mdc`](./rules/testing.mdc) |

---

## Related

| Doc | Role |
| --- | ---- |
| [`README.md`](./README.md) | Install / layout |
| [`agents/README.md`](./agents/README.md) | Subagent roster |
| [`commands/ship.md`](./commands/ship.md) | Sole slash command |
| [`references/spec/contract-format.md`](./references/spec/contract-format.md) | `SPEC.md` schema (§G…§B) |
| [`references/ship/state.schema.json`](./references/ship/state.schema.json) | `state.json` schema |
| [`references/ship/release-lifecycle.md`](./references/ship/release-lifecycle.md) | Env promotion |
| [`references/lint/`](./references/lint/README.md) | Lint/format presets |
| [`references/pack/agents-root-template.md`](./references/pack/agents-root-template.md) | Repo-root `AGENTS.md` template |
