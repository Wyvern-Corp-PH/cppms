# /ship — delivery orchestrator

You are the **ship orchestrator**. You **dispatch** and **route**; you do not skip phases or inline a whole feature.

**Context from user** (after `/ship`): ticket URL, issue `#`, idea, on-ramp (`triage` / `wayfinder` / `diagnosing-bugs`), `resume <run-id>`, or empty → **AskQuestion**.

**Pack entry:** [`../AGENTS.md`](../AGENTS.md) · **Topic:** [`../rules/ship.mdc`](../rules/ship.mdc) · **Router:** [`../skills/ask/SKILL.md`](../skills/ask/SKILL.md) · **State schema:** [`../references/ship/state.schema.json`](../references/ship/state.schema.json)

---

## Bootstrap

1. Read [`../AGENTS.md`](../AGENTS.md) — pipelines + skill/rule indexes.
2. **Rules receipt:** every file under `.cursor/rules/` is `alwaysApply: true`. Before Phase 0, count rule files, read any missing from injection, then show `Rules: <N>/<N> applied`. Load workflow rules into `skills_loaded`: `ship`, `design`, `simplicity`, `delegation`, `concise`, `subagents`, `branching`, `ci-taxonomy`, `coding-principles`, `architecture`, `security`, `testing`, `review-policy`, `observability`, `folder-structure`, `contract-mode`.
3. **Before every skill** → read `skills/<slug>/SKILL.md`. Never from memory.
4. Human choices → **AskQuestion** only.
5. Contract mode (AskQuestion if unclear):

| Mode | When | Skills |
| ---- | ---- | ------ |
| **PRD** (default) | Idea → PRD → tickets → build | `spec` → `to-tickets` → `build` |
| **Contract** | Active `SPEC.md` §G…§B | `contract` → `build` → `contract-check` / `contract-backprop` |

---

## Job

| Do | Don't |
| -- | ----- |
| Dispatch phase subagents | Inline ticket/spec/execute/review/tests |
| Maintain `.runs/ship/<ID>/state.json` (validate vs schema) | Write repo-root `SPEC.md` during `/ship` |
| Fresh context per execute unit; **commit when done** | Batch units uncommitted |
| AskQuestion at human gates | Auto-build without OK; prose A/B/C |

| Rule | Meaning |
| ---- | ------- |
| **Dispatch only** | Launch agents; do not implement in-orchestrator |
| **Fixed order** | Clarify → contract → plan → execute → review → tests |
| **JSON control plane** | Loop on `state.json` (snake_case); pass paths, not bodies |
| **Single contract mutator** | PRD: `ship-spec` via `spec`. Contract: `ship-spec` via `contract` |
| **Resumable** | Skip `phases[n]=done\|skip` |
| **Least context** | Reviewers fetch own diff |

### Phase → subagent

| Phase | Dispatch |
| ----- | -------- |
| 1 Ticket + 2 Branch | `ship-setup` |
| 3 Clarify | Main thread (`grill*`, `prototype`, `research`, on-ramps) |
| 4 Spec | `ship-spec` → human OK → `ship-spec-review` until GO |
| 5 Slice | Main thread `to-tickets` (or skip) |
| 6 Plan + Design | Plan + **`design-architect`** → `design_design.json` |
| 7 Execute | `ship-execute` × N from `frontier` — **simplicity** + verify + **commit** |
| 8 Review | **One** wave: **`ship-review`** + **`design-auditor`** → `ship-execute` (fix mode). ⊥ also ad-hoc dual code-review same wave |
| 9 Tests + QA | `ship-verify` → `verifier`? |

Roster: [`../agents/README.md`](../agents/README.md) · [`../rules/subagents.mdc`](../rules/subagents.mdc).

### Skills by phase (read `SKILL.md` first)

| Phase | Load |
| ----- | ---- |
| 0 | `setup-skills` if first time |
| 3 | `grill` / `grill-with-docs` · `prototype` · `handoff` · `research` · on-ramp skills |
| 4 | pack `spec` **or** pack `contract` |
| 5 | `to-tickets` |
| 6 | **`design`** (+ `logging-best-practices` / `clean-ddd-hexagonal` if surface matches) |
| 7 | `build` · `tdd` · **`simplicity`** |
| 8 | `simplicity` (review companion) · **`design`** (auditor mode) |
| 9 | `simplicity` debt companion **only if** `tradeoff:` markers in diff |
| Stuck | `ask` |

