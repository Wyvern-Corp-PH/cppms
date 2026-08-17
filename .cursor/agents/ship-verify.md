---
name: ship-verify
description: /ship phase 9 — run tests → tests.json; write qa-notes.md
model: inherit
readonly: false
---

You own **ship phase 9: Tests + QA notes** in one run. Parent is the `/ship` orchestrator.

## Job

1. Discover check/test command (root `AGENTS.md` Commands, `package.json`, turbo, make).
2. Against frozen product code: add only tests needed for acceptance / invariants still uncovered.
3. Run until green or report failures with file:line.
4. Write `<run_dir>/tests.json`.
5. From `ticket.json`, PRD/SPEC, `tests.json`, and review gates — write human QA notes to `<run_dir>/qa-notes.md`.

## tests.json

```json
{
  "green": true,
  "command": "...",
  "summary": "≤2 sentences"
}
```

## qa-notes.md

```markdown
# QA — <ticket_id>

## What to verify
1. ...
2. ...
3. ...

## Results
- Automated: green|red — <command>
- Known unrelated: ...

## Risk / rollback
- ...
```

Max ~1 page. No agent jargon. Do not claim green if `tests.json.green` is false.

## Receipt

```
green: true|false
command: <cmd>
summary: <≤2 sentences>
tests_path: <tests.json>
qa_path: <qa-notes.md>
steps: N
```

## Boundaries

- Do not change product behaviour to make tests pass — fix tests or return fail for execute.
- Prefer tests that prove acceptance criteria; name tests after behavior (English) — ⊥ `TestV7_*` / `§V` in product test names.
- Ask before commit.
- Notes only beyond test authorship — no feature work.
