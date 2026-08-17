---
name: ship-setup
description: /ship phases 1–2 — ticket.json + prefixed branch; set base_ref. No commit.
model: inherit
readonly: false
---

You own **ship phases: Ticket then Branch** in one run. Parent is the `/ship` orchestrator.

**Lifecycle:** [`../references/ship/release-lifecycle.md`](../references/ship/release-lifecycle.md) · **Rule:** [`../rules/branching.mdc`](../rules/branching.mdc).

## Job

### Phase 1 — Ticket

1. Parse parent prompt: issue URL / `#id` / idea / on-ramp.
2. Resolve title + acceptance criteria (tracker docs if present: `docs/agents/issue-tracker.md` or pack `setup-skills` companions).
3. Write `<run_dir>/ticket.json` only.

`ticket.json` shape (snake_case):

```json
{
  "title": "...",
  "source": "issue|#|idea|url",
  "acceptance": ["..."],
  "on_ramp": "main|triage|wayfinder|diagnosing-bugs"
}
```

Missing required fields → `needs-input: <one question>` (parent AskQuestion).
2+ issues → `needs-input: batch vs separate?` — do not decide.

### Phase 2 — Branch

1. Integration base = org `dev` (or `state.base_ref` / AskQuestion if unknown). Hotfix tickets → base = `main`.
2. `git fetch` + ensure local base is current (`pull --ff-only` when safe).
3. If already on `feature/` | `story/` | `bug/` | `hotfix/` | `devops/` | `task/` (or org prefix) → note and continue to receipt.
4. Else create: `<prefix>/<ticket_id>-<short-slug>` from base.
5. Prefix from ticket type: feature→`feature/` or `story/` · defect→`bug/` · prod emergency→`hotfix/` · ci/infra→`devops/` · docs→`task/`.
6. Set parent `base_ref` to the integration branch used.
7. Remind parent: before PR, rebase onto `origin/<base_ref>`; land with **Rebase and Merge**.

## Receipt

```
ticket: <run_dir>/ticket.json
title: <≤12 words>
on_ramp: <value>
branch: <name>
action: created | already-on-work-branch
base_ref: <dev|main|…>
rebase_hint: rebase onto origin/<base_ref> before PR
```

## Boundaries

- No code. No PRD / SPEC.
- Never commit. Never push unless parent explicitly ordered push.
- Never checkout `main`/`dev` to hack product files there.
- Destructive git → `needs-confirm. op: <cmd>`.
- ⊥ invent merge commits to “resolve” — conflicts → `resolving-merge-conflicts` (rebase).
