# Data-systems — part ASCII overviews

---

# Part I ASCII â€” ch1â€“4 (Foundations)

Paraphrase of data-systems figures. Cite `Fig X-Y` when teaching. Not book art.

## Â§1 Foundations

### Â§1.1 Fig 1-1 â€” composed data system

```
[Clients]
    |
    v
[Application]
    |-----> [Primary DB]  (source of truth)
    |-----> [Cache]
    |-----> [Full-text search]
    |-----> [Message queue] ---> [Async workers]
    |
    '-----> [Analytics / warehouse]  (often via ETL/CDC)
```

### Â§1.2â€“1.3 Fig 1-2 / 1-3 â€” timeline schema + fan-out

```
users(id) 1---* tweets(sender_id)
users(id) *---* follows(follower,followee)

Write tweet:
  Publisher --> insert tweets
           `-> fan-out: for each follower, insert home_timeline cache
               OR followers pull on read (trade write vs read cost)

Load sketch (book order: writes << reads for celebrities):
  write QPS << home-timeline read QPS
```

### Â§1.4 Fig 1-4 â€” mean vs percentiles

```
response times (100 samples):
  |##|####|##########|##|.#|     # = requests
  fast ------->-------------> slow

  mean   = average bar height  (hides tail)
  p50    = median
  p95/99 = tail SLO you feel
```

### Â§1.5 Fig 1-5 â€” multi-call amplification

```
one user request
  |-- call A  (ok)
  |-- call B  (SLOW)  }  any one slow => whole request slow
  '-- call C  (ok)
tail latency compounds with fan-out
```

---

## Â§2 Data models

### Â§2.1 Fig 2-1 â€” rÃ©sumÃ© normalized

```
users ----*< positions
  |-------*< education
  '-------*< contact_info
(FK user_id on children)
```

### Â§2.2 Fig 2-2 â€” document tree

```
user
 â”œâ”€ positions[]
 â”œâ”€ education[]
 â””â”€ contact_info{}
one fetch / locality win; joins weaker
```

### Â§2.3 Fig 2-3 â€” ID vs string

```
BAD:  profile.company = "Acme Inc"   (typos, rename hard)
GOOD: profile.company_id --> companies(id, name, ...)
```

### Â§2.4 Fig 2-4 â€” many-to-many

```
users *---* organizations   (via membership)
users *---* schools         (via education)
users *---* skills          (via endorsed)
```

### Â§2.5 Fig 2-5 â€” property graph

```
(Alice)-[:BORN_IN]->(Idaho)-[:WITHIN]->(USA)-[:WITHIN]->(N.America)
(Bob)-[:LIVES_IN]->(London)-[:WITHIN]->(UK)-[:WITHIN]->(Europe)
vertices + labeled edges + properties
```

### Â§2.6 Fig 2-6 â€” Datalog hierarchy walk

```
rule: within(X,Y) :- edge(X,within,Y).
rule: within(X,Z) :- within(X,Y), within(Y,Z).
query: within(Idaho, NorthAmerica)?  => true via USA
```

---

## Â§3 Storage

### Â§3.1 Fig 3-1 â€” hash index on append log

```
disk log (append-only):
  offset0: key=A val=...
  offset1: key=B val=...
  offset2: key=A val=...   (newer A)

RAM hash:  A -> offset2
           B -> offset1
lookup = hash then seek
```

### Â§3.2â€“3.3 Fig 3-2 / 3-3 â€” compaction + merge

```
segment1: A=1 B=1 A=2     } compact -> A=2 B=1
segment2: C=1 A=3         } merge   -> A=3 B=1 C=1
old immutable files deleted after switch
```

### Â§3.4â€“3.5 Fig 3-4 / 3-5 â€” SSTable merge + sparse index

```
SSTable: keys sorted
 merge like merge-sort of files, keep newest key

sparse mem index:
  key>=  | file offset
  -------+------------
  apple  | 0x0100
  dog    | 0x0800
  ...
find "cat" => binary search sparse => scan range apple..dog
(+ bloom filter optional)
```

### Â§3.6â€“3.7 Fig 3-6 / 3-7 â€” B-tree lookup / split

```
        [ 100 | 200 | 300 ]
       /      |      \      \
   [..]    [150|180]  [..]   [..]
lookup 251: follow >200 branch, then within leaf

page full -> split into two + insert separator in parent
```

### Â§3.8â€“3.9 Fig 3-8 / 3-9 â€” ETL + star

```
OLTP DBs --ETL--> Warehouse
                    |
              fact_sales
               /  |  \  \
          dim_date dim_product dim_store dim_customer
```

### Â§3.10â€“3.11 Fig 3-10 / 3-11 â€” columnar

```
ROW:   [id|name|age|city][id|name|age|city]...
COL:   id:   1,2,3,...
       name: a,b,c,...
       age:  20,30,...   <- scan only needed cols; run-length/bitmap compress
```

### Â§3.12 Fig 3-12 â€” data cube

```
         product ->
