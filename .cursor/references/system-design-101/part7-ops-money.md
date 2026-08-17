<!-- System Design 101 — deploy + payments surface. Paraphrase. -->

# Part 7 — Ops & money

Upstream: `top-5-most-used-deployment-strategies`, CI/CD guides, `how-to-avoid-double-payment`, `10-principles-for-building-resilient-payment-systems-by-shopify`, payment ecosystem guides.

## Deployment strategies

| Strategy | Idea | Watch |
| -------- | ---- | ----- |
| Big bang | All at once | Fast rollback pain |
| Rolling | Replace instances gradually | Mixed versions mid-roll |
| Blue-green | Two envs; flip traffic | Cost of dual stack |
| Canary | Small % then widen | Need good metrics (**→ logging-best-practices**) |
| Feature toggle | Decouple deploy from release | Toggle debt |

Pick from blast radius + rollback needs.

## Payment / money surface

Hard rules for charge/refund/transfer paths:

1. **Idempotency** on every charge attempt (key from client or deterministic)
2. Treat provider webhooks as **at-least-once** → dedupe
3. **Reconciliation** jobs vs provider ledgers
4. Separate authorize / capture when model needs it
5. Never trust client for price/amount alone — recompute server-side
6. Dual-write ledger + side effects → outbox / careful ordering (**→ data-systems**)
7. Hotspot accounts (popular wallet) → special concurrency design

```
Client --idempotency-key--> API --> Payment Provider
                              └→ Ledger (source of truth)
Webhook ─────────────────────→ reconcile / mark paid (dedupe)
```

## Agent checklist

- [ ] Deploy strategy matches risk
- [ ] Money paths: idempotent + reconcile story
- [ ] Webhooks verified + deduped
- [ ] Amounts authorized server-side
