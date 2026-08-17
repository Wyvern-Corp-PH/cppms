<!-- System Design 101 — data surface + queues + cache. Paraphrase. Deep → data-systems. -->

# Part 3 — Data, cache, queues

Upstream: `how-to-choose-the-right-database`, `7-must-know-strategies-to-scale-your-database`, `top-5-caching-strategies`, `cap-theorem-one-of-the-most-misunderstood-terms`, `delivery-semantics`, MQ evolution guides.

**Deep storage / replication / txn / consensus → `data-systems`.** This part = selection + wiring.

## Database pick (access pattern first)

| Need | Lean |
| ---- | ---- |
| OLTP / strong txn | Relational |
| Analytics / heavy aggregate | OLAP / warehouse |
| Full-text | Search engine |
| Flexible docs | Document store |
| Simple hot KV | Key-value |
| Relations as graph | Graph DB |
| Vectors | Embedding store |
| Geo queries | Geospatial-capable store |

## Scale DB (order of cheap → hard)

1. Indexes matching query patterns
2. Materialized views / precompute
3. Controlled denormalization
4. Vertical scale
5. Cache hot reads
6. Read replicas
7. Sharding (write+read scale; shard key is forever)

## Cache sync strategies

| Strategy | Behavior |
| -------- | -------- |
| Cache-aside | App loads DB on miss; app writes DB then invalidates/updates cache |
| Read-through | Cache layer loads DB on miss |
| Write-through | Write cache + DB together |
| Write-around | Write DB; cache filled on read |
| Write-back | Write cache; flush DB later (fast, durability risk) |

Combine deliberately (e.g. write-around + cache-aside). Watch stampede, big keys, TTL vs consistency.

## CAP caution

CAP: under **partition**, cannot keep both perfect consistency and perfect availability.

- “AP vs CP label” alone ≠ database choice
- Dig: latency, ops, query model, durability, multi-region reality
- Prefer concrete failure story over acronym

## Queue delivery semantics

| Semantic | Guarantee | Typical use |
| -------- | --------- | ----------- |
| At-most-once | May lose; no redelivery | Best-effort metrics |
| At-least-once | No loss; possible dupes | Default; **consumer must be idempotent** |
| Exactly-once | Hard; usually “effectively once” via idempotency + dedupe | Money / critical when cost justified |

```
Producer → Queue → Consumer
                 └─ retry → same message again → need idempotent handler
```

Dual-write (DB + queue) without outbox/CDC → inconsistency smell (**→ data-systems** streams/outbox).

## Agent checklist

- [ ] Access pattern named before store brand
- [ ] Cache strategy + invalidation explicit
- [ ] Queue consumers idempotent if at-least-once
- [ ] CAP not used as sole justification
