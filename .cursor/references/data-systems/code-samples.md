# data-systems code samples (paraphrased)

Reconstructed teaching snippets after book Examples / listings.
Cite chapter. Shorten. Not literal OCR dump of every page.

## Ch1 — timeline query (idea from Fig 1-2)

```sql
-- fan-out read: tweets for users I follow
SELECT tweets.*, users.*
FROM tweets
JOIN users   ON tweets.sender_id = users.id
JOIN follows ON follows.followee_id = tweets.sender_id
WHERE follows.follower_id = :me
ORDER BY tweets.created_at DESC
LIMIT 100;
```

## Ch2 — Example 2-1 document shape (résumé)

```json
{
  "user_id": 251,
  "first_name": "Bill",
  "last_name": "Gates",
  "positions": [
    {"job_title": "Co-chair", "organization": "Bill & Melinda Gates Foundation"}
  ],
  "education": [
    {"school_name": "Harvard University", "start": 1973, "end": 1975}
  ],
  "contact_info": {"blog": ""}
}
```

IDs (`region_id`, `industry_id`) beat free-text for many-to-one.

## Ch2 — property graph DDL (book vertices/edges)

```sql
CREATE TABLE vertices (
  vertex_id   integer PRIMARY KEY,
  properties  jsonb
);
CREATE TABLE edges (
  edge_id       integer PRIMARY KEY,
  tail_vertex   integer REFERENCES vertices (vertex_id),
  head_vertex   integer REFERENCES vertices (vertex_id),
  label         text,
  properties    jsonb
);
CREATE INDEX edges_tails ON edges (tail_vertex);
CREATE INDEX edges_heads ON edges (head_vertex);
```

Cypher-shaped path (Fig 2-5 idea):

```
MATCH (p)-[:WITHIN*]->(continent {name:'North America'})
WHERE p.name = 'Idaho'
RETURN continent
```

## Ch2 — declarative vs MapReduce (aggregate idea)

```sql
SELECT date_trunc('month', observation_timestamp) AS month,
       species,
       COUNT(*) AS count
FROM observations
WHERE family = 'Sharks'
GROUP BY month, species;
```

MapReduce equivalent: map emit `(month,species) -> 1`; reduce sum. Prefer declarative when optimizer exists.

## Ch4 — schema IDL shapes (Thrift / Protobuf / Avro idea)

```protobuf
// Protobuf-like
message Person {
  int32 id = 1;
  string name = 2;
  repeated string emails = 3;  // tag numbers stable for evolve
}
```

```json
// Avro writer schema (conceptual)
{
  "type": "record",
  "name": "Person",
  "fields": [
    {"name": "id", "type": "int"},
    {"name": "name", "type": "string"},
    {"name": "emails", "type": {"type": "array", "items": "string"}, "default": []}
  ]
}
```

Compat habit: add optional + default; never reuse field numbers/names for new meaning.

## Ch5 — version vector merge (cart)

```
get X -> {value: {milk}, vv: {A:1}}
put X {milk,eggs} with vv {A:1} -> server assigns {A:2}
concurrent put {milk,flour} with vv {A:1} -> siblings
client merge -> put {milk,eggs,flour} with vv {A:2,B:1}
```

## Ch7 — denormalized unread (Fig 7-2)

```sql
-- slow but consistent
SELECT COUNT(*) FROM emails
WHERE recipient_id = :uid AND unread_flag = true;

-- denorm counter must update in SAME transaction as email insert/flag flip
BEGIN;
INSERT INTO emails (...);
UPDATE mailbox_stats SET unread = unread + 1 WHERE user_id = :uid;
COMMIT;
```

## Ch7 — write skew doctors (Fig 7-8) + FOR UPDATE

```sql
-- UNSAFE under snapshot / many "repeatable read":
BEGIN;
SELECT * FROM doctors WHERE on_call = true AND shift_id = 1234;
-- sees 2; app allows leave
UPDATE doctors SET on_call = false WHERE name = 'Alice' AND shift_id = 1234;
COMMIT;
-- concurrent Bob => 0 on_call

-- Safer without full serializable (book):
BEGIN TRANSACTION;
SELECT * FROM doctors
  WHERE on_call = true AND shift_id = 1234
  FOR UPDATE;
UPDATE doctors
  SET on_call = false
  WHERE name = 'Alice' AND shift_id = 1234;
COMMIT;
```

## Ch7 — meeting room phantom (Example 7-2)

```sql
BEGIN TRANSACTION;
SELECT COUNT(*) FROM bookings
  WHERE room_id = 123
    AND end_time   > '2015-01-01 12:00'
    AND start_time < '2015-01-01 13:00';
-- if zero:
INSERT INTO bookings (room_id, start_time, end_time, user_id)
VALUES (123, '2015-01-01 12:00', '2015-01-01 13:00', 666);
COMMIT;
-- NOT safe under snapshot isolation — need serializable / SSI / materialize slots
```

## Ch7 — lost update counter

```sql
-- racy
SELECT cnt FROM counters WHERE id=1;  -- 10
UPDATE counters SET cnt=11 WHERE id=1;

-- atomic
UPDATE counters SET cnt = cnt + 1 WHERE id=1;
-- or optimistic version check: WHERE id=1 AND version=:seen
```

## Ch7 — figure lock (Example 7-1 idea)

```sql
BEGIN;
SELECT * FROM figures WHERE id = :id FOR UPDATE;
UPDATE figures SET x = :x, y = :y WHERE id = :id;
COMMIT;
```

Dense diagrams: [07-transactions.md](07-transactions.md)

## Ch9 — 2PC sketch

```
coord -> participant: PREPARE(tx)
participant -> coord: VOTE_YES | VOTE_NO
coord -> all: COMMIT or ABORT
-- after YES vote, participant must not unilaterally abort (blocking risk)
```

## Ch10 — MapReduce mental API

```
map(doc_id, doc) -> list[(key, value)]
reduce(key, values[]) -> list[out]
```

## Ch11 — consumer offset

```
while true:
  batch = log.read(partition, offset, limit)
  process(batch)           # idempotent
  commit_offset(offset+n)  # after success (or txn with sink)
```

## Ch11 — CDC payload (conceptual)

```json
{
  "op": "u",
  "table": "orders",
  "before": {"id": 9, "status": "open"},
  "after":  {"id": 9, "status": "paid"},
  "ts_ms": 1710000000000
}
```