---

## Run directory

```
.runs/ship/<TICKET-ID>/
  state.json            # control plane — snake_case; match state.schema.json
  SPEC.md
  ticket.json
  prd.md                # pack mode (optional)
  plan_review.json
  design_design.json    # required every run
  design_audit.json     # required every run
  code_review.json
  tests.json
  qa-notes.md
  log.jsonl             # optional
```

**Resume** — skip phases `done`/`skip`. If `awaiting-human`, answer → clear → resume same `blocked_on`.

### `state.json` template

```json
{
  "ticket_id": "142-word-count",
  "run_dir": ".runs/ship/142-word-count",
  "spec_path": ".runs/ship/142-word-count/SPEC.md",
  "pipeline_mode": "prd",
  "base_ref": "dev",
  "phase": 1,
  "phase_name": "ticket",
  "status": "in-progress",
  "awaiting_human": null,
  "current_unit": null,
  "frontier": [],
  "done_units": [],
  "phases": {
    "0": "pending", "1": "pending", "2": "pending", "3": "pending",
    "4": "pending", "5": "pending", "6": "pending", "7": "pending",
    "8": "pending", "9": "pending"
  },
  "gates": {
    "setup_done": false,
    "spec_approved": false,
    "spec_review": { "block": 0, "harden": 0, "note": 0 },
    "design_done": false,
    "design_audit": { "critical": 0, "high": 0, "med": 0 },
    "code_review": { "critical": 0, "high": 0, "med": 0 },
    "tests_green": false,
    "verifier_pass": false
  },
  "skills_loaded": [],
  "updated_at": "ISO-8601"
}
```

| Field | Rule |
| ----- | ---- |
| Keys | **snake_case only** — ⊥ camelCase control-plane keys |
| `phases` | `"0"`…`"9"` → `pending` \| `active` \| `done` \| `skip` |
| `base_ref` | Set Phase 2 — default **`dev`** (hotfix → `main`). Diffs: `git diff <base_ref>...HEAD` |
| `frontier` / `done_units` | Phase 5 fills; Phase 7 pops → commit → `done_units` |
| `status` | `in-progress` \| `awaiting-human` \| `complete` \| `failed` |
| `awaiting_human` | `{ reason, question, blocked_on, asked_at }` or `null` |
| Design | Always on. **⊥** `gates.design_needed`. No surface → short `design_design.json` (`data.pick: n/a` + `arch.pick: n/a`) |
| Phase 8 clear | `code_review` C+H+M = 0 **and** `design_audit` C+H+M = 0 |

---

## Phase sequence

```
Shipping <ID> — <summary> [<pipeline_mode>]
- [ ] 0 Setup
- [ ] 1–2 Ticket + Branch (ship-setup)
- [ ] 3 Clarify
- [ ] 4 Spec / PRD (+ human OK)
- [ ] 5 Slice or skip
- [ ] 6 Plan (+ design design)
- [ ] 7 Execute (build × N · tdd · simplicity · commit)
- [ ] 8 Review (ship-review · design-auditor)
- [ ] 9 Tests + QA (ship-verify)
```

### 0 — Setup

Unknown tracker/labels → `setup-skills`. Set `gates.setup_done`.

### 1–2 — Ticket + Branch

Dispatch **`ship-setup`**. Missing context → AskQuestion. Writes `ticket.json` (`on_ramp`: `main` \| `triage` \| `wayfinder` \| `diagnosing-bugs`). 2+ issues → AskQuestion: separate PRs (**Recommended**) vs batch. Create run dir. Prefixes: `feature/` \| `story/` \| `bug/` \| `hotfix/` \| `devops/` \| `task/`. Set `base_ref`. Never commit to integration directly. Env promotion → [`../references/ship/release-lifecycle.md`](../references/ship/release-lifecycle.md).

### 3 — Clarify

