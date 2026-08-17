# Build contract format — `SPEC.md`

Single file. Every contract-mode skill in this pack reads it. **This document is the schema authority** — when a rule, skill, or agent disagrees with it, this file wins.

**Path:** default `SPEC.md` at repo root. During `/ship`, path = `.runs/ship/<ticket-id>/SPEC.md` (see `state.json` → `spec_path`). Same schema either way — never a second format.

**Skills that read it:** [`contract`](../../skills/contract/SKILL.md) · [`build`](../../skills/build/SKILL.md) · [`contract-check`](../../skills/contract-check/SKILL.md) · [`contract-backprop`](../../skills/contract-backprop/SKILL.md) · reach-for [`grill`](../../skills/grill/SKILL.md) / [`research`](../../skills/research/SKILL.md).

## Sections

Fixed order, fixed headers, addressable. A section may be absent (skip it — e.g. §R only exists if research ran) but is never reordered.

```
# SPEC

## §G GOAL
one line. what code must do.

## §C CONSTRAINTS
- bullet. non-negotiable boundary.
- bullet. tech/lang/lib locked in.

## §I INTERFACES
external surface. what world sees.
- cmd: `foo bar` → stdout JSON
- api: POST /x → 200 {id}
- file: `config.yaml` schema …
- env: `FOO_KEY` required

## §R RESEARCH
optional. external-knowledge log. pipe table. present only if research ran.
durable ∴ build never re-derives & never hallucinates lib facts.
id|topic|finding|src
R1|jwt lib|`jose` > `jsonwebtoken` — maintained, ESM, 0 deps|github.com/panva/jose
R2|rate limit|token bucket ok @ our scale|<url>

## §V INVARIANTS
numbered. testable. each ! MUST hold.
V1: ∀ req → auth check before handler
V2: token expiry ≤ ⊥ allowed
V3: DB write ! in transaction

## §T TASKS
pipe table. ids monotonic (never reused). status: `x` done / `~` wip / `.` todo.
id|status|task|cites
T1|.|scaffold repo|-
T2|.|impl §I.api POST /x|V2
T3|x|add §V.1 middleware|V1,I.api

## §B BUGS
pipe table. backprop log. each row = bug + invariant that catches recurrence.
id|date|cause|fix
B1|2026-04-20|token `<` not `≤`|V2
B2|2026-04-21|race on write|V3
```

**Table cell rules:** literal `|` → escape as `\|`. Backticks OK. Cells trimmed. Empty = `-`.

## Addressing

`§.` = section.item. `§V.2` = invariants section, item 2. Use § addressing **inside `SPEC.md` and agent chat** for zero ambiguity.

**Do not** put `§T` / `§V` / `Tn` / `Vn` in git commits, PR titles/bodies, or product source/tests — use plain Conventional Commits and English behavior names. Map: §T.3 → `feat(scope): <goal in words>`.

## Concise encoding

Default for every section. Full style guide → [`../../rules/concise.mdc`](../../rules/concise.mdc).

- Drop articles (a, an, the). Drop filler.
- Drop aux verbs (is, are, was) where a fragment works.
- Short synonyms (fix > implement).
- Fragments fine.

**Preserve verbatim:** code, paths, identifiers, URLs, numbers, error strings, SQL, regex.

**Symbols** (save tokens, machine-readable):

```
→   leads to / becomes / triggers
∴   therefore / fix
∀   for all / every
∃   exists / some
!   must
?   may / optional
⊥   never / impossible / forbidden
≠   not equal / differs from
∈   in / member of
∉   not in
≤   at most
≥   at least
&   and
|   or
```

**Bad** (prose):

> The authentication middleware must verify the token expiry on every request before allowing the handler to execute.

**Good** (concise):

> V1: ∀ req → auth check before handler

**Bad** (prose bug note):

> Fixed a bug where token expiry comparison used strict less-than instead of less-than-or-equal, causing tokens to be rejected exactly at their expiry timestamp.

**Good** (concise):

> B1: token `<` not `<=` ∴ tokens rejected @ expiry. §V.2 now ! `≤`.

### Why concise for contracts

The contract is loaded every invocation. ~75% fewer tokens = ~75% fewer dollars and faster reads. Humans skim it faster too, and the symbols are unambiguous.

## One file rule

Big project → more sections, not more files. grep ceremony kills agent speed. If `SPEC.md` > 500 lines, compact §B (drop oldest bugs) before splitting.

## Writes — sectioned ownership

Each verb owns specific sections. No verb rewrites a section it does not own. That rule alone kills the "tool deleted my spec" failure mode.

| Skill | Writes | Sections |
| ----- | ------ | -------- |
| `grill` | sharpens | §G + §C (proposes; writes on OK) |
| `contract` NEW | creates | all |
| `contract` AMEND | edits | named only |
| `contract` BACKPROP | appends | §B + §V |
| `research` | appends | §R |
| `code-review` | hardens | §V (+ risk report, no silent rewrite) |
| `build` | flips | §T status cell `.` → `~` → `x` |
| `contract-check` | — | read only |

`contract` is the general editor — any cross-cutting edit routes through it. Every other verb shows a diff and touches only its own sections. Compaction (dropping oldest §B rows when the file exceeds 500 lines, per the one file rule) is the one sanctioned §B rewrite — route it through `contract`, which shows the diff before dropping rows.

## Right-size

Ceremony scales to blast radius, never to ego. One-line fix → just `build`. New feature in a shared module → `grill` then review first. The full grill → contract → research → review → build chain is for genuinely uncertain or high-blast-radius work, ⊥ for a typo. Skip any verb that would cost more attention than the change is worth.

---

**References:** [`..`](..) · **Pack:** [AGENTS](../../AGENTS.md) · **Rules:** [`contract-mode`](../../rules/contract-mode.mdc)
