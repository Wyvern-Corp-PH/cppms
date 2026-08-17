<!-- Consolidated: checklist + dense ASCII (ch12 future) -->

# Ch12 — Future of Data Systems / Integration

## Unbundling databases

Modern stack = specialized tools (OLTP, search, cache, warehouse, stream) glued by dataflow.
Compose storage tech; derive secondary views from source of truth.

Application around **dataflow**: writes → log → derived systems. Observe derived state carefully (lag).

## Correctness

End-to-end argument: don't trust only middle component — integrity checks end to end.
Enforce constraints where possible; for distributed, use unique allocation, fencing, verification.

Timeliness vs integrity: stale OK sometimes; corrupt never. Prefer integrity + catch-up over silent wrong.

Trust but verify: audit logs, checksums, reconcile batch jobs, property tests on invariants.

## Doing right thing

Predictive analytics + privacy: bias, surveillance, consent, purpose limitation.
Design for user agency; minimize tracking; secure sensitive data.

## Agent checklist (architecture review)

- [ ] Single source of truth named; rest derived
- [ ] Repair path: reprocess from log/batch
- [ ] Integrity > stale (documented)
- [ ] Cross-tool sync via CDC/log not dual write
- [ ] Privacy / retention considered

## Closing concise

Specialized systems OK. Spaghetti dual-writes not. Log as spine. Verify independent of hope.

---

# Figures — Ch12 — Future of Data Systems (Fig 12-1 + themes)

## Fig 12-1 — search index writes × reads

```
         document updates (writes)
                 \
                  X  meet in index structure
                 /
            queries (reads)

trade-off: index freshness vs update cost vs query latency
same pattern in many derived systems
```

## Unbundled database

```
              +-- OLTP
write --> log/CDC --+-- Search   (Fig 12-1 tension)
              +-- Cache
              +-- Warehouse
              +-- Stream jobs

one source of truth; rest derived; reprocess repairs drift
```

## End-to-end integrity

```
client --idem_key--> service --> DB
don't trust only middle component
unique constraints, checksums, reconcile batch, fencing
```

## Timeliness vs integrity

```
stale secondary: often OK (eventual)
corrupt secondary: never — prefer incomplete over silent wrong
```

## Doing the right thing

```
predictive analytics: bias / consent / purpose limit
privacy: minimize tracking; retention; user agency
```

## Agent architecture review

- [ ] SoT named; rest derived
- [ ] Repair: reprocess from log/batch
- [ ] Integrity > silent stale lies
- [ ] No dual-write spaghetti
- [ ] Privacy/retention considered

## Links

- Part3: [part3-ascii.md](part3-ascii.md)
