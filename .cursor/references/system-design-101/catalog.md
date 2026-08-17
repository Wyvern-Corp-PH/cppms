# System architecture — topic catalog

Paraphrase index for agents. Cite `topic:<id>` or part pack.

| Topic | Part pack | topic id |
| ----- | --------- | -------- |
| Blueprint / checklist | part1-blueprint | `blueprint` |
| Core design concepts | part1-blueprint | `core-concepts` |
| Building blocks | part1-blueprint | `building-blocks` |
| Tradeoffs | part1-blueprint | `tradeoffs` |
| Common problems | part1-blueprint | `common-problems` |
| API gateway | part2-api-edge | `api-gateway` |
| REST API tips | part2-api-edge | `rest-tips` |
| Proxy / reverse proxy | part2-api-edge | `proxy` |
| Load balancer | part2-api-edge | `load-balancer` |
| Choose database | part3-data-queues | `choose-db` |
| Scale database | part3-data-queues | `scale-db` |
| Cache strategies | part3-data-queues | `cache` |
| CAP caution | part3-data-queues | `cap` |
| Delivery semantics | part3-data-queues | `delivery` |
| Scalability strategies | part4-scale-resilience | `scalability` |
| Resiliency patterns | part4-scale-resilience | `resiliency` |
| Fault tolerance | part4-scale-resilience | `fault-tolerance` |
| Idempotency | part4-scale-resilience | `idempotency` |
| Arch patterns | part5-architecture | `arch-patterns` |
| Microservices | part5-architecture | `microservices` |
| Orchestration / choreography | part5-architecture | `orchestration` |
| 12-factor | part5-architecture | `twelve-factor` |
| Session / JWT / SSO / OAuth | part6-security | `auth-tokens` |
| Secure APIs | part6-security | `secure-apis` |
| Deploy strategies | part7-ops-money | `deploy` |
| Double payment / money | part7-ops-money | `payments` |

## Quick routes

| User says… | Open |
| ---------- | ---- |
| design interview / blueprint | part1 |
| gateway vs LB vs proxy | part2 |
| cache strategy / stampede | part3 |
| which database | part3 (+ data-systems if deep) |
| scale / shard / async | part4 (+ part3) |
| circuit breaker / timeout | part4 |
| microservices / saga | part5 |
| JWT / OAuth / SSO | part6 |
| canary / blue-green | part7 |
| payments / idempotency key | part7 + part4 |
| tracing / SLO | → logging-best-practices |
| LSM / consensus / SSI | → data-systems |
