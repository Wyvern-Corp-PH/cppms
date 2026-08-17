<!-- Consolidated: checklist + dense ASCII (ch04 encoding) -->

# Ch4 — Encoding and Evolution

## Data lives longer than code

Deploy rolling = old + new code coexist. Encoding must allow:
- Forward compatible (new reader + old data)
- Backward compatible (old reader + new data)
…to degree product needs.

## Formats

| Format | Schema | Binary | Evolve story |
| ------ | ------ | ------ | ------------ |
| Language pickle/Java serialize | none/poor | yes | **Avoid** across services |
| JSON/XML | optional | text | Human; ambiguous types; verbose |
| Thrift / Protobuf | yes | yes | Field tags; careful add/remove |
| Avro | yes (writer schema) | yes | Reader/writer schema resolve — great for logs |

Schemas not bureaucracy — **contract** for evolve + codegen + validate.

## Dataflow modes

1. **Through DB** — write one version, read another; schema migrate hard
2. **Through services** REST/RPC — version APIs; avoid sync coupling explosion
3. **Message-pass** — async; replay / log as compatibility boundary

REST: loose, evolvable URLs/JSON. RPC: tighter, feel local but network lies (failures, latency, partial). Prefer idempotent, timeouts, explicit versions.

## Agent checklist

- [ ] Compatibility matrix documented (old↔new)
- [ ] No language-native serialize across process boundary
- [ ] Avro/Protobuf/Thrift when high-volume logs or RPC contracts matter
- [ ] Breaking change = dual write / dual read / expand-contract plan

## Concise warn

"JSON no schema" still have implicit schema in producers/consumers — just undocument. Make schema visible.

---

# Figures — Ch4 — Encoding & Evolution (Fig 4-1…4-7)

## Example record (conceptual — Figs 4-1…4-5)

```
Person { userName, favoriteNumber, interests[] }
```

| Fig | Format | Idea |
| --- | ------ | ---- |
| 4-1 | MessagePack | binary JSON-ish; field names on wire |
| 4-2 | Thrift BinaryProtocol | typed fields; tags |
| 4-3 | Thrift CompactProtocol | denser packing (~smaller) |
| 4-4 | Protocol Buffers | field numbers; no names on wire |
| 4-5 | Avro | schema with data; highly compact |

Wire mental model (PB/Thrift):

```
[field_tag][wire_type][value_bytes]
schema/registry maps tag -> name/type
NEVER reuse field number for new meaning
```

## Fig 4-6 — Avro reader/writer resolve

```
writer_schema v3  --\
                     } resolve rules -> reader sees v2 fields
reader_schema v2  --/

compat habits:
  add optional + default
  rename via aliases
  avoid remove required without default path
```

## Fig 4-7 — rolling deploy / DB dual version

```
time -->
app v1 writes schemaA ----\
app v2 writes schemaB -----} shared rows/files must both decode
app v1 still reading ------/

danger: v2 writes field unknown to v1; v1 rewrite drops field (data loss)
use forward+backward compatible encodings / dual-write expand-contract
```

## Dataflow modes

```
1) through DB         — migrate carefully
2) REST/RPC services  — version APIs; network lies
3) message brokers    — async; schema registry on topics
```

Avoid language-native serialize (Java/Python pickle) across process boundaries.

## Agent checklist

- [ ] Compat matrix old↔new documented
- [ ] Schema registry or equivalent for events
- [ ] Breaking change = expand/contract plan

## Links

- Samples: [code-samples.md](code-samples.md)
