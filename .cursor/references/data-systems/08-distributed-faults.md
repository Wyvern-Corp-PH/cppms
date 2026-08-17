<!-- Consolidated: checklist + dense ASCII (ch08 distributed-faults) -->

# Ch8 — Trouble with Distributed Systems

## Core truth

Distributed = **partial failure**. Network + nodes lie. Perfect sync myth.

## Unreliable networks

Packets delay, drop, duplicate, reorder. Detecting dead hard — timeout != death.
Unbounded delay in async networks — choose timeout = guess.

Sync vs async nets: most internet = async. Don't assume bounded RTT.

## Unreliable clocks

| Clock | Use |
| ----- | --- |
| Time-of-day | Wall clock; jumps NTP; bad for duration / order alone |
| Monotonic | Good for elapsed on one node; not compare across nodes |

Clock sync has error bound. **Don't** lease/order/correctness on wall clock without NTP error margin + pause story.

Process pauses: GC, VM pause, overloaded. Node "resume" look like time travel or dual lease danger → **fencing tokens**.

## Truth & majority

Quorum / majority decide what "happened". Minority may have stale truth.
Byzantine (lie/malicious) harder — most data systems assume non-Byzantine + software bugs separate.

System models (crash-stop, crash-recovery, async…) abstract reality — map assumptions explicit.

## Agent checklist

- [ ] Timeouts tuned with retry/idempotency, not hope
- [ ] No critical correctness on `now()` alone
- [ ] Leases/fencing for primary/leader roles
- [ ] Failure mode table: partition, pause, clock skew

## Concise warn

```
if (clock.now() > lease_expire) take_leadership; // DANGER
```
Use epoch / fencing token from quorum store.

---

# Figures — Ch8 — Trouble with Distributed Systems (Fig 8-1…8-5)

## Fig 8-1 — ambiguous timeout

```
Client --req--> Node
       X timeout
could be: lost req | slow handler | node dead | lost response | GC pause
cannot tell from client alone
=> design idempotent + retries + timeouts as guesses
```

## Fig 8-2 — network congestion

```
many senders ---> crowded switch/link ---> dest
queueing delay unbounded on async nets
packet drop / reorder / duplicate normal
```

## Fig 8-3 — wall clock wrong order (LWW danger)

```
causal: A writes x=1 then B increments based on that
but B's NTP clock < A's timestamp
LWW keeps A's value, drops B's causal update  BUG

use: logical clocks / version vectors / causal order — not raw time-of-day
```

## Fig 8-4 — broken distributed lock

```
Client1 gets lease
Client1 GC / pause > lease TTL
Client2 gets lease, writes
Client1 wakes, still thinks owner, writes
=> split-brain corruption
```

## Fig 8-5 — fencing tokens

```
store rejects writes unless token >= last_seen_token

Client1 token=33 ---pause---
Client2 token=34 writes OK (last=34)
Client1 write(33) REJECTED

fencing from consensus/ZK/etcd sequence
```

## Clocks cheat

```
time-of-day: jumps; ok for display; bad sole correctness
monotonic:  durations on ONE node; not compare across nodes
NTP error bound exists — include in any timeout math
process pauses (GC/VM) look like time travel
```

## Truth = majority

```
quorum defines cluster truth
minority may hold stale "facts"
Byzantine hard — most data systems assume crash + bugs not evil
```

## Agent checklist

- [ ] Timeouts + idempotency, not hope
- [ ] No leadership on `now()` alone
- [ ] Fencing tokens for locks/leases
- [ ] Failure mode table: partition, pause, skew

## Links

