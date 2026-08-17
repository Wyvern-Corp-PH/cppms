<!-- Consolidated: checklist + dense ASCII (ch02 data-models) -->

# Ch2 — Data Models and Query Languages

## Pick model by access pattern

| Model | Fits | Watch |
| ----- | ---- | ----- |
| Relational | Many-to-many, joins, flexible query | Schema migrate; OR-mismatch |
| Document | Aggregate locality, tree read as unit | Cross-doc joins awkward; duplication |
| Graph | Paths, social, recommendations | Different query mental model |

## Rel vs document (today)

- Document win when data mostly nested + few joins
- Rel win when many relationships, ad-hoc query, integrity constraints
- Hybrid common (JSON column in SQL, etc.)

Object-relational mismatch: map objects ↔ tables trade impedance. Document reduce for tree shapes; not magic for graph-ish domains.

## Relationships

Many-to-one / many-to-many need IDs (join or embed).
Embed = denorm for read locality. Update cost + inconsistency risk ↑.

History recycle: CODASYL / hierarchical ↔ document network feel. Lesson: locality vs query flexibility tension perennial.

## Query languages

- Declarative (SQL, CSS selectors) — say what, engine optimize how
- Imperative / MapReduce-style — code traversal; more power, more footgun
- Graph: Cypher, SPARQL, SQL recursive — path queries first-class
- Datalog = foundation for many declarative systems

## Agent checklist

- [ ] Primary aggregates identified (write/read unit)
- [ ] Join frequency + fan-out estimated
- [ ] Integrity: DB constraint vs app-enforced
- [ ] Schema evolvability plan (see also ch4)

## Pick fast

```
Mostly nest read? → document/aggregate
Many join paths? → relational
Connected hops primary? → graph
Unsure? → start relational + JSON; measure pain
```

---

# Figures — Ch2 — Data Models & Query Languages (Fig 2-1…2-6)

## Fig 2-1 — résumé relational

```
users ----*< positions(user_id FK)
  |-------*< education(user_id FK)
  '-------*< contact_info(user_id FK)
fetch = multi-query or messy join
```

## Fig 2-2 — document tree (one-to-many)

```
user{...}
 ├─ positions[]
 ├─ education[]
 └─ contact_info{}
one locality / one read; schema in app/JSON
```

## Example 2-1 shape (JSON)

```json
{
  "user_id": 251,
  "first_name": "Bill",
  "last_name": "Gates",
  "positions": [{"job_title": "Co-chair", "organization": "..."}],
  "education": [{"school_name": "Harvard", "start": 1973, "end": 1975}],
  "contact_info": {"blog": "..."}
}
```

Prefer `region_id` / `industry_id` over free-text strings.

## Fig 2-3 — string vs entity link

```
BAD:  company = "Acme Inc"
GOOD: company_id --> companies(id, name, localized names...)
rename / search / i18n easier
```

## Fig 2-4 — many-to-many

```
users *--< membership >--* orgs
users *--< education  >--* schools
users *--< endorsement>--* skills
document locality breaks; joins/IDs back
```

## Fig 2-5 — property graph

```
(Alice)-[:BORN_IN]->(Idaho)-[:WITHIN]->(USA)-[:WITHIN]->(N.America)
(Bob)-[:LIVES_IN]->(London)-[:WITHIN]->(UK)-[:WITHIN]->(Europe)

DDL sketch:
  vertices(vertex_id PK, properties jsonb)
  edges(edge_id PK, tail, head, label, properties)
  INDEX on tail, head

query styles: Cypher | SQL recursive | SPARQL | Datalog
```

## Fig 2-6 — Datalog WITHIN

```
within(X,Y) :- edge(X, within, Y).
within(X,Z) :- within(X,Y), within(Y,Z).
?- within(Idaho, NorthAmerica).  % true via USA
```

## Pick model

```
tree aggregate, rare joins  -> document
many relations / ad-hoc     -> relational
paths / connected           -> graph
unsure                      -> SQL + JSON column; measure pain
```

## Declarative > MapReduce (when possible)

```sql
SELECT date_trunc('month', ts) AS m, species, COUNT(*)
FROM observations WHERE family='Sharks'
GROUP BY m, species;
```

MapReduce = low-level distributed exec; same job possible but uglier UX.

## Links

- Samples: [code-samples.md](code-samples.md)
