<!-- Consolidated: checklist + dense ASCII (ch03 storage) -->

# Ch3 — Storage and Retrieval

## Two engines (core)

| Family | Write path | Read | Good when |
| ------ | ---------- | ---- | --------- |
| **B-tree** | In-place page update + WAL | Excellent point + range | OLTP, balanced R/W |
| **LSM / SSTable** | Append memtable → flush → compact | Range good after merge; point need bloom/cache | Write-heavy, sequential IO |

Hash index: fast point key, bad range, memory-bound (bitcask-style).

## LSM vs B-tree trade-offs

LSM:
- Higher write throughput often
- Compaction CPU/IO tax; write amplification
- Read amp until cached / bloom help

B-tree:
- Predictable read latency
- Write amp on page splits + WAL
- Mature concurrent txn story

## Other indexes

Secondary indexes, multi-column, full-text, geospatial — each has locality story. Secondary indexes hurt writes.

## OLTP vs analytics

| | OLTP | Analytics (warehouse) |
| - | ---- | --------------------- |
| Access | many small, keyed | scan large, aggregates |
| Schema | normalized / app | star/snowflake common |
| Storage | row-oriented | **column-oriented** |

Columnar: compress well, scan only needed cols, vectorized CPU. Writes batch-friendly.

Data cubes / materialized views = precompute aggregations — trade freshness vs query cost.

## Agent checklist

- [ ] Workload: write amp vs read amp measured or estimated
- [ ] Need range scan? hash alone out
- [ ] OLTP + heavy BI? → separate warehouse / replica / columnar path
- [ ] Compaction / vacuum budget in ops plan

## Concise pick

Write storm + SSD sequential love → lean LSM. Point-read latency king → lean B-tree. Dashboard scan → columnar, not OLTP primary.

---

# Figures — Ch3 — Storage & Retrieval (Fig 3-1…3-12)

## Fig 3-1 — append log + hash index

```
disk (append):
  off0: A=v1
  off1: B=v1
  off2: A=v2

RAM hash: A->off2, B->off1
keys fit RAM; values on disk (Bitcask-style)
```

## Fig 3-2 — compaction

```
before: A1 B1 A2 A3 B2
after:  A3 B2          # keep newest per key
tombstone => delete on merge
```

## Fig 3-3 — compact + merge segments

```
seg1, seg2, seg3 (immutable) --merge--> seg_new
switch readers; delete old
```

## Fig 3-4 — SSTable merge

```
SSTables sorted by key
merge like mergesort; for duplicate key keep newest
=> LSM pipeline: memtable flush -> L0 -> compact deeper
```

## Fig 3-5 — sparse memory index

```
SSTable keys sorted
sparse idx:  apple@0x100  dog@0x800  ...
lookup "cat": binsearch sparse => scan [apple,dog)
(+ bloom to skip files)
```

## Fig 3-6 — B-tree lookup

```
        [100|200|300]
       /     |     \
   [...]  [150|180]  [220|251|280]
lookup 251: descend right branch into leaf
```

## Fig 3-7 — B-tree page split

```
full leaf -> split 2 pages + separator key up to parent
WAL for crash safety; update-in-place pages
```

## LSM vs B-tree

```
LSM: write amp from compaction; great sequential write; range OK after merge
B-tree: predictable reads; write amp on pages+WAL; mature txn
```

## Fig 3-8 — ETL

```
OLTP DB(s) --extract/transform/load--> Warehouse
often overnight / CDC continuous
```

## Fig 3-9 — star schema

```
        dim_date
           |
dim_store--fact_sales--dim_product
           |
      dim_customer
```

## Fig 3-10 — row vs column

```
ROW: [id name age][id name age]...   OLTP point rows
COL: id:…  name:…  age:…             analytics scan few cols
```

## Fig 3-11 — bitmap / RLE column

```
city column: NYC NYC NYC LA LA ...
encode run-length / bitmap indexes => tiny + fast AND/OR
```

## Fig 3-12 — data cube

```
         P1  P2  P3  ALL
    D1    5   2   1    8
    D2    3   0   4    7
   ALL    8   2   5   15
precompute rollups / MVs; trade freshness
```

## Agent checklist

- [ ] Write vs read amp known
- [ ] Range scan? (hash index alone no)
- [ ] OLTP vs warehouse separated?
- [ ] Compaction/vacuum in ops budget

## Links

