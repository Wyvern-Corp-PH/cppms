---
name: clean-ddd-hexagonal
description: Proactively apply when designing APIs, microservices, or scalable backend structure. Triggers on DDD, Clean Architecture, Hexagonal, ports and adapters, entities, value objects, domain events, CQRS, event sourcing, repository pattern, use cases, onion architecture, outbox pattern, aggregate root, anti-corruption layer. Use when working with domain models, aggregates, repositories, or bounded contexts. Clean Architecture + DDD + Hexagonal patterns for backend services, language-agnostic (Go, Rust, Python, TypeScript, Java, C#).
---

# Clean Architecture + DDD + Hexagonal

Backend architecture combining DDD tactical patterns, Clean Architecture dependency rules, and Hexagonal ports/adapters for maintainable, testable systems.

This skill is an **opinionated synthesis** of several related architecture traditions. It is not a single canonical architecture model. Use the original source that matches the design question you are answering: DDD for domain modeling, Hexagonal Architecture for ports/adapters, Clean Architecture for dependency direction, Onion Architecture for domain-centered layering, and CQRS/Event Sourcing only for specific read/write or temporal requirements.

## Physical layout (pair with folder-structure)

This skill answers **which layer / port / context** a piece of code belongs in. The durable **folder blueprint** answers **which path** that maps to on disk.

| Concern | Own it with |
| ------- | ----------- |
| Inward deps, ports/adapters, aggregates, use cases | **This skill** + [`architecture`](../../rules/architecture.mdc) · [`layers`](../../references/engineering/layers.md) · [`hexagonal`](../../references/engineering/hexagonal.md) |
| Repo tree, placement conventions, naming, structure gates | [`folder-structure`](../../rules/folder-structure.mdc) · [`references/engineering/folder-structure.md`](../../references/engineering/folder-structure.md) |
| Ubiquitous language / ADRs | [`domain-modeling`](../domain-modeling/SKILL.md) |

**Rules of thumb:**

- Layer folders (`domain/` · `application/` · `infrastructure/` · …) are one valid organizational principle in the blueprint — not a substitute for DDD language.
- Before inventing a new top-level tree for “Clean Architecture,” read the repo’s blueprint; extend it or update it in the same change.
- “Where does this code go?” below assumes a **layer-shaped** package. If the blueprint is feature- or context-shaped, nest layers *inside* that shape (or follow the map’s own placement table).
- Multi-context monorepos: context roots first ([`ddd-strategic`](../../references/engineering/ddd-strategic.md)), then this skill’s layers inside each context.

## When to Use (and When NOT to)

| Use When | Skip When |
|----------|-----------|
| Complex business domain with many rules | Simple CRUD, few business rules |
| Long-lived system (years of maintenance) | Prototype, MVP, throwaway code |
| Team of 5+ developers | Solo developer or small team (1-2) |
| Multiple entry points (API, CLI, events) | Single entry point, simple API |
| Need to swap infrastructure (DB, broker) | Fixed infrastructure, unlikely to change |
| High test coverage required | Quick scripts, internal tools |

**Start simple. Evolve complexity only when needed.** Most systems don't need full CQRS or Event Sourcing.

## Pattern Boundaries

| Pattern | Primary Question | Use It For | Do Not Treat As |
|---------|------------------|------------|-----------------|
| **DDD** | How do we model a complex business domain? | Ubiquitous language, bounded contexts, aggregates, value objects | A folder structure by itself |
| **Hexagonal Architecture** | How does the application interact with the outside world? | Ports, driver adapters, driven adapters, testable application core | A mandate for six sides or one exact package layout |
| **Clean Architecture** | Which direction should dependencies point? | Inward dependency rule, use case boundaries, framework independence | A universal four-folder template |
| **Onion Architecture** | How do we keep the domain model central? | Domain-centered layers and dependency inversion | A separate requirement when Clean/Hexagonal already solve the local problem |
| **CQRS** | Do reads and writes need different models? | Bounded contexts with divergent read/write workloads | A default application architecture |
| **Event Sourcing** | Do we need state from a complete event history? | Audit, temporal queries, replayable workflows | A persistence default for CRUD systems |

## CRITICAL: The Dependency Rule

Dependencies point **inward only**. Outer layers depend on inner layers, never the reverse.

```
Infrastructure → Application → Domain
 (adapters) (use cases) (core)
```

**Violations to catch:**
- Domain importing database/HTTP libraries
- In this architecture style, controllers calling repositories directly instead of application use cases
- Entities depending on application services

**Design validation:** "Create your application to work without either a UI or a database" — Alistair Cockburn. If you can run your domain logic from tests with no infrastructure, your boundaries are correct.

## Quick Decision Trees

### "Where does this code go?"

Layer answers (this skill). **Path** answers come from the durable blueprint ([`folder-structure`](../../rules/folder-structure.mdc)) — map `domain/` / `application/` / … onto whatever roots that doc already uses.

```
Where does it go?
├─ Pure business logic, no I/O → domain/
├─ Orchestrates domain + has side effects → application/
├─ Talks to external systems → infrastructure/
├─ Defines HOW to interact (interface) → port (domain or application)
└─ Implements a port → adapter (infrastructure)
```

**Sharp edges** — the placements LLMs most often get wrong:

| Code | Layer | Why |
|------|-------|-----|
| Business invariant ("order needs items to confirm") | Domain (entity method) | It's a rule, not orchestration |
| Input format validation (JSON shape, required fields) | Adapter (controller/DTO) | Protocol concern, not business rule |
| Transaction begin/commit | Application | Use case = transaction boundary |
| ORM entity / table model | Infrastructure | Map to domain objects; never let ORM entities BE domain entities |
| Domain ↔ DB mapping | Infrastructure (mapper) | Persistence detail |
| Authorization ("is user allowed?") | Application (policy) or adapter middleware | Domain stays auth-agnostic; encode role RULES in domain only if they're business rules |
| Clock, UUID generation | Port in domain/application; adapter in infrastructure | Keeps domain deterministic and testable |
| Reacting to a domain event | Application (event handler) | Side effects = orchestration |
| Query joining many tables for a screen | Read model (application interface, infrastructure impl) | Don't force it through aggregates |

**Litmus test for anemic domain models:** if an application service reads state out of an entity, decides, then writes state back (`if (order.status === 'draft') order.status = 'confirmed'`), move that logic into the entity as `order.confirm()`. Handlers should read like a script: load aggregate → call one behavior method → save → publish.

### "Is this an Entity or Value Object?"

```
Entity or Value Object?
├─ Has unique identity that persists → Entity
├─ Defined only by its attributes → Value Object
├─ "Is this THE same thing?" → Entity (identity comparison)
└─ "Does this have the same value?" → Value Object (structural equality)
```

### "Should this be its own Aggregate?"

```
Aggregate boundaries?
├─ Must be consistent together in a transaction → Same aggregate
├─ Can be eventually consistent → Separate aggregates
├─ Referenced by ID only → Separate aggregates
└─ >10 entities in aggregate → Split it
```

**Rule:** One aggregate per transaction. Cross-aggregate consistency via domain events (eventual consistency).

## Directory Structure

```
src/
├── domain/ # Core business logic (NO external dependencies)
│ ├── {aggregate}/
│ │ ├── entity # Aggregate root + child entities
│ │ ├── value_objects # Immutable value types
│ │ ├── events # Domain events
│ │ ├── repository # DDD repository interface (driven port)
│ │ └── services # Domain services (stateless logic)
│ └── shared/
│ └── errors # Domain errors
├── application/ # Use cases / Application services
│ ├── {use-case}/
│ │ ├── command # Command/Query DTOs
│ │ ├── handler # Use case implementation
│ │ └── port # Driver port interface
│ └── shared/
│ └── unit_of_work # Transaction abstraction
├── infrastructure/ # Adapters (external concerns)
│ ├── persistence/ # Database adapters
│ ├── messaging/ # Message broker adapters
│ ├── http/ # REST/GraphQL adapters (DRIVER)
│ └── config/
│ └── di # Dependency injection / composition root
└── main # Bootstrap / entry point
```

**Port placement:** This skill defaults to a DDD-centered layout where aggregate repository interfaces live beside the aggregate in `domain/`. A stricter Hexagonal layout may instead put driven ports under `application/ports/driven/`. Pick one convention per codebase and keep the dependency rule intact.

**Presentation layer:** Driver adapters (REST/gRPC/CLI) live under `infrastructure/` in this default layout. Some codebases lift them into a fourth top-level `presentation/` layer instead ([references/LAYERS.md](../../references/engineering/layers.md) shows that variant). Use one home for controllers, not both.

**Event publishing:** Saving an aggregate and then publishing its events to a broker are two writes; a crash between them silently drops events. When events must reach other services reliably, write them to an outbox table in the same transaction as the aggregate — see the outbox pattern in [references/CQRS-EVENTS.md](../../references/engineering/cqrs-events.md).

## DDD Building Blocks

| Pattern | Purpose | Layer | Key Rule |
|---------|---------|-------|----------|
| **Entity** | Identity + behavior | Domain | Equality by ID |
| **Value Object** | Immutable data | Domain | Equality by value, no setters |
| **Aggregate** | Consistency boundary | Domain | Only root is referenced externally |
| **Domain Event** | Record of change | Domain | Past tense naming (`OrderPlaced`) |
| **Repository** | Persistence abstraction | Domain (port) | Per aggregate, not per table |
| **Domain Service** | Stateless logic | Domain | When logic doesn't fit an entity |
| **Application Service** | Orchestration | Application | Coordinates domain + infra |

## Anti-Patterns (CRITICAL)

| Anti-Pattern | Problem | Fix |
|--------------|---------|-----|
| **Anemic Domain Model** | Entities are data bags, logic in services | Move behavior INTO entities |
| **Repository per Entity** | Breaks aggregate boundaries | One repository per AGGREGATE |
| **Leaking Infrastructure** | Domain imports DB/HTTP libs | Domain has ZERO external deps |
| **God Aggregate** | Too many entities, slow transactions | Split into smaller aggregates |
| **Skipping Use Cases** | Controllers call repositories directly in a use-case architecture | Route through application use cases |
| **CRUD Thinking** | Modeling data, not behavior | Model business operations |
| **Premature CQRS** | Adding complexity before needed | Start with simple read/write, evolve |
| **Cross-Aggregate TX** | Multiple aggregates in one transaction | Use domain events for consistency |

## Implementation Order

1. **Discover the Domain** — Event Storming, conversations with domain experts
2. **Model the Domain** — Entities, value objects, aggregates (no infra)
3. **Define Ports** — Repository interfaces, external service interfaces
4. **Implement Use Cases** — Application services coordinating domain
5. **Add Adapters last** — HTTP, database, messaging implementations

**DDD is collaborative.** Modeling sessions with domain experts are as important as the code patterns.

## Reference Documentation

Read the matching file before doing the task in the left column:

| Before you... | Read |
|---------------|------|
| Write code in any layer, wire dependency injection, or decide 3-layer vs 4-layer | [references/LAYERS.md](../../references/engineering/layers.md) |
| Split a system into services/contexts, integrate with a legacy or third-party system (ACL), run Event Storming | [references/DDD-STRATEGIC.md](../../references/engineering/ddd-strategic.md) |
| Model an entity, value object, aggregate, repository, domain service, or factory | [references/DDD-TACTICAL.md](../../references/engineering/ddd-tactical.md) |
| Define ports/adapters, name interfaces, or lay out a ports-first structure | [references/HEXAGONAL.md](../../references/engineering/hexagonal.md) |
| Add commands/queries, domain vs integration events, outbox, sagas, or evaluate CQRS/Event Sourcing | [references/CQRS-EVENTS.md](../../references/engineering/cqrs-events.md) |
| Write unit/integration/architecture tests for any layer | [references/TESTING.md](../../references/engineering/testing.md) |
| Answer a quick "which pattern/which layer" question without deep-diving | [references/CHEATSHEET.md](../../references/engineering/cheatsheet.md) |
| Document or refresh physical layout, placement, naming | [references/folder-structure.md](../../references/engineering/folder-structure.md) · rule [`folder-structure`](../../rules/folder-structure.mdc) |

## Sources

### Primary Sources
- Hexagonal Architecture — Alistair Cockburn (2005)
- Domain-Driven Design: The Blue Book — Eric Evans (2003)
- The Clean Architecture — Robert C. Martin (2012)
- Onion Architecture — Jeffrey Palermo (2008)
- Implementing Domain-Driven Design — Vaughn Vernon (2013)

### Primary Pattern References
- CQRS — Martin Fowler
- Event Sourcing — Martin Fowler
- Repository Pattern — Martin Fowler (PoEAA)
- Unit of Work — Martin Fowler (PoEAA)
- Bounded Context — Martin Fowler
- Transactional Outbox — microservices.io
- Effective Aggregate Design — Vaughn Vernon

### Implementation Guides
- Microsoft: DDD + CQRS Microservices
- Domain Events — Udi Dahan

### Supplemental Syntheses
- Clean Architecture: Standing on the Shoulders of Giants — Herberto Graça
- Explicit Architecture — Herberto Graça (opinionated synthesis, not canonical source)
- Get Your Hands Dirty on Clean Architecture — Tom Hombergs
