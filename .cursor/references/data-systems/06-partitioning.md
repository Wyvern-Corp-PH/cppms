<!-- Consolidated: checklist + dense ASCII (ch06 partitioning) -->

# Ch6 — Partitioning (Sharding)

## Why partition

Data/query volume > one node. Combine with replication: each partition has replicas.

## Key-value partition

| Strategy | Pros | Cons |
| -------- | ---- | ---- |
| Key range | Range scan easy | Hot ranges / skew |
| Hash key | Even spread | Range scan hard |

Hot spots: celebrity keys, time prefixes. Fix: salt, random suffix, or app-level split write.

## Secondary indexes

Document-partitioned (local): write local; read scatter-gather.
Term-partitioned (global): read one partition; write touch many.

## Rebalancing

- Fixed # partitions vs dynamic split
- Avoid hash(mod N) naive — massive move when N change
- Prefer consistent hashing / partition rings / fixed many partitions

Auto vs manual rebalance: auto can thrash under load; ops control valuable.

## Request routing

- Nodes gossip / coordinator
- Routing tier (ZooKeeper/etcd-backed)
- Client aware

Parallel query = query planner hits many partitions — tail latency matter.

## Agent checklist

- [ ] Partition key = workload affinity (most queries one partition)
- [ ] Secondary index strategy known
- [ ] Rebalance cost modeled
- [ ] Hot key plan

## Concise rule

Wrong partition key = forever pain. Optimize for hottest query shape first.

---

# Figures — Ch6 — Partitioning (Fig 6-1…6-8)

## Fig 6-1 — partition + replicate

```
NodeA: leader(P0)  follower(P1)
NodeB: leader(P1)  follower(P2)
NodeC: leader(P2)  follower(P0)
```

## Fig 6-2 — key-range (encyclopedia)

```
P0: A–F    P1: G–M    P2: N–Z
range scans easy; hot ranges (time keys) skew
```

## Fig 6-3 — hash partition

```
h(key) -> partition
even spread; range query hard (scatter all)
```

## Fig 6-4 — secondary index by document (local)

```
P0: docs + local idx("color")
P1: docs + local idx("color")
query color=red => scatter-gather all partitions
writes local
```

## Fig 6-5 — secondary index by term (global)

```
term"red" partition holds ALL doc-ids (cross docs)
read one partition; write may touch many index parts
```

## Fig 6-6 — rebalance / add node

```
many fixed partitions (e.g. 1000) >> nodes
add node => move some partitions only
avoid hash % N (moves almost everything)
```

## Fig 6-7 — request routing

```
(a) client -> any node -> forward
(b) routing tier / VIP
(c) partition-aware client
```

## Fig 6-8 — ZooKeeper assignment

```
ZK/etcd: partition -> node map
nodes watch; clients/routers refresh
```

## Hotspots

```
celebrity key / sequential ID prefix
fix: salt, random suffix, split write shards
```

## Agent checklist

- [ ] Partition key matches hottest query affinity
- [ ] Secondary index strat chosen (doc vs term)
- [ ] Rebalance move cost modeled

## Links

