# Playbook — Engineering Guardrails, Lint & Agent Workflows

> **Audience:** Any team building or maintaining a codebase.  
> **Pack entry:** [`.cursor/AGENTS.md`](./.cursor/AGENTS.md)  
> **Source layout (v2):** [`.cursor/`](./.cursor/README.md) — `rules/`, `skills/`, `agents/`, `references/`, `commands/`.

---

## How this is organized

| Surface | Path | Holds |
| ------- | ---- | ----- |
| **Agents** | [`.cursor/agents/<name>.md`](./.cursor/agents/) | Cursor [subagents](https://cursor.com/docs/subagents) (Tier 1–3) |
| **Rules** | [`.cursor/rules/<slug>.mdc`](./.cursor/rules/) | Topics + workflow (`ship`, `caveman`, `subagents`, …) |
| **Skills** | [`.cursor/skills/<slug>/`](./.cursor/skills/) | Invokable procedures + companions |
| **References** | [`.cursor/references/<category>/<slug>.md`](./.cursor/references/) | Deep reference docs |
| **Commands** | [`.cursor/commands/`](./.cursor/commands/) | Slash commands (`/ship`, `/dda`) |

---

## Topics (rules)

### Foundations

1. [Design goals](./.cursor/rules/design-goals.mdc)
2. [The three-layer quality model](./.cursor/rules/model.mdc)

### Spec-driven development

1. [Spec-driven development (SDD)](./.cursor/rules/spec-driven-development.mdc)
2. [Pre-build discipline](./.cursor/rules/pre-build.mdc)

### Quality gates

1. [Lint strategy](./.cursor/rules/lint-strategy.mdc)
2. [Pre-commit](./.cursor/rules/pre-commit.mdc)
3. [CI guardrail taxonomy](./.cursor/rules/ci-taxonomy.mdc)
4. [Custom validators](./.cursor/rules/custom-validators.mdc)

### Engineering practice

1. [Coding principles](./.cursor/rules/coding-principles.mdc)
2. [Architecture guardrails](./.cursor/rules/architecture.mdc)
3. [Security guardrails](./.cursor/rules/security.mdc)
4. [Observability & logging](./.cursor/rules/observability.mdc)
5. [Branching & change discipline](./.cursor/rules/branching.mdc)
6. [Testing strategy](./.cursor/rules/testing.mdc)
7. [Review severity & merge policy](./.cursor/rules/review-policy.mdc)

### Agent workflows

1. [Skill library](./.cursor/rules/skill-library.mdc)
2. [Caveman](./.cursor/rules/caveman.mdc)
3. [Ship](./.cursor/rules/ship.mdc) · command [`/ship`](./.cursor/commands/ship.md) (owns DDA specialists)
4. [Cavecrew](./.cursor/rules/cavecrew.mdc) (pattern)
5. [Subagents](./.cursor/rules/subagents.mdc) · presets [`.cursor/agents/`](./.cursor/agents/) (Tier 1–2, DDA under ship)
6. [DDA](./.cursor/rules/dda.mdc) · thin [`/dda`](./.cursor/commands/dda.md) → ship · refs [`references/dda/`](./.cursor/references/dda/)

### Reference

1. [Adoption checklist](./.cursor/rules/adoption.mdc)
2. [Anti-patterns](./.cursor/rules/anti-patterns.mdc)
3. [Glossary & decision trees](./.cursor/rules/glossary.mdc)
4. [Summary](./.cursor/rules/summary.mdc)

---

## Pipelines

Connected ASCII + router: [`.cursor/AGENTS.md`](./.cursor/AGENTS.md) § Pipelines.  
Lost? → [`.cursor/skills/ask/SKILL.md`](./.cursor/skills/ask/SKILL.md).  
Orchestrated delivery → [`.cursor/commands/ship.md`](./.cursor/commands/ship.md).  
Data-intensive design → [`.cursor/commands/dda.md`](./.cursor/commands/dda.md).

```
setup → grill* → [prototype] → [research] → spec → to-tickets → build×N → tdd → code-review
On-ramps: triage | wayfinder | diagnosing-bugs → (rejoin)
FORMAT.md /ship /cavecrew /dda → pack rules + `agents/` + repo-root cavekit rails
```

---

## Skills

Router: [`.cursor/skills/ask/SKILL.md`](./.cursor/skills/ask/SKILL.md).

| Group | Skills |
| ----- | ------ |
| **Delivery** | `setup-skills`, `grill`, `grill-with-docs`, `domain-modeling`, `prototype`, `research`, `spec`, `to-tickets`, `build` |
| **Quality** | `tdd`, `code-review`, `diagnosing-bugs`, `logging-best-practices`, `resolving-merge-conflicts`, `dda` |
| **Design** | `codebase-design`, `improve-codebase-architecture`, `clean-ddd-hexagonal` |
| **Ops / teach** | `ask`, `handoff`, `to-tickets`, `triage`, `wayfinder`, `teach`, `writing-great-skills` |

Path: `.cursor/skills/<slug>/SKILL.md`.

---

## File contract

| Layer | Path | Role |
| ----- | ---- | ---- |
| Pack entry | `.cursor/AGENTS.md` | Pipelines + indexes |
| Rules | `.cursor/rules/<slug>.mdc` | Full topics + Cursor frontmatter |
| Skills | `.cursor/skills/<slug>/` | Full skill trees |
| References | `.cursor/references/<category>/<slug>.md` | Deep reference docs |
| Commands | `.cursor/commands/<slug>.md` | Slash commands |

Do not put chapter bodies back into this index. Details live under `.cursor/`.
