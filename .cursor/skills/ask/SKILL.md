---
name: ask
description: Ask which skill or flow fits your situation. Router over this skill pack.
disable-model-invocation: true
---

# Ask

You don't remember every skill, so ask.

Skills live under `.cursor/skills/<slug>/`. Pipelines + indexes: [`.cursor/AGENTS.md`](../../AGENTS.md).

A **flow** is a path through the skills. One **main trunk**, three **on-ramps**, vocabulary underneath, standalones beside. Unsure? Stay here and pick a row from the router at the bottom of `AGENTS.md` §F.

## Precondition

**`/setup-skills`** — configure issue tracker, triage labels, and doc layout before the first engineering flow.

## The main flow: idea → ship

1. **`/grill-with-docs`** — sharpen the idea by interview when you **have a codebase** (stateful: `CONTEXT.md` + ADRs). No codebase? Use **`/grill`** (stateless). Both share the same grill primitive; `grill-with-docs` leaves a paper trail. Terms/ADRs → **`/domain-modeling`**.
2. **Branch — can you settle every question in conversation?** If a question needs a runnable answer, detour through a prototype, bridged by **`/handoff`** in both directions:
   - **`/handoff`** out → fresh session → **`/prototype`** → **`/handoff`** back.
3. **Optional — `/research`** when a decision needs primary-source facts before locking a PRD.
4. **Branch — multi-session build?**
   - **Yes** → **`/spec`** (PRD; was `/to-spec`) then **`/to-tickets`** (tracer bullets + blocking edges) → **`/build`** (was `/implement`) per ticket, **clearing context between each**.
   - **No** → **`/build`** in the same context window.

**`/build`** drives **`/tdd`** internally, then **`/code-review`** (Standards + Spec) before commit (only if the user asked to commit).

### Context hygiene

Keep steps 1–4 in **one unbroken context window** until after `/to-tickets`. Each `/build` starts fresh. If approaching the smart zone (~120k tokens), `/handoff` and continue in a new thread.

## On-ramps (merge into main)

| Situation | Path | Merge point |
| --------- | ---- | ----------- |
| Bugs / requests piling up | **`/triage`** → later **`/build`** | after triage; do **not** triage tickets `/to-tickets` already produced |
| Something's broken (hard) | **`/diagnosing-bugs`** → maybe **`/improve-codebase-architecture`** | fix first; deepen → idea for `/grill-with-docs` |
| Huge foggy effort | **`/wayfinder`** → **`/spec`** → `/to-tickets` → `/build` | at `/spec`; never map → `/build` unless effort proved small |

## Codebase health

- **`/improve-codebase-architecture`** — deepening opportunities; pick one → idea for `/grill-with-docs` (rejoins main).
- Vocabulary bench: **`/codebase-design`**. Layering / ports: **`/clean-ddd-hexagonal`** (pairs with folder blueprint). Logs: **`/logging-best-practices`**.
- Path map / placement: always-on [`folder-structure`](../../rules/folder-structure.mdc) · checklist [`references/engineering/folder-structure.md`](../../references/engineering/folder-structure.md) — use **`/clean-ddd-hexagonal`** when the map is layer- or context-shaped.

## Vocabulary underneath

- **`/domain-modeling`** — glossary + ADRs (`CONTEXT.md`).
- **`/codebase-design`** — deep-module vocabulary (used by `/tdd` and improve-*).
- **Folder blueprint** — where packages and roles live (rule + engineering ref above).
## Crossing sessions

- **`/handoff`** — compact to a file; open a **new** session referencing it.
- **`/compact`** (built-in) — stay in the same conversation.

## Standalone

- **`/grill`** / **`/prototype`** / **`/research`** — also usable alone.
- **`/teach`** — multi-session teaching workspace.
- **`/writing-great-skills`** — how to author skills.
- **`/resolving-merge-conflicts`**.
- **`/stacking-prs`** — split large work into stacked PRs (`gh stack`; ≤20–30 files/layer).

## Monorepo rails (not this pack)

If the active contract is a **`SPEC.md`** (repo root, or `.runs/ship/<id>/SPEC.md`), use the contract-mode skills — [`contract`](../contract/SKILL.md), [`build`](../build/SKILL.md), [`contract-check`](../contract-check/SKILL.md), [`contract-backprop`](../contract-backprop/SKILL.md) — not the PRD [`spec`](../spec/SKILL.md). Orchestration: `/ship`. Surgical locate/fix: delegation. Details: `AGENTS.md` §E.

## Rename cheat sheet

| Was | Now |
| --- | --- |
| `/grilling`, `/grill-me` | `/grill` |
| `/to-spec` | `/spec` |
| `/implement` | `/build` |
