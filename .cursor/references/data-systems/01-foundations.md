<!-- Consolidated: checklist + dense ASCII (ch01 foundations) -->

# Ch1 — Reliable, Scalable, Maintainable

## Goal triad

| Goal | Mean |
| ---- | ---- |
| **Reliability** | Work correct even when faults |
| **Scalability** | Handle growth load with reasonable cost |
| **Maintainability** | Humans can operate + change system |

Data-intensive = data volume / complexity / change rate dominates (not CPU).

## Reliability

Fault ≠ failure. Fault = component deviate. Failure = user-visible stop.

Sources:
- Hardware — disks, RAM, power → redundancy
- Software — bugs, runaway processes → isolate, crash, restart, verify
- Humans — config, deploys → design for safe ops, sandbox, rollout, monitoring

Important reliability? Money + trust + safety. Not all apps need telecom grade — still design for expected faults.

## Scalability

Describe **load** first:
- QPS, concurrency, data size, write ratio, fan-out

Describe **performance**:
- Latency percentiles (p50/p95/p99) — averages lie
- Throughput

Load cope:
- Scale up (bigger machine) vs scale out (more machines)
- Elastic vs capacity plan
- Stateless easier scale; state hard

## Maintainability

| Property | Cue |
| -------- | --- |
| Operability | Good telemetry, predictable behavior, tooling |
| Simplicity | Accidental complexity down; good abstractions |
| Evolvability | Schema/API change without big-bang rewrite |

## Agent checklist

- [ ] Named load metrics + SLOs
- [ ] Named fault model (what die? how detect?)
- [ ] Ops path: deploy, rollback, amplify incident
- [ ] Complexity justified by real force (scale/reliability), not fashion

## Concise remind

Buzzword no substitute measure load. Fancy distributed system without ops story = landmine.

---

# Figures — Ch1 — Reliable, Scalable, Maintainable (Fig 1-1…1-5)

## Fig 1-1 — composed data system

```
          [Clients / mobile / web]
                    |
                    v
              [Application]
               /  |   |  \
              v   v   v   v
           [DB] [Cache] [Search] [Queue]-->[Workers]
              \
               --> [ETL/CDC] --> [Warehouse / analytics]

data-intensive = volume | complexity | change-rate dominate
```

## Fig 1-2 — Twitter timeline schema

```
users(id, name, ...)
tweets(id, sender_id -> users, text, ts)
follows(follower_id -> users, followee_id -> users)

home timeline options:
  A) query join on read (pull)
  B) fan-out write to per-user timeline cache
```

## Fig 1-3 — tweet deliver pipeline + load

```
POST tweet
  -> store tweet
  -> fan-out: foreach follower insert into home_timeline
     celebrity problem: fan-out N huge => hybrid (fan-out normals, pull celebs)

load axes: write QPS << timeline read QPS typically
```

## Fig 1-4 — mean vs percentiles

```
100 latency samples (bar height = time):
 ## #### ########## ## .#
 fast -----------------> slow

mean hides the .# tail
report p50 / p95 / p99 for SLOs
```

## Fig 1-5 — tail latency amplification

```
one request = call A + B + C in parallel/serial
if ANY backend slow => user waits that max/total
high fan-out => more chance hit a slow call
```

## Reliability / scale / maintain (checklist)

```
fault != failure
hardware | software | human  -> redundancy, crash-only, safe ops

scalability: describe LOAD then PERFORMANCE (percentiles)
maintain: operability | simplicity | evolvability
```

## Links

- Part overview: [part1-ascii.md](part1-ascii.md)
