<!-- Consolidated: checklist + dense ASCII (ch07 transactions) -->

# Ch7 — Transactions

## ACID (precise)

| Letter | Trap |
| ------ | ---- |
| Atomicity | All-or-nothing **for multi-write**; not durability |
| Consistency | App invariants; DB help enforce |
| Isolation | Concurrent tx look "serial" degrees vary |
| Durability | Survive crash after commit ack |

"Transaction" slippery across vendors — check real isolation. Oracle "serializable" often = snapshot.

## Multi-object vs single

Single-object often atomic anyway. Multi-object + foreign keys / dual updates need txn or compensating design.

## Weak isolation (common)

| Level | Allows roughly |
| ----- | -------------- |
| Read Committed | No dirty read/write; still read skew |
| Snapshot / Repeatable Read* | MVCC snapshot; **write skew / phantom** often still OK |
| Serializability | No anomalies — true serial eq |

## Famous bugs

| Bug | Fig | Fix sketch |
| --- | --- | ---------- |
| Lost update | 7-1 | atomic `c=c+1` / CAS / `FOR UPDATE` |
| Dirty read | 7-2 | read committed+ |
| Atomicity break | 7-3 | abort rolls back all |
| Dirty write | 7-5 | exclusive row lock to commit |
| Read skew | 7-6 | snapshot / MVCC (7-7) |
| Write skew | 7-8 | SSI / serializable / lock read set |
| Phantom | 7-8 domain | SI read-only OK; R/W needs serializable or materialize |

## Serializability implementations

| Approach | Fig | Cost |
| -------- | --- | ---- |
| Actual serial (+ stored proc) | 7-9 | single core / partition |
| 2PL | — | readers↔writers block; deadlock |
| **SSI** | 7-10, 7-11 | abort under contention |

2PL ≠ 2PC. Snapshot mantra: readers never block writers.

## Agent checklist

- [ ] Invariants listed (esp. multi-row)
- [ ] Isolation level of production DB named (vendor truth)
- [ ] SELECT-then-write paths checked for write skew / phantom
- [ ] Hot rows: retry on serialization_failure / deadlock
- [ ] Prefer SSI; else `FOR UPDATE` / UNIQUE / last-resort materialize

## Concise

"We use transactions" ≠ serializable. Ask isolation. Write skew silent killer on business rules.

---

# Figures — Ch7 — Transactions (all Fig 7-1…7-11 + samples)

Full chapter diagram pack. Cite `Fig 7-N`. Concise captions + timelines.

## Fig 7-1 — lost update / counter race

```
time -->
Client1:  READ 42 ---- calc 43 ---- WRITE 43 ---- COMMIT
Client2:       READ 42 ---- calc 43 ---- WRITE 43 ---- COMMIT
result counter=43  (should be 44)

fix options:
  UPDATE counters SET c = c + 1 WHERE id=1;     -- atomic
  UPDATE ... SET c=:new, ver=ver+1 WHERE id=1 AND ver=:seen;  -- CAS
  SELECT ... FOR UPDATE; then update            -- lock
```

## Fig 7-2 — dirty read (email + unread counter)

```
T_write (uncommitted):
  INSERT email(unread=true)
  UPDATE stats.unread = unread + 1   -- not done yet / not visible jointly

T_read:
  sees new email in listing
  sees unread_count = 0     <-- dirty / inconsistent mid-txn view

need isolation: see ALL writes of T_write or NONE
```

## Fig 7-3 — atomicity on error

```
BEGIN
  INSERT email
  UPDATE unread++     -- CRASH / error here
ABORT => both undone
without atomicity: email row orphaned, counter wrong
```

## Fig 7-4 — read committed: no dirty reads

```
User1:  BEGIN  set x=3  .... COMMIT
User2:  get x ----------------^ still sees old until commit
        after COMMIT ----------> sees 3

read committed:
  - no dirty reads (Fig 7-4)
  - still allows nonrepeatable / read skew (Fig 7-6)
```

## Fig 7-5 — dirty writes (car sale)

```
listings.car = for_sale
Alice: UPDATE listings SET buyer=Alice   (txn open)
Bob:   UPDATE listings SET buyer=Bob     (dirty write if allowed mid-Alice)
invoices: Alice's txn may still write invoice to Alice
=> listing sold to Bob, invoice to Alice

prevention: row exclusive lock until commit (no second writer)
NOTE: after Alice COMMITS, Bob overwrite = not dirty write;
      may still be lost-update class if app logic wrong
```

## Fig 7-6 — read skew (Alice bank)

```
Alice savings: acct1=$500  acct2=$500  (total $1000)
Bob transfer $100 acct1->acct2 concurrent:

Alice READ acct1 = $500          (before Bob)
Bob   COMMIT: acct1=$400, acct2=$600
Alice READ acct2 = $400          (sees post-Bob? or mix)
or Alice sees acct1=$500 + acct2=$400 = $900  <-- read skew
               (inconsistent snapshot across accounts)

snapshot isolation / MVCC: whole txn one snapshot version
```

## Fig 7-7 — MVCC multi-version (Postgres-style)

