<!-- System Design 101 — scale + resiliency. Paraphrase. -->

# Part 4 — Scale & resiliency

Upstream: `8-must-know-scalability-strategies`, `resiliency-patterns`, `a-cheat-sheet-for-designing-fault-tolerant-systems`, `top-6-cases-to-apply-idempotency`, `a-crash-course-on-architectural-scalability`.

## Scale playbook

1. **Stateless** services (session out of process)
2. **Horizontal** add instances
3. **Load balance** across healthy nodes
4. **Autoscaling** on real signals (not only CPU)
5. **Cache** repetitive reads
6. **DB replication** for read scale + durability
7. **Shard** when writes/size demand it
8. **Async** heavy work off request path

## Resiliency patterns (compose)

| Pattern | Intent |
| ------- | ------ |
| Timeout | Bound wait; fail fast |
| Retry | Transient faults; **backoff + jitter**; idempotent only |
| Circuit breaker | Stop calling sick dependency; recover later |
| Rate limiting | Protect self + neighbors |
| Load shedding | Drop/reject overload gracefully |
| Bulkhead | Isolate pools so one failure doesn’t sink all |
| Back pressure | Slow producers when consumers drown |
| Let it crash | Restart small units; supervisor model |

Small fault → cascade without these.

## Fault-tolerance principles

- Replication of data/services
- Redundancy of critical components
- Load balancing away from dead nodes
- Automatic failover
- Graceful degradation (partial UX > total outage)
- Monitoring + alerting (**SLO lens → logging-best-practices**)

## Idempotency must-haves

Apply when retries / duplicates possible:

1. REST mutating APIs
2. Payments / charges
3. Orders / inventory
4. DB transactions that may re-apply
5. Account registration / similar create-once
6. Webhooks / queue consumers

Mechanism: client `Idempotency-Key`, natural keys, dedupe store, upsert.

## Agent checklist

- [ ] Hot path has timeout + bounded retry
- [ ] Mutate/pay paths idempotent
- [ ] Cascade risk named (which dependency)
- [ ] Scale step matches bottleneck (CPU vs DB vs I/O)
