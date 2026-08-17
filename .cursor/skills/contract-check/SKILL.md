---
name: contract-check
description: |
  Read-only drift detector for the build contract. Diffs SPEC.md against
  current code and reports violations grouped by severity. Writes nothing —
  suggests remedies via the contract or build skills but never invokes them.
  Triggers when the user asks to check drift, audit the contract, verify
  invariants, or ask whether code still matches the contract. Phrasings:
  "check drift", "audit the contract", "does the code still match §V",
  "check invariants", "contract vs code".
---

# contract-check — drift report

Pure diagnostic. Reports violations. **Writes nothing.** The user decides the remedy.

Schema → [`../../references/spec/contract-format.md`](../../references/spec/contract-format.md).

## Contract path (resolve first)

Same as [`build`](../build/SKILL.md): `state.json` → `spec_path` during `/ship`, else repo-root `SPEC.md`.

## Load

1. Read the contract at the resolved path. Missing → "no contract, nothing to check." Stop.
2. Parse invocation args:

| Arg | Scope |
| --- | ----- |
| `§V` | Invariants only (default) |
| `§I` | Interfaces |
| `§T` | Task status vs code |
| `--all` | All three |

## Check §V — invariants

For each `V<n>`:

1. Translate the invariant into a verifiable claim about the code.
2. Grep / read the relevant files.
3. Classify: **HOLD** / **VIOLATE** / **UNVERIFIABLE**.
4. Record the address plus `file:line` evidence.

## Check §I — interfaces

For each §I item:

1. Locate the implementation.
2. Classify:

| Verdict | Meaning |
| ------- | ------- |
| **MATCH** | Shape in code = shape in contract |
| **DRIFT** | Implementation exists, shape differs |
| **MISSING** | Implementation absent |
| **EXTRA** | Code exposes a surface not in §I |

## Check §T — tasks

For each `T<n>`:

1. `x` → verify the claimed work is present.
2. `~` → note as in-progress.
3. `.` → note as pending.
4. Flag `x` rows with no evidence as **STALE**.

## Report

Concise. Grouped by severity.

```
## §V drift
V2 VIOLATE: auth/mw.go:47 uses `<` not `≤`. see §B.1.
V5 UNVERIFIABLE: no test covers ∀ req path.

## §I drift
I.api DRIFT: POST /x returns `{result}` not `{id}`. route.go:112.
I.cmd MISSING: `foo bar` absent from cli/*.go.

## §T drift
T3 STALE: status `x`, no middleware file exists.

## summary
2 violate. 1 missing. 1 stale. 1 unverifiable.
next: contract skill with `bug:` or fix code at cited lines.
```

## Remedy hints (not actions)

End the report with one line per class:

| Class | Hint |
| ----- | ---- |
| VIOLATE / DRIFT | Invoke `contract` with `bug: <V.n>`, or fix code at the cited lines |
| MISSING | Invoke `build` on `§T.n` if the task exists; else `contract amend §T` |
| STALE | `contract amend §T` to uncheck |
| EXTRA | `contract amend §I` to document, or delete the code |

**Never invoke fixes.** Report only.

## Non-goals

- Zero writes. No contract edits. No code edits.
- No sub-agents. Main thread reads.
- No scores, no grades. Binary per item: holds or drifts.
