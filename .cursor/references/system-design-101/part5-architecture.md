<!-- System Design 101 — architecture patterns / microservices. Paraphrase. -->

# Part 5 — Architecture & microservices

Upstream: `6-software-architectural-patterns-you-must-know`, `9-best-practices-for-building-microservices`, `orchestration-vs-choreography-in-microservices`, `the-12-factor-app`, `9-essential-components-of-a-production-microservice-application`, DDD key-term guides.

## Architectural patterns

| Pattern | Strength | Watch |
| ------- | -------- | ----- |
| Layered | Fast to start; clear roles | Spaghetti if rules ignored |
| Microservices | Independent scale/deploy | Ops + distributed complexity |
| Event-driven | Loose coupling | Harder testing/tracing |
| Client–server | Simple split | Server SPOF if naive |
| (Also common) Pipeline / broker / space-based | Domain-specific | Overkill for small apps |

Pick from **forces**, not fashion. Microservice ≠ default.

## Microservices practices (surface)

- Clear bounded contexts / ownership
- Independent deploy + data where justified
- Async for cross-service coupling when possible
- Explicit API contracts; version carefully
- Observability per service (**→ logging-best-practices**)
- Resiliency on every outbound call (part4)
- Avoid distributed monolith (chatty sync mesh)

## Orchestration vs choreography

| Style | Who drives | Watch |
| ----- | ---------- | ----- |
| Orchestration | Central conductor | Conductor SPOF / bottleneck |
| Choreography | Events between peers | Harder to see whole saga; need good tracing |

Hybrid OK: orchestrate critical money paths; choreograph fan-out side effects.

## 12-factor (cloud-native hygiene)

Codebase · declare deps · config in env · backing services as attached resources · build/release/run stages · stateless processes · port binding · concurrency via process model · disposability · dev/prod parity · logs as event streams · admin tasks as one-offs.

Maps to pack: config externalization, wide-event logs, no secrets in source.

## Agent checklist

- [ ] Pattern chosen with rejected alternative
- [ ] Service cut justified by change rate / team / scale — not ticket count
- [ ] Sync vs async cross-service explicit
- [ ] 12-factor smells (config in code, sticky sessions) flagged
