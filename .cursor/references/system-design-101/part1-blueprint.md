<!-- System Design 101 — blueprint / tradeoffs / building blocks. Paraphrase. -->

# Part 1 — Blueprint & tradeoffs

Upstream guides: `system-design-blueprint-the-ultimate-guide`, `a-cheat-sheet-for-system-designs`, `must-know-system-design-building-blocks`, `10-system-design-tradeoffs-you-cannot-ignore`, `8-common-system-design-problems-and-solutions`.

## Design checklist (interview → prod)

Walk in order; skip only with reason:

1. Requirements (functional + non-functional: QPS, latency p99, consistency, cost)
2. High-level architecture (clients → edge → services → data)
3. Data model + access patterns
4. Domain boundaries
5. Scalability plan (H/V, cache, shard, async)
6. Reliability / availability / durability targets
7. Performance (CDN, cache, indexes)
8. Security (authn/authz, secrets, tenancy)
9. Maintainability / ops / testing
10. Cost + migration plan + docs

## Building blocks (6 buckets)

| Bucket | Blocks |
| ------ | ------ |
| Compute / async | Message queues, distributed cache, task scheduler |
| Scale / perf | Autoscaling, CDN, consistent hashing |
| Service mgmt | Service discovery |
| Network | DNS, load balancer, API gateway |
| Data | DB, object store, sharding, replication |
| Observe / survive | Metrics/logs/traces (**→ logging-best-practices**), resiliency |

## Common problems → first levers

| Problem | Lever |
| ------- | ----- |
| Read-heavy | Cache (+ CDN for static) |
| Write-heavy | Async workers; write-friendly storage (**→ data-systems** LSM) |
| SPOF | Redundancy + failover |
| Availability | LB across healthy instances; DB replicas |
| High latency | CDN / edge; reduce RTT |
| Large files | Object / block storage |
| Slow queries | Indexes; shard when needed |
| Blind ops | Centralized telemetry (**→ logging-best-practices**) |

## Tradeoffs (name both sides)

| Axis | A | B |
| ---- | - | - |
| Scale | Vertical (bigger box) | Horizontal (more boxes) |
| Store | SQL (relations, strong txn) | NoSQL (flexible / specialized) |
| Process | Batch | Stream |
| Schema | Normalize | Denormalize |
| CAP-ish | Prefer consistency | Prefer availability under partition |
| Consistency | Strong | Eventual |
| API | REST (many endpoints) | GraphQL (flexible queries, higher design cost) |
| Service | Stateful | Stateless (easier scale) |
| Cache write | Write-through | Write-around / write-back |
| Work | Sync | Async |

## Agent checklist

- [ ] Named NFRs before picking blocks
- [ ] Tradeoff table has at least one rejected option
- [ ] SPOF called out or mitigated
- [ ] Deep store/txn → note `data-systems`; telemetry → `logging-best-practices`
