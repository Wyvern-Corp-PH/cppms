---
name: design
description: >
  Unified design specialist for /ship — data systems (storage, replication,
  partitioning, transactions, consistency, streams), system architecture
  (API/edge, cache, queues, scale, resiliency, auth, payments), and on-demand
  refactor smells/techniques. Mandatory every /ship run (Phase 6 design +
  Phase 8 audit). Dispatch design-architect / design-auditor. Output
  concise-full unless asked otherwise.
---

# Design — unified ship specialist

**Owned by `/ship`.** Pack pieces: this skill + `design-*` agents + `rules/design.mdc` + refs under `references/data-systems/`, `references/system-design-101/`, `references/refactoring/`.

**Mandatory:** every `/ship` run produces `design_design.json` (phase 6) + `design_audit.json` (phase 8). Always on — no skip flag. Pure docs/UI → short `data.pick: n/a` + `arch.pick: n/a` still required.

**Modes:**

| Mode | When | Refs |
| ---- | ---- | ---- |
| **data** | Stores, replication, isolation, streams, derived data | `references/data-systems/NN-*.md` |
| **arch** | API/edge, cache, queues, scale, auth, deploy topology | `references/system-design-101/part*-*.md` |
| **smells** | On-demand structure cleanup (not every ship) | `references/refactoring/` |

**Voice:** concise **full**. Security / data-loss / payments → clear English first.

## When to Use

- Inside **every `/ship` run** (phases 6 + 8) — always
- Skill attach / `@design` during a ship run
- Smell cleanup → mode `smells` (optional; complements **simplicity** for YAGNI/delete)

## Orchestration

Parent is **`/ship`**. Do **not** invent a second trunk.

| Ship phase | Spawn | Artifact |
| ---------- | ----- | -------- |
| **6 Plan** | `design-architect` (scouts if sites unknown) | `design_design.json` · `gates.design_done` |
| **8 Review** | `design-auditor` | `design_audit.json` · `gates.design_audit` |

Agents are **read-only**. Code edits → `builder` / `ship-execute`.

Parent **paraphrases** into artifacts. Pass goal + `spec_path` / PRD path.

Command: [`../../commands/ship.md`](../../commands/ship.md)

### Agent files

| Agent | Path |
| ----- | ---- |
| design-architect | [`../../agents/design-architect.md`](../../agents/design-architect.md) |
| design-auditor | [`../../agents/design-auditor.md`](../../agents/design-auditor.md) |

## Instructions (agents + parent)

1. Confirm ship run; design always on
2. Dispatch `design-*` for current phase
3. Load matching packs — at least consider **both** data + arch axes
4. Indexes: `references/data-systems/catalog.md` · `references/system-design-101/catalog.md` · `references/refactoring/catalog.md`
5. Synthesize dual-axis pick (or `n/a` per axis)
6. Name failure / anti-pattern watches
7. Material design change → amend via `ship-spec` before Execute
8. Smell mode → tests first; small steps; `smell:<slug>` / `tech:<slug>`

## Output shape (Phase 6 → `design_design.json`)

```
goal: <one line>
data:
  ch: N | Fig X-Y | n/a
  forces: load | consistency | latency | ops | evolvability | none
  pick: ... | n/a — no data-system surface
  watch: <failure> | none
  refs: NN-*.md
arch:
  part: P | topic:<id> | n/a
  building_block: lb | gateway | cache | queue | shard | replica | n/a
  pick: ... | n/a — no system-design surface
  watch: <anti-pattern> | none
  refs: partN-*.md
diagram: |
  <ascii or none>
next: <step>
```

## Output shape (Phase 8 → `design_audit.json`)

```
data:
  findings: ...
  totals: { critical, high, med }
arch:
  findings: ...
  totals: { critical, high, med }
smells:            # optional
  findings: ...
  totals: { critical, high, med }
rollup: { critical, high, med }
```

## Router — data chapters

| Need | Pack |
| ---- | ---- |
| Reliability / scale | `references/data-systems/01-foundations.md` |
| Data models | `02-data-models.md` |
| Storage | `03-storage.md` |
| Encoding | `04-encoding.md` |
| Replication | `05-replication.md` |
| Partitioning | `06-partitioning.md` |
| ACID / SSI | `07-transactions.md` |
| Dist. faults | `08-distributed-faults.md` |
| Consistency | `09-consistency.md` |
| Batch | `10-batch.md` |
| Streams | `11-streams.md` |
| Future / derived | `12-future.md` |

## Router — architecture parts

| Need | Pack |
| ---- | ---- |
| Blueprint / tradeoffs | `references/system-design-101/part1-blueprint.md` |
| API / edge / LB | `part2-api-edge.md` |
| Cache / queues / DB choice | `part3-data-queues.md` |
| Scale / resiliency | `part4-scale-resilience.md` |
| Microservices / patterns | `part5-architecture.md` |
| Auth / secure APIs | `part6-security.md` |
| Deploy / money paths | `part7-ops-money.md` |

## Router — smells (on-demand)

| Need | Pack |
| ---- | ---- |
| Index | `references/refactoring/catalog.md` |
| Process | `foundations.md` |
| Smell bodies | `smells.md` |
| Technique bodies | `techniques.md` |

## Boundaries

- Diagrams = ASCII only
- No CAP absolute without assumptions; no wall-clock leadership without fencing
- Prefer integrity + repair over silent wrong
- Design agents ≠ SPEC mutators — amend via `ship-spec` / `contract`
- ⊥ parallel design delivery pipeline beside `/ship`
- ⊥ skip design on a ship run
- Smell mode ≠ YAGNI delete (that is **simplicity**)
- Telemetry / SLO → `logging-best-practices`

## Related

- Ship: [`../../commands/ship.md`](../../commands/ship.md) · [`../../rules/ship.mdc`](../../rules/ship.mdc)
- Rule: [`../../rules/design.mdc`](../../rules/design.mdc)
- Agents: [`../../agents/README.md`](../../agents/README.md)
- Simplicity: [`../simplicity/SKILL.md`](../simplicity/SKILL.md)
