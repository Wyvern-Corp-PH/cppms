<!-- Consolidated: checklist + dense ASCII (ch10 batch) -->

# Ch10 — Batch Processing

## Unix lesson

Files in → tools → files out. Immutable inputs, output replace. Compose pipes.
Same idea → MapReduce / Spark / etc.

## MapReduce

DFS store files; map emit kv; shuffle by key; reduce. Fault: recompute tasks.
Joins:
- Reduce-side — shuffle together (flexible, expensive)
- Map-side — pre-partition/sort / broadcast (faster when fit)

Output of batch = search index, stats, ML features, derived tables — **derived data**.

Hadoop vs distributed DB: batch scan huge; DB OLTP interactive. Different optimization.

## Beyond MapReduce

Materialize intermediate (Spark RDDs/datasets) avoid HDFS every stage.
Graphs iterative: Pregel-style / many rounds.
High-level SQL/DataFrame APIs — same philosophy, better ergonomics.

## Agent checklist

- [ ] Inputs immutable / versioned
- [ ] Recomputable from sources (reprocess repair)
- [ ] Join strategy match data skew
- [ ] SLA: minutes–hours OK? else stream

## Concise

Batch = correctness + scale for offline. Don't force Batch when need seconds — see ch11.
Do force batch reprocess path even when streaming (repair / backfill).

---

# Figures — Ch10 — Batch Processing (Fig 10-1…10-3)

## Fig 10-1 — MapReduce job

```
Input splits S0 S1 S2
    |     |     |
   Map   Map   Map     (emit key->value)
    \     |     /
     shuffle/sort by key (network)
    /     |     \
 Reduce Reduce Reduce
    |     |     |
  Out0  Out1  Out2

fault: recompute failed tasks; inputs immutable on DFS
```

## Fig 10-2 — join activity log × user profiles

```
activity events (large)     user profiles (smaller)
      \                       /
       both keyed by user_id
```

## Fig 10-3 — reduce-side sort-merge join

```
mappers tag records: (user_id, {type:event|profile, payload})
shuffle co-locate same user_id
reducer merges sorted streams -> joined output

if not co-partitioned inputs, full shuffle cost
```

## Map-side / broadcast join

```
small table -> all mappers (broadcast / distributed cache)
hash-join locally to large stream
skew-aware: hotspot keys need salt / 2-phase
```

## Unix philosophy

```
files in -> tools -> files out
recomputable; compose pipes
same idea underpinning batch frameworks
```

## Beyond MR

```
materialize intermediates (Spark etc.) avoid HDFS every stage
iterative graph: many rounds / Pregel-style
high-level SQL/DataFrame over same engine
```

## Agent checklist

- [ ] Inputs versioned/immutable
- [ ] Reprocess path exists (repair)
- [ ] Join strategy vs skew
- [ ] SLA minutes–hours? else stream

## Links

- Part3: [part3-ascii.md](part3-ascii.md)
