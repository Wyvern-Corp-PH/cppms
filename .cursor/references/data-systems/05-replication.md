<!-- Consolidated: checklist + dense ASCII (ch05 replication) -->

# Ch5 — Replication

## Why replicate

- High availability (node die)
- Low latency (geo)
- Scale reads

## Single-leader (primary/replicas)

Leader handle writes; followers replicate log.
- Sync: durability/consistency stronger; write wait follower
- Async: fast writes; failover may lose recent writes

New follower: snapshot + catch-up log.
Outages: follower catch-up; leader failover = elect + promote (need fencing).

Replication log impl: statement / WAL / logical / trigger-based — each trade fidelity vs portability.

## Replication lag anomalies

| Guarantee | Meaning |
| --------- | ------- |
| Read-your-writes | After write, you see own write |
| Monotonic reads | Not go backward in time across reads |
| Consistent prefix | Related writes seen in order |

Lag solutions: sync for critical; session stickiness; causal/version tokens; read from leader when needed.

## Multi-leader

Use: multi-DC, offline clients, collab.
Cost: **write conflicts**. Resolve: LWW (lossy), merge, CRDT, app logic.
Topologies: circular, all-to-all — careful loops / conflict identity.

## Leaderless ( Dynamo-style )

Client write/read N replicas; quorum **w + r > n**.
Down node: hinted handoff / sloppy quorum → later repair.
Concurrent writes: need version vectors / merge; LWW weak.

Quorum not magic: stale reads still possible under some failures; understand actual guarantee.

## Agent checklist

- [ ] Sync vs async chosen explicit
- [ ] Named lag anomaly user can see
- [ ] Failover fencing (no dual primary)
- [ ] Conflict strategy if multi-leader/leaderless

## Pick

```
Simple + one region? → single-leader
Multi-region active write? → multi-leader + conflict plan
Max write avail, tune quorum? → leaderless
```

---

# Figures — Ch5 — Replication (Fig 5-1…5-14)

## Fig 5-1 — leader / followers

```
Client --writes--> [LEADER] ==repl log==> [Follower]
              `-----reads---> [Follower] (often)
```

## Fig 5-2 — sync + async follower

```
Client
  | write
  v
Leader ====sync====> Follower1   (ack before client OK)
     `---async----> Follower2   (may lag; failover risk)
```

## Fig 5-3 — read-your-writes fail

```
t1 write -> Leader OK
t2 read  -> stale Follower => miss own write
fix: sticky / read leader / version token
```

## Fig 5-4 — monotonic reads fail

```
t1 read fresh => v5
t2 read stale => v3   # time went backward
fix: stick to one replica / session
```

## Fig 5-5 — consistent prefix fail

```
Part A fast: answer visible
Part B slow: question not yet
observer hears answer before question
```

## Fig 5-6 — multi-leader multi-DC

```
DC1 [L1] <===async===> [L2] DC2
local write low latency; conflict cost
```

## Fig 5-7 — write conflict

```
L1: title A->B
L2: title A->C
after sync: conflict siblings — merge / LWW / CRDT / app
```

## Fig 5-8 — topologies

```
(a) circular   L1->L2->L3->L1
(b) star       L2<-L1->L3
(c) all-to-all every leader pushes to all (watch loops)
```

## Fig 5-9 — reorder at replica

```
L1: INSERT row
L2: UPDATE that row
arrive L3: UPDATE before INSERT => error / lost
need causal order / conflict IDs
```

## Fig 5-10 — quorum write/read + repair

```
n=3
write w=2: two replicas ack (one may be down)
read  r=2: get versions; pick newest; read-repair lagging
```

## Fig 5-11 — w+r>n overlap

```
   R1 R2 R3
W: *  *        written
R:    *  *     overlap R2 => likely see write
NOT magic under all failures / concurrent writers
```

## Fig 5-12 — concurrent writes no order

```
ClientA: X=A     ClientB: X=B   (no happens-before)
replicas disagree final value — need siblings / merge
```

## Fig 5-13 / 5-14 — shopping cart causal graph

```
v1:{milk}
  ├─> v2:{milk,eggs}     (client A)
  └─> v3:{milk,flour}    (client B concurrent)
         └─> merge {milk,eggs,flour}

version vectors track branches per replica
LWW alone can drop concurrent adds
```

## Pick

```
simple 1-region     -> single-leader
multi-DC write      -> multi-leader + conflict plan
max write avail     -> leaderless + quorum + merge
```

## Links

