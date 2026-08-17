---
name: contract
description: |
  Create, amend, distill, or backprop bugs into the build contract (SPEC.md).
  Sole mutator of the contract. During /ship the path is
  .runs/ship/<id>/SPEC.md; ad-hoc uses repo-root SPEC.md. Triggers when the
  user asks to write a contract, start a new contract, distill one from
  existing code, add invariants, amend sections (§G, §C, §I, §V, §T, §B), or
  record a bug. Common phrasings: "write the contract for...", "new contract",
  "bug: ...", "amend §V.3", "distill contract from code". Does NOT write a
  product PRD — that is the `spec` skill. Does NOT implement code — that is
  `build`.
---

# contract — build contract mutator

Read [`../../references/spec/contract-format.md`](../../references/spec/contract-format.md) if not already loaded. It is the schema authority. Concise encoding applies to every write here.

**This skill is for contract mode** (`§G`…`§B` invariant contract). For product-requirement documents that feed `to-tickets`, use [`spec`](../spec/SKILL.md) instead. Mode routing → [`ask`](../ask/SKILL.md).

## Contract path (resolve first)

Before dispatch, resolve which file is the contract:

1. **Active `/ship` run** — read `.runs/ship/*/state.json` for `status: in-progress`, or use `spec_path` from orchestrator context → write that path (typically `.runs/ship/<ticket-id>/SPEC.md`).
2. **Explicit path** in user args (`spec_path: …`) → use it.
3. **Default** — repo-root `SPEC.md`.

During `/ship`, never write repo-root `SPEC.md`.

## Dispatch

Inspect the user request and project state at the resolved contract path:

| Condition | Mode |
| --------- | ---- |
| No file at path AND args describe an idea | **NEW** |
| No file AND `from-code` in args | **DISTILL** |
| File exists AND args start `bug:` | **BACKPROP** |
| File exists AND args start `amend` | **AMEND** |
| File exists, no args | Ask the user which mode (AskQuestion) |

## NEW — idea → contract

Input: user idea.

1. Extract the goal (one line, concise) → §G.
2. List constraints the user stated or implied → §C.
3. List external surfaces the user named → §I.
4. Propose initial invariants → §V (numbered `V1`…).
5. Break the goal into ordered tasks → §T pipe table, all status `.`, ids `T1`…
6. Add §B with the header row only (`id|date|cause|fix`).

Write to the resolved path. Show the user the full file. Ask (AskQuestion): contract OK, or suggest edits?

**Never auto-build after writing.** The human confirms, then invokes `build`.

## DISTILL — code → contract

Walk the repo. Produce:

| Section | Source |
| ------- | ------ |
| §G | README, package manifest, main entry |
| §C | Detected stack and lockfile |
| §I | Public APIs, CLIs, config files, env vars |
| §V | Existing tests and assertions |
| §T | One task per known TODO or missing test |
| §B | Empty (header row only) |

Concise everywhere. Flag uncertain items with `?` so the user can confirm rather than inherit a guess as fact.

## BACKPROP — bug → §B + §V

Input: `bug: <description>`. Full six-step protocol → [`contract-backprop`](../contract-backprop/SKILL.md).

1. Parse the bug description.
2. Find the root cause (read the relevant code).
3. Decide: would a new invariant catch recurrence? If yes → draft `V<next>`.
4. Append the §B row: `B<next>|<date>|<cause>|V<N>`.
5. Append the new invariant to §V.
6. If the fix also changes behavior → add or update §T rows.
7. Show the diff. Apply only on user OK.

**Rule:** every bug gets a §B row. A new invariant is optional but preferred.

## AMEND — targeted edit

Input: `amend §V.3`, `amend §T`, etc.

Read that section. Show the current content. Ask what changes. Write. Show the diff.

**Never silently rewrite sections the user did not name.**

## Output rules

- Concise format per the contract-format reference.
- Preserve identifiers, paths, and code verbatim.
- Numbering monotonic — never reuse `§V.N`, `§T.N`, `§B.N`, or `§R.N`.
- §T `cites` column must list §V/§I deps: `T5|.|impl auth mw|V2,I.api`.
- Commits describing contract work use plain Conventional Commits — ⊥ `§T`/`§V`/`Tn`/`Vn` in git history.

## Non-goals

- **No sub-agents.** Main thread writes the contract.
- No dashboards, no logs, no state files beyond the contract itself (ship runs keep it under `.runs/ship/<id>/`).
- No auto-build after a write. The user invokes `build` explicitly.
- No PRD authoring — that is [`spec`](../spec/SKILL.md).