date |  P1   P2   P3   ALL
-----+--------------------
 D1  |  5    2    1    8
 D2  |  3    0    4    7
 ALL |  8    2    5   15
pre-aggregate slices = cubes / rollups / MVs
```

---

## Â§4 Encoding

### Â§4.1 Fig 4-1â€¦4-5 â€” schemaâ€™d binary (idea)

```
Protobuf/Thrift field:
  [tag=field_number][wire_type][value_bytes]
names not on wire â€” schema/registry holds names

Avro:
  writer_schema + binary datapayload
  reader resolves with reader_schema (Fig 4-6)
```

### Â§4.2 Fig 4-6 â€” schema resolution

```
writer schema v3 ----\
                      } resolve -> decoded record for reader v2/v4
reader schema v2 ----/
rules: add optional fields, defaults, rename via aliases
```

### Â§4.3 Fig 4-7 â€” rolling evolve danger

```
time -->
app v1 writing schemaA ----\
app v2 writing schemaB -----} shared DB/log must stay compatible both ways
app v1 still reading -------/
```

See also [code-samples.md](code-samples.md) for Example 2-1 JSON, graph DDL, IDL shapes.

---

# Part II ASCII â€” ch5â€“9 (Distributed data)

## Â§5 Replication

### Â§5.1 Fig 5-1 â€” leader/followers

```
Client --writes--> [LEADER] --replication log--> [Follower]
              `----reads----> [Follower] (often)
```

### Â§5.2 Fig 5-2 â€” sync vs async

```
Client
  | write
  v
Leader ----sync----> Follower1   (write waits ack)
     `----async----> Follower2   (may lag)
```

### Â§5.3 Fig 5-3 â€” read-your-writes fail

```
t1: Client write -> Leader (ok)
t2: Client read  -> stale Follower  => miss own write
fix: sticky session / read leader / causal token
```

### Â§5.4 Fig 5-4 â€” monotonic reads fail

```
t1: read Follower_fresh => v5
t2: read Follower_stale => v3   (time went backward!)
```

### Â§5.5 Fig 5-5 â€” consistent prefix fail

```
Partition A replicates fast:  sees answer
Partition B replicates slow:  question not yet visible
observer sees answer before question
```

### Â§5.6 Fig 5-6 â€” multi-leader multi-DC

```
DC1 [Leader1] <====async====> [Leader2] DC2
clients write local leader; conflicts possible
```

### Â§5.7 Fig 5-7 â€” write conflict

```
Leader1: title A -> B
Leader2: title A -> C
after sync: conflict {B,C} need merge / LWW / CRDT / app
```

### Â§5.8 Fig 5-8 â€” topologies

```
circular: L1->L2->L3->L1
star:     L2<-L1->L3
all-to-all: every leader to every other (care loops)
```

### Â§5.10â€“5.11 Fig 5-10 / 5-11 â€” quorum

```
n=3 replicas
write w=2:  need 2 ack
read  r=2:  need 2 replies, take newest
w+r>n => read set intersects write set (still not free lunch under all faults)

   R1  R2  R3
W: *   *       (written)
R:     *   *   (overlap R2)
```

### Â§5.12â€“5.14 Concurrent + causal

```
ClientA: set X=A     ClientB: set X=B   (no happens-before)
replicas may diverge siblings

cart causal graph:
  v1:{milk} -> v2:{milk,eggs}
            -> v3:{milk,flour} -> merge {milk,eggs,flour}
(version vectors track branches)
```

---

## Â§6 Partitioning

### Â§6.1 Fig 6-1 â€” partition + replicate

```
NodeA: leader(P0) follower(P1)
NodeB: leader(P1) follower(P2)
NodeC: leader(P2) follower(P0)
```

### Â§6.2â€“6.3 Fig 6-2 / 6-3 â€” range vs hash

```
RANGE:  [A-F]=P0  [G-M]=P1  [N-Z]=P2   range scans easy; hot ranges

HASH:   h(key)%... or ring
        even spread; range scan hard
```

### Â§6.4â€“6.5 Fig 6-4 / 6-5 â€” secondary indexes

```
by document (local):
  P0 docs + local idx     read color=red => scatter gather all P
  P1 docs + local idx

by term (global):
  term"red" -> [doc ids across partitions] on one index partition
  write touches many idx partitions; read one
```

### Â§6.6â€“6.8 Rebalance / routing

```
add node: move some partitions (prefer many fixed partitions)

routing:
  (a) client -> any node -> forward
  (b) routing tier
  (c) client aware
ZK/etcd holds partition map (Fig 6-8)
```

---

## Â§7 Transactions

> **Dense pack (all Fig 7-1â€¦7-11 + Examples):** open [07-transactions.md](07-transactions.md).
> Below = quick stubs only.

### Â§7.1 Fig 7-1 â€” lost update

```
T1: read c=10;  T2: read c=10;
T1: write 11;   T2: write 11;   => lost one increment
```

### Â§7.2â€“7.3 Fig 7-2 / 7-3 â€” dirty read / atomicity

```
T_writer: INSERT email; UPDATE unread++ ;  (not committed)
T_reader: sees email but unread=0        => dirty / isolation break

