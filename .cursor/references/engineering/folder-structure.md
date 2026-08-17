# Folder structure — blueprint reference

Stack-agnostic checklist for documenting and evolving a repository's physical layout. Policy summary: [`../../rules/folder-structure.mdc`](../../rules/folder-structure.mdc). Layer semantics: [`layers.md`](./layers.md) · Hexagonal: [`hexagonal.md`](./hexagonal.md) · Monorepo/DDD map: [`ddd-strategic.md`](./ddd-strategic.md).

Use this when drafting or refreshing the team's durable layout doc (whatever path the repo chose). Prefer **observed** structure over ideal greenfield diagrams.

---

## 1. Detect before you draw

| Question | Evidence |
| -------- | -------- |
| What runtimes / frameworks? | Manifests and lockfiles at roots that own code |
| Monorepo? | Workspace config, multiple package roots, shared tooling at repo root |
| Frontend present? | Asset dirs, UI framework config, route/page trees |
| Multi-service? | Repeated service scaffolds, per-service deploy artifacts, gateway/broker |
| What is generated? | Tooling output dirs — exclude from the default visualization |

Write a one-line **shape summary** at the top of the blueprint (e.g. "Bun monorepo: `apps/*` + `packages/*`; classroom API is Nest-shaped under `apps/classroom/api`").

---

## 2. Structural overview

Document:

- Primary organizational principle (layer / feature / domain / mixed + seams)
- How packages or services relate (depend inward; shared libs vs apps)
- Repeated inner layouts (copy-paste trees that are intentional)

ASCII sketch of relationships (packages → apps), not only folders:

```
repo/
├── apps/          # deployable swimlanes
│   └── <app>/
└── packages/      # shared libraries / contexts
    └── <pkg>/
```

Adapt names to the repo; do not force this shape onto a single-package project.

---

## 3. Directory visualization

Pick one style and keep it consistent:

| Style | Best for |
| ----- | -------- |
| **ASCII tree** | Onboarding; depth 2–4; omit generated dirs |
| **Nested markdown list** | Docs that need links per folder |
| **Table** | Columns: Path · Purpose · Content types · Conventions |

Depth guidance: deep enough to show **seams** (context, layer, public API); stop before leaf noise. Optionally note file counts only when diagnosing hotspots — not required for the living map.

---

## 4. Key directory analysis

For each significant directory, capture:

| Field | Content |
| ----- | ------- |
| Path | Repo-relative |
| Purpose | One sentence |
| Owns | File kinds (entities, routes, hooks, …) |
| Does not own | What must stay elsewhere |
| Conventions | Naming, co-location, import rules |

Backend-shaped trees often document: solution/package grouping, domain vs layer folders, config/secrets home, test project layout.

UI-shaped trees often document: components (shared vs feature), state stores, routing/pages, API clients, assets, styles/themes.

---

## 5. File placement patterns

Closed answers beat vibes. Fill a table for the repo:

| Kind | Canonical location | Notes |
| ---- | ------------------ | ----- |
| App / package config | … | Env-specific overlays |
| Domain models / entities | … | |
| DTOs / shapes | … | |
| Use cases / application services | … | |
| Ports / interfaces | … | Inner layer owns abstractions |
| Adapters / repositories | … | Outer layer implements |
| HTTP / CLI entrypoints | … | |
| Unit tests | … | Match existing convention |
| Integration / e2e tests | … | |
| Docs / ADRs | … | |
| Scripts / devops | … | |

If two homes exist for the same kind, mark one **canonical** and the other **legacy** with a burn-down note.

---

## 6. Naming and organization conventions

| Surface | Document |
| ------- | -------- |
| Files | Case (Pascal / camel / kebab); role suffixes (`.service`, `.entity`, …) |
| Folders | Pluralization, nesting depth, feature vs type names |
| Modules / namespaces | How they map to paths; public vs internal |
| Co-location | Feature folder owns its tests/styles vs mirrored trees |

Align with [`../../rules/custom-validators.mdc`](../../rules/custom-validators.mdc) when the repo uses a closed suffix allow-list.

---

## 7. Navigation and development workflow

Short "where do I…" list:

| Task | Start here |
| ---- | ---------- |
| App entrypoint | … |
| Add a feature | … |
| Extend an existing module | … |
| Add a unit test | … |
| Change env/config | … |
| Register DI / routes | … |

Dependency flow: which folders may import which ([`../../rules/architecture.mdc`](../../rules/architecture.mdc)).

---

## 8. Build and output

| Topic | Document |
| ----- | -------- |
| Build config location | Turbo/Nx/Make/package scripts |
| Artifact dirs | `dist/`, `.next/`, publish packages — not source of truth |
| Env variants | How prod vs local trees differ (if at all) |

---

## 9. Extension templates (optional)

When the team wants copy-paste scaffolds, document skeletons only — no stack lock-in:

**New feature (vertical)**

```
<feature>/
├── <entry>           # page / route / handler
├── <domain bits>     # if co-located
└── <feature>.test.*  # if co-located tests
```

**New library package**

```
packages/<name>/
├── package.json
├── src/
│   ├── index.ts          # public-api
│   └── ...
└── tests/ or co-located
```

**New service (multi-service repo)**

```
services/<name>/
├── Dockerfile?
├── src/ or cmd/
└── ...
```

Fill real names from *this* repo's conventions when instantiating.

---

## 10. Structure enforcement

| Practice | Notes |
| -------- | ----- |
| Validators | Path allow-lists, suffix checks, import boundaries, monorepo registry |
| CI | Structure gate in [`../../rules/ci-taxonomy.mdc`](../../rules/ci-taxonomy.mdc) |
| Review | New top-level folders need map + rationale |
| ADRs | Intentional layout shifts (e.g. feature → layer) |

Update this blueprint when enforcement tools or canonical paths change. Record **last updated** date on the durable doc.

---

## Related pack surfaces

| Surface | Role |
| ------- | ---- |
| [`folder-structure` rule](../../rules/folder-structure.mdc) | Always-on agent policy |
| [`architecture`](../../rules/architecture.mdc) | Layers + dependency rule |
| [`custom-validators`](../../rules/custom-validators.mdc) | Automated path/suffix gates |
| [`setup-skills`](../../skills/setup-skills/SKILL.md) | Seed Repo map on install |
| [`codebase-design`](../../skills/codebase-design/SKILL.md) / [`improve-codebase-architecture`](../../skills/improve-codebase-architecture/SKILL.md) | Deepen inside the map |
| [`clean-ddd-hexagonal`](../../skills/clean-ddd-hexagonal/SKILL.md) | **Primary companion** — layer/port/aggregate placement; maps onto this blueprint |
| Guardrails catalog | Worked-example monorepo structure rows |