```
account2 balance history:
  tx_id | balance | created_by | deleted_by
  ------+---------+------------+-----------
  v12   | 500     | tx12       | tx13
  v13   | 400     | tx13       | null

visibility rules (sketch):
  txn T sees version V if:
    V.created_by committed before T started
    AND (V.deleted_by is null OR deleter not visible to T)

readers don't block writers; writers create new versions
```

## Fig 7-8 — write skew (on-call doctors)

```
invariant: COUNT(on_call for shift) >= 1

        snapshot shows Alice+Bob on_call (2)
Alice: OK to leave ---- UPDATE Alice off ---- COMMIT
Bob:   OK to leave ---- UPDATE Bob off   ---- COMMIT
result: 0 on_call  BUG

pattern: both READ same set, WRITE different rows
lost-update detectors / same-row locks miss this
needs serializable OR FOR UPDATE on read set OR multi-row constraint
```

### Fig 7-8 lock mitigation (book SQL)

```sql
BEGIN TRANSACTION;
SELECT * FROM doctors
  WHERE on_call = true
  AND shift_id = 1234
  FOR UPDATE;                 -- lock ALL currently on-call rows
UPDATE doctors
  SET on_call = false
  WHERE name = 'Alice' AND shift_id = 1234;
COMMIT;
```

## Fig 7-9 — interactive vs stored procedure (serial execution)

```
INTERACTIVE (many RTTs; serial single-thread STALLS waiting app):
  App --SQL--> DB --rows--> App --SQL--> DB ...

STORED PROC (one submit; fast in-mem serial OK):
  App --proc(args)--> DB executes all locally --> result

serial OLTP engines (VoltDB/Redis/Datomic):
  short txns, dataset in RAM, avoid cross-partition when possible
```

## Fig 7-10 — SSI detects stale MVCC read

```
txn43 snapshot: Alice on_call=true
later txn42 commits: Alice on_call=false
txn43 still finishing based on stale premise
SSI: mark read as outdated / abort txn43 on commit (or sooner)
```

## Fig 7-11 — SSI detects cross write-skew

```
txn42 and txn43 both:
  search on_call for shift  (read set)
  update own doctor off     (write)

SSI tracks rw-dependencies:
  if both would commit and break serial order -> abort one
optimistic: no long read locks; abort+retry under conflict
```

---

## Isolation ladder (agent cheat)

```
read uncommitted  -- dirty reads possible (rare)
read committed    -- no dirty read/write; skew OK
snapshot / RR*    -- consistent snapshot; write skew often OK
serializable      -- no anomalies (*vendor RR ≠ theory RR)
```

`*` Oracle “serializable” often = snapshot. Always verify vendor meaning.

## Three serializable impls

| Impl | Mech | Hurt |
| ---- | ---- | ---- |
| Actual serial | 1 thread (+ partition) | cross-partition / long txn |
| 2PL | S/X locks to commit | blocking, deadlocks, latency |
| SSI | MVCC + abort on rw conflict | abort storms under hotspot |

Mantra:
- Snapshot: readers ↛ block writers
- 2PL: readers ↔ writers block

2PL ≠ 2PC (different chapters).

## Phantom → write skew pattern

```
1) SELECT precondition (absence or count)
2) app decides OK
3) INSERT/UPDATE that changes precondition result

if step1 returned empty: FOR UPDATE locks nothing
=> phantom. Fix: serializable OR materialize lock rows (last resort)
```

### Meeting room (Example 7-2 — unsafe under SI)

```sql
BEGIN;
SELECT COUNT(*) FROM bookings
 WHERE room_id = 123
   AND end_time   > '2015-01-01 12:00'
   AND start_time < '2015-01-01 13:00';
-- if 0:
INSERT INTO bookings (room_id, start_time, end_time, user_id)
VALUES (123, '2015-01-01 12:00', '2015-01-01 13:00', 666);
COMMIT;
-- two concurrent = double book under snapshot
```

### Materialize conflicts (last resort)

```
pre-create rows: room_id x timeslot_15min for next N months
booking txn: SELECT ... FOR UPDATE those slot rows
then check + insert booking
ugly but turns phantom into row lock
prefer SERIALIZABLE / SSI
```

### Other write-skew domains (book list)

- username claim without UNIQUE
- double-spend / balance check then insert spend
- multiplayer move to same board cell
- meeting rooms (above)

## Explicit lock lost-update (Example 7-1 idea)

```sql
BEGIN;
SELECT * FROM figures WHERE id = :id FOR UPDATE;
-- app validates move
UPDATE figures SET x=:x, y=:y WHERE id=:id;
COMMIT;
```

## Agent checklist (ch7 dense)

- [ ] List invariants that span **multiple rows**
- [ ] Name production isolation (exact engine setting)
- [ ] Scan for SELECT-then-write decision patterns
- [ ] Write skew / phantom risks named
- [ ] Prefer SSI/serializable; else FOR UPDATE / UNIQUE / materialize
- [ ] App retries on serialization failure / deadlock abort
- [ ] Never assume “transactions” = serializable

## Links

- Catalog: [catalog.md](catalog.md)
- Broader part2: [part2-ascii.md](part2-ascii.md)