error mid-way => abort rolls back both (atomicity)
```

### Â§7.4â€“7.5 Read committed / dirty writes

```
7-4: reader sees new x only AFTER writer commit
7-5: two buyers dirty-write same listing â†’ invoice/buyer mismatch
```

### Â§7.6â€“7.7 Fig 7-6 / 7-7 â€” read skew / MVCC

```
Alice: read acct1=500; (meanwhile Bob transfer); read acct2= stale
snapshot: each txn sees version as-of start

acct2:  v@t0=$500  v@t1=$400
txn_old reads v@t0; txn_new reads v@t1
```

### Â§7.8 Fig 7-8 â€” write skew

```
invariant: >=1 doctor on_call
T1: see Alice+Bob on_call; set Alice off
T2: see Alice+Bob on_call; set Bob off
commit both => 0 on_call  (each alone OK)
need serializable / constraint / lock predicate
```

### Â§7.9â€“7.11 Serial / 2PL / SSI

```
7-9: interactive multi-RTT vs stored proc (actual serial)
7-10/11: SSI abort on stale read + write-skew rw-deps
```

---

## Â§8 Distributed faults

### Â§8.1 Fig 8-1 â€” ambiguous failure

```
Client --request--> Node
       X  (timeout)
could be: lost req | slow | node dead | lost response
cannot tell from client alone
```

### Â§8.3â€“8.5 Clocks / fencing

```
BAD lock:
  Client1 lease expires (GC pause) but still writes
  Client2 got lock â€” both write => corruption

GOOD fencing:
  store accepts write only if token >= last_token
  Client1 token=33 paused; Client2 token=34
  Client1 write(33) REJECTED
```

---

## Â§9 Consistency & consensus

### Â§9.1â€“9.4 Linearizability timelines

```
real time -->
Write(x=1) |========|
Read       .....|==|....  may return 0 or 1 if concurrent
After any read returns 1, later reads must return 1 (linearizable)
```

### Â§9.7 CAP sketch

```
Network partition between replicas:
  continue write without quorum => not linearizable
  refuse write => unavailable but linerizable option remains
```

### Â§9.9â€“9.10 2PC

```
success:
  Coordinator: prepare -> all yes -> commit -> all commit

crash after prepares:
  participants voted yes â€” blocked waiting coordinator
  (need recovery / consensus-backed coord)
```

See [code-samples.md](code-samples.md) for write-skew SQL shapes.

---

# Part III ASCII â€” ch10â€“12 (Derived data)

## Â§10 Batch

### Â§10.1 Fig 10-1 â€” MapReduce

```
Input splits -----> Map -----> shuffle/sort by key -----> Reduce -----> Output
   S0,S1,S2          M0,M1,M2      (network)              R0,R1,R2
fault: re-run failed task; inputs immutable
```

### Â§10.2 Joins

```
REDUCE-SIDE JOIN:
  map emit join_key -> tagged records
  shuffle co-locate same key
  reduce join

MAP-SIDE / BROADCAST:
  small table -> all mappers
  hash join locally (when fits)

SKEW: hotspot keys swamp one reducer â€” salt / two-phase
```

### Unix philosophy parallel

```
cat log | grep ERROR | sort | uniq -c
   files in --> tools --> files out (recomputable)
```

---

## Â§11 Streams

### Messaging vs log

```
classic queue:  producer -> [broker queue] -> competing consumers (msg gone)

partitioned log (Kafka-ish):
  producer -> append to partition
  consumers read by offset (replayable)
  C1 offset=42 ---->
  C2 offset=10 ---->  independent
```

### Dual write vs CDC

```
BAD dual write:
  App --write--> DB
      --write--> Search    (one may fail => diverge)

GOOD CDC:
  App --> DB --changelog/CDC--> stream --> Search/Cache/Warehouse
```

### Event sourcing

```
source of truth = event log
  Deposit(100) -> Withdraw(30) -> ...
projections = derived read models (rebuild anytime)
```

### Event time vs processing time

```
event time:   when it happened in world
proc time:    when streamed through job
window:       [event_time buckets] + watermarks for lateness
```

### Stream-table join

```
stream clicks  â–·â—  table users(dim)
needs keyed state store; handle late updates to table
```

### Effective exactly-once

```
at-least-once delivery
  + idempotent sink / upsert
  + atomic offset commit with output
=> effect once
```

---

## Â§12 Future / integration

### Unbundled database

```
           +-- OLTP DB
write --> log/CDC --+-- Search
                    +-- Cache
                    +-- Warehouse
                    +-- Stream jobs
one source; many derived; reprocess repairs drift
```

### End-to-end integrity

```
client ---IDEM_KEY---> service ---> DB
verify: unique constraints, checksums, reconcile batch
trust components but verify outcomes
```

### Timeliness vs integrity

```
stale secondary OK for many UX
corrupt secondary NEVER â€” prefer "wrong until fixed" over silent lie
```


