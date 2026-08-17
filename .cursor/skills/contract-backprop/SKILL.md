---
name: contract-backprop
description: |
  Bug → contract protocol. When a bug is found or a test fails, trace the
  cause, decide whether a new §V invariant would catch recurrence, and append
  to §B. This is the one non-obvious thing contract mode does that
  plan-then-execute does not. Triggers on test failure, bug report,
  post-mortem, or explicit user ask. Writes the contract via the `contract`
  skill — it does not own §G…§B directly.
---

# contract-backprop — bug → contract

Plan-then-execute fixes the code and forgets. Contract mode fixes the code **and** edits the contract so recurrence is impossible. That edit is backprop.

Schema → [`../../references/spec/contract-format.md`](../../references/spec/contract-format.md). Contract writes route through [`contract`](../contract/SKILL.md).

## When to backprop

- A test failed at `build` verification.
- The user reports a bug.
- Post-mortem after a production incident.
- [`contract-check`](../contract-check/SKILL.md) flags VIOLATE and the root cause is found.

## Six steps

### 1. Trace

Read the failure output or bug report. Find the exact `file:line` of the wrong behavior. Name the root cause in one concise sentence.

### 2. Analyze

Ask three questions:

- Would a new §V invariant catch this **class** of bug? (most common: yes)
- Is §I wrong — did the contract claim a shape the code cannot deliver? (sometimes)
- Is §T wrong — did we build the wrong thing? (rare but real)

### 3. Propose

Draft the contract change. Never skip §B; §V/§I/§T are case-by-case.

```
§B row:  B<next>|<date>|<root cause>|V<N>
§V line: V<next>: <testable rule that would have caught it>
```

Example:

```
§B row:  B3|2026-04-20|refund job ran twice on retry|V7
§V line: V7: ∀ refund → idempotency key check before charge reversal
```

### 4. Generate test

A new invariant without a test is a lie. Add the failing test first.

Name the test after the **behavior**, not the invariant id: `should_refund_idempotently` — ⊥ `TestV7_*` or `§V` in product test names. The invariant mapping stays in the contract and agent chat.

### 5. Verify

Fix the code. Run the test — must pass. Run the full suite — must not regress.

### 6. Log

Commit the contract edit, test, and code fix together. Use plain Conventional Commits describing the behavior: `fix(refund): make retry idempotent` — ⊥ `§B.3` / `§V.7` / `Bn` / `Vn` in the message.

## What makes a good invariant

- Testable in code (grep-able or assert-able).
- Scoped to a behavior, not a file.
- Stated positively where possible (`! hold` over `⊥ forbid`).
- References the §I surface where it applies.

| Bad | Good |
| --- | ---- |
| `V8: code should be correct` | `V8: ∀ pg_query ! params interpolated via driver — ⊥ string concat` |

## When not to add §V

- The bug was a purely mechanical typo with no class (`i++` vs `i--` in throwaway code).
- The fix is a one-time migration.
- The root cause is an external dependency (upgrade it instead; note in §C).

Still append the §B row — record that this failure mode was considered. A future bug with the same smell finds the precedent by searching §B.

## Output shape

Every backprop run produces:

1. §B entry (always).
2. §V entry (usually).
3. Test file (when §V added).
4. Code fix.
5. One commit.

No dashboards. No log files. The contract plus git is the full history (ship runs: under `.runs/ship/<id>/`).
