<!-- System Design 101 — API + edge. Paraphrase. -->

# Part 2 — API & edge

Upstream: `api-gateway-101`, `8-tips-for-efficient-api-design`, `proxy-vs-reverse-proxy`, `what-is-a-load-balancer`, `top-6-load-balancing-algorithms`, `a-cheat-sheet-for-api-designs`, REST/GraphQL/gRPC guides.

## Edge roles (do not conflate)

```
Client → [CDN?] → [LB] → [API Gateway / Reverse Proxy] → Services
```

| Component | Job |
| --------- | --- |
| **Forward proxy** | Protect/clients; egress control |
| **Reverse proxy** | Protect servers; TLS terminate; cache static; LB |
| **Load balancer** | Spread traffic; health; L4 (IP/port) or L7 (HTTP) |
| **API gateway** | Single entry for many services: route, auth, rate limit, compose, cache |

⊥ dump business domain logic into the gateway (god-gateway smell).

## LB algorithms

| Kind | Algo | Note |
| ---- | ---- | ---- |
| Static | Round-robin | Needs mostly equal/stateless nodes |
| Static | Sticky RR | Same client → same instance |
| Static | Weighted RR | Bigger nodes get more |
| Static | Hash (IP/URL) | Stable affinity |
| Dynamic | Least connections | Busy-aware |
| Dynamic | Least response time | Latency-aware |

## API design tips

1. Paths from **domain model**
2. Prefer clear HTTP verbs; beware ambiguous PATCH culture
3. **Idempotence** designed in (GET safe; POST needs key/strategy)
4. Small subset of status codes, used consistently
5. Version strategy early
6. Semantic paths
7. Batch/bulk as explicit suffix/keyword
8. Query language: filter / sort / page bounds

## Protocols (pick with force)

| Style | When |
| ----- | ---- |
| REST | Resource CRUD, cacheable GETs, broad clients |
| GraphQL | Client-shaped reads; watch N+1 + auth complexity |
| gRPC | Internal service RPC, streaming, typed contracts |
| Webhooks / SSE / WS | Server push; polling last resort for near-real-time |

## Agent checklist

- [ ] Edge components named with distinct jobs
- [ ] Mutating routes have idempotency story
- [ ] Rate limit + auth at edge for public APIs
- [ ] Gateway stays thin
