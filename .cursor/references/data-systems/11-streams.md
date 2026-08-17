<!-- Consolidated: checklist + dense ASCII (ch11 streams) -->

# Ch11 — Stream Processing

## Streams

Events forever (or long). Messaging: direct, broker, log.

**Partitioned log** (Kafka-style): durable, replayable, consumer offset, order per partition.

## DB ↔ stream

Keep systems sync:
- Dual write fragile (one succeed / one fail)
- **CDC** — capture DB changelog → stream (good sync)
- **Event sourcing** — events = source of truth; DB projections derived

Immutability: append log = audit + rebuild state. Soft delete / compaction for privacy/GDPR.

## Processing

Uses: notify, CEP, maintain materialize view, feed search/cache.

**Time hard:**
- Event time vs processing time
- Watermarks / windows for late data
- Stragglers

Stream joins: stream-stream, stream-table — state store needed; skew/late care.

## Fault tolerance

Exactly-once ≈ effective once via idempotent sink + atomic offset + txn/outbox patterns. "At least once + idempotent" pragmatic.

## Agent checklist

- [ ] Dual-write eliminated or justified
- [ ] Replay strategy (log retention / compaction)
- [ ] Time semantics explicit
- [ ] Idempotent consumers
- [ ] Batch companion for rebuild

## Pick

```
Need replay + multi consumer? → partitioned log
Sync OLTP → search/cache? → CDC
Business facts as events? → event sourcing (+ projection rebuild)
```

---

# Figures — Ch11 — Stream Processing (Fig 11-1…11-7)

## Fig 11-1 — consumer load balance

```
topic partitions P0 P1 P2
consumer group:
  C1 owns P0+P1
  C2 owns P2
share work; one partition -> one consumer in group (typical)
```

## Fig 11-2 — redelivery on crash

```
C2 processing m3 ---CRASH---
broker redelivers m3 to C1 (or restarted C2)
=> at-least-once; make handler idempotent
```

## Fig 11-3 — partitioned log append

```
producer append-only --> partition file [off0][off1][off2]...
consumers track offset independently
replayable; multi subscriber
```

## Fig 11-4 — dual-write diverge

```
App writes X=A then X=B to DB order
same App also writes search index
race/fail => search may see B then A or miss
NO single leader across systems
```

## Fig 11-5 — CDC / changelog apply

```
DB WAL/CDC --> ordered event stream --> apply to search/cache/warehouse
same order as DB writes => stay in sync
```

## Fig 11-6 — event sourcing state

```
event log (source of truth):
  Opened | Deposited(100) | Withdrawn(30) | ...

current state = fold(events)
projections = derived read models (rebuild anytime)
```

## Fig 11-7 — processing-time windows suck alone

```
events late / delayed vary
window by processing time => wrong buckets
prefer event-time windows + watermarks for lateness
```

## Dual write vs CDC vs event sourcing

```
dual write: fragile
CDC:        OLTP stays SoT; stream derives
event src:  events SoT; DB projections derived
```

## Effective exactly-once

```
at-least-once
 + idempotent sink / upsert
 + atomic offset with output (txn/outbox)
=> effect once
```

## Agent checklist

- [ ] Dual-write eliminated or justified
- [ ] Replay / retention plan
- [ ] Event vs processing time explicit
- [ ] Idempotent consumers
- [ ] Batch repair companion

## Links

- Samples: [code-samples.md](code-samples.md)
