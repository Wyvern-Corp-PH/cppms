<!-- Consolidated: checklist + dense ASCII (ch09 consistency) -->

# Ch9 — Consistency and Consensus

## Guarantees ladder (simplified)

causal / session → sequential → **linearizable** → (+ txn serializable multi-obj)

Pick weakest that preserves user mental model.

## Linearizability

Looks like one copy. Real-time order: after write complete, all reads see it.
Not free: CAP-flavored cost — under partition, often choose unavail or nonlinearizable.

Need linearizable when: lock/leader election, uniqueness constraint, cross-channel realtime.

Implement: single-leader + careful; consensus; some consensus-free only under limits.

## Ordering

Causality: "happens-before" — weaker, cheaper, often enough.
Sequence numbers / Lamports — help order.
Total order broadcast ≈ consensus power: deliver same order to all.

## Distributed txns & consensus

**2PC:** atomic commit across shards; coordinator SPOF / blocking under failure.
In practice: XA expensive; avoid across many services.

**Consensus (Raft/Paxos/Zab):** agree value despite faults — leader election, config, locks (ZooKeeper/etcd/Consul).

Membership/coord services ≠ replace business DB — use for metadata/HA coordination.

## Agent checklist

- [ ] Named consistency needed per op (not whole system one label)
- [ ] Linearizable only where required
- [ ] Cross-service 2PC avoided; prefer saga / outbox / idempotent
- [ ] Consensus for coordination metadata

## Pick

```
User "see my write"? → read-your-writes / session
Global unique / lock? → linearizable / consensus
Multi-service business txn? → saga + idempotent + outbox, not naive 2PC
```

---

# Figures — Ch9 — Consistency & Consensus (Fig 9-1…9-10)

## Fig 9-1 — nonlinearizable sports score

```
Alice reads score 1:0 from replica (stale)
tells Bob by phone
Bob reads... still 0:0 from other replica
violates real-time / single-copy intuition
```

## Fig 9-2 — concurrent read during write

```
x=0 initially
C writes x=1 |========|
A read  .....|==|....  may return 0 or 1 if overlapping
(legal either under linearizability IF not contradict later)
```

## Fig 9-3 — once new seen, stick

```
any read returns 1 => all later reads must return 1
(on that object, in linearizable system)
```

## Fig 9-4 — linearization points (CAS too)

```
each op appears atomic at one instant inside its interval
register R/W + compare-and-set visualizable this way
```

## Fig 9-5 — cross channel stale

```
Web uploads file -> object store (slow repl)
triggers resize worker that reads file via faster path / other channel
worker may miss or race => need same linearizable store or wait replication
```

## Fig 9-6 — quorum ≠ linearizable

```
strict quorum can still show nonlinearizable histories under concurrency
(need careful leader / consensus for true linearizability)
```

## Fig 9-7 — CAP-ish network cut

```
partition between replicas:
  refuse writes => available↓ but can stay linearizable
  accept writes both sides => availability↑ linearizable↓
```

## Fig 9-8 — Lamport timestamps

```
each node (counter, node_id)
on send: bump; include stamp
on recv: counter = max(local, recv)+1
total order consistent with causality (not real-time)
```

## Fig 9-9 — 2PC success

```
Coord -> all: PREPARE
all -> Coord: YES
Coord -> all: COMMIT
all commit
```

## Fig 9-10 — 2PC coordinator crash

```
participants voted YES
Coord dies before COMMIT/ABORT
participants BLOCKED (cannot unilaterally decide)
need recovery / consensus-backed coordinator
```

## Guarantee ladder (pick weakest that fits)

```
read-your-writes / causal  <  sequential  <  linearizable  (+ serializable multi-obj)
```

## Agent pick

```
unique/lock/leader elect -> linearizable / consensus (Raft etc.)
cross-service business txn -> saga + outbox + idempotent (not naive 2PC)
```

## Links

- Samples: [code-samples.md](code-samples.md)