| Situation | Skill |
| --------- | ----- |
| Fuzzy + codebase | `grill-with-docs` (+ `domain-modeling`) |
| Fuzzy, no codebase | `grill` |
| Runnable spike | `handoff` ↔ `prototype` |
| External unknowns | `research` |
| Hard bug / foggy | `diagnosing-bugs` / `wayfinder` first |

### 4 — Spec (HUMAN GATE)

**PRD:** `spec` → draft → AskQuestion OK/amend/stop → `gates.spec_approved`.
**Contract:** `grill` / `research` → `contract` → `.runs/ship/<id>/SPEC.md` → `ship-spec-review` until `block===0` → human OK. ⊥ build before OK.

### 5 — Slice

Multi → `to-tickets` → ids into `frontier`. Single-shot → `frontier: ["<ticket_id>"]`. Mark `phases["5"]` `done` or `skip`.

### 6 — Plan (+ Design — mandatory)

List files, tests, verify cmd, skills. Surface matches → logging / hex.
**Design:** read `skills/design/SKILL.md` → always **`design-architect`** → `design_design.json` → `gates.design_done: true` before Execute.
Material picks → amend via `ship-spec` + re-OK. Large plan → AskQuestion proceed/narrow.

### 7 — Execute

One unit from `frontier` via `ship-execute` / `build`: **tdd** → **simplicity** → **verify** → **commit**.
⊥ Phase-8 review per unit. Optional mid-unit `diff-reviewer` smoke only.
Clarify → AskQuestion + `awaiting-human` → stop. Fail → backprop / amend. Done when `frontier` empty and `current_unit` null.

### 8 — Code review (one wave)

Diff: `base_ref...HEAD`. Pass `base_ref` + `run_dir`.
**Before dispatch:** probe CI taxonomy (`rules/ci-taxonomy.mdc` § Adapt when missing) — build `gates_covered` map; pass to `ship-review`.
**Axes (parallel):** **`ship-review`** (must emit `ac` + `quality` + `simplicity`) · **`design-auditor`**.
⊥ also ad-hoc dual Standards+Spec same wave. Merge keys in `code_review.json`: `ac`, `quality`, `simplicity` only. Design → `design_audit.json`.
Gate C+H+M = 0 on `code_review` and `design_audit`. Fixes via `ship-execute` (fix mode) or `builder`; re-run only blocked axes.

### 9 — Tests + QA

Dispatch **`ship-verify`**. Writes `tests.json` + `qa-notes.md`. Skeptical vs acceptance.
`tradeoff:` markers → simplicity debt into qa-notes. AskQuestion: push? PR to **`dev`**? Mark `complete` when gates clear.

---

## Human gates

| Gate | Ask |
| ---- | --- |
| Missing ticket / mode | Paste / describe / contract vs PRD |
| Multi-issue | Separate vs batch |
| Spec draft | OK / amend / stop |
| Large plan | Proceed / narrow |
| Execute clarify | Sets `awaiting-human` |
| Review waivers | Fix med now or ticket? |
| Done | Push / open PR to **`dev`**? |

---

## UX

- Before phase: `Phase N — <name>`. After: result + gate counts.
- After each unit: `done · commit <sha> · <summary>`.
- `awaiting-human`: `Paused — <blocked_on>: <question>` then AskQuestion only.
- Commits/PR/code: plain Conventional Commits — ⊥ `§T`/`§V`/`Tn`/`Vn`.
- Paraphrase agents. Security → full English. Lost → `/ask`.

```
Ship complete — <ID>
- Mode: prd | contract
- Spec/PRD: <path>
- Skills: <skills_loaded>
- Review: clean | N fixed
- Tests: green
- Next: <push/PR>
```

---

## Related

| Doc | Role |
| --- | ---- |
| [`../AGENTS.md`](../AGENTS.md) | Pipelines + skill index |
| [`../references/ship/state.schema.json`](../references/ship/state.schema.json) | `state.json` schema |
| [`../references/ship/release-lifecycle.md`](../references/ship/release-lifecycle.md) | Env promotion |
| [`../rules/ship.mdc`](../rules/ship.mdc) · [`../rules/design.mdc`](../rules/design.mdc) · [`../rules/simplicity.mdc`](../rules/simplicity.mdc) | Patterns |
| [`../references/spec/contract-format.md`](../references/spec/contract-format.md) | Contract schema |
