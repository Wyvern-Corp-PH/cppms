# Guardrails catalog — worked-example inventory

A portable inventory of lint rules, CI gates, Git hooks, process guardrails, and documented practices, distilled from a **production multi-tenant monorepo** and mapped onto this pack. Use it as an adoption checklist: each row names a concrete mechanism, then points at the pack rule that owns the policy.

Authoritative policy always lives in the linked `rules/<slug>.mdc`. This file is the worked example — it does **not** redefine thresholds. Filenames below are **example shapes** an adopter would create; they are not installed by this pack.

Verified against ground truth 2026-07-26 (hooks, presets, validators, workflows, docs headers). Corrections vs an earlier draft are called out inline.

---

## How guardrails layer

Three cooperating layers — the pack's [three-layer model](../../rules/model.mdc):

| Layer | Catches | When it runs | Pack rule |
| ----- | ------- | ------------ | --------- |
| **Local hooks** | Obvious mistakes before commit/push | pre-commit, pre-push, (optional) post-checkout | [`pre-commit`](../../rules/pre-commit.mdc) |
| **Automated CI** | Repo-wide policy, diff-aware ratchets | every PR | [`ci-taxonomy`](../../rules/ci-taxonomy.mdc), [`lint-strategy`](../../rules/lint-strategy.mdc) |
| **Human review** | Architecture, security nuance, test adequacy | PR review + CODEOWNERS | [`review-policy`](../../rules/review-policy.mdc) |

**Worked-example layout:**

| Concern | Typical location |
| ------- | ---------------- |
| Canonical policy (human) | `docs/engineering/` |
| Agent-facing summaries | `.cursor/rules/*.mdc` (this pack: [`rules/`](../../rules/)) |
| Diff-aware validators | `devops/scripts/…/rulesets/` (or `tools/devex/`) |
| CI workflows | `.github/workflows/checks-*.yaml` |
| Git hooks | `.husky/` or this pack's [`lefthook.yml`](../lint/lefthook.yml) |
| Branch rulesets | `.github/rulesets/` |

---

## 1. Cursor agent rules (worked example → pack map)

Always-on AI guardrails. Each mirrors a canonical doc and must stay in sync with it. **Portable idea:** keep a small set of always-applied agent rules that summarize real standards docs — not ad-hoc prompts.

| Example rule file | Enforces | Pack twin |
| ----------------- | -------- | --------- |
| `01-core-principles.mdc` | KISS, DRY, SOLID, Clean Code, DDD construction, file suffixes, config externalization, SQL/JSONB safety | [`coding-principles`](../../rules/coding-principles.mdc), [`custom-validators`](../../rules/custom-validators.mdc), [`simplicity`](../../rules/simplicity.mdc) |
| `02-architecture.mdc` | Bounded contexts, Clean Architecture layers, inward deps, `public-api` seam | [`architecture`](../../rules/architecture.mdc) · refs [`layers`](../engineering/layers.md), [`hexagonal`](../engineering/hexagonal.md) |
| `03-design-documents.mdc` | Consult `docs/` before substantive changes; check deferred-decisions registry | [`architecture`](../../rules/architecture.mdc) § Deferred-decisions ledger |
| `04-api-dto-openapi.mdc` | DTO/OpenAPI shape, deprecations, conditional required fields | stack skills / review |
| `05-unit-tests.mdc` | Test pyramid, AAA, mocking, multi-tenant cleanup | [`testing`](../../rules/testing.mdc) · [`engineering/testing`](../engineering/testing.md) |
| `06-models-migrations-parity.mdc` | ORM models ↔ migrations must match 100% | [`design`](../../rules/design.mdc) (agent rule; often no CI yet) |
| `07-eslint-aspirations.mdc` | Lint rules agents must treat as `error` even when repo runs `warn` | [`lint-strategy`](../../rules/lint-strategy.mdc) § Agents treat warn as error |
| `07-lint-and-format.mdc` | File-scoped lint/format; no whole-repo `--fix`; no magic numbers / config literals | [`lint-strategy`](../../rules/lint-strategy.mdc) |
| `07-util-file-naming.mdc` | `{context}-{concern}-{role-noun}.util.ts` naming | [`custom-validators`](../../rules/custom-validators.mdc) |
| `08-frontend.mdc` | React/Next state, data fetching, forms, a11y, i18n | stack skills (React/Next) |
| `09-backend.mdc` | Nest/API controllers, auth, persistence, suppliers, jobs, observability | [`observability`](../../rules/observability.mdc) + stack skills |
| `10-security.mdc` | **[CRITICAL]** auth at every boundary, tenant isolation, secrets, PII redaction | [`security`](../../rules/security.mdc) |
| `12-devops-scripts.mdc` | Script language matrix, CLI/lib boundary, dry-run defaults | review + [`custom-validators`](../../rules/custom-validators.mdc) |
| `13-eslint-presets.mdc` | Shared lint preset authoring conventions | [`references/lint`](../lint/README.md) |
| `14-no-nonstandard-abbreviations.mdc` | Spell out opaque abbreviations (`img` → `image`, etc.) | [`coding-principles`](../../rules/coding-principles.mdc) § Names |
| `15-comment-discipline.mdc` | Comments only for non-obvious *why*; ban ticket IDs in code | [`coding-principles`](../../rules/coding-principles.mdc) § Comments · [`anti-patterns`](../../rules/anti-patterns.mdc) |
| `16-branching.mdc` | Allowed prefixes: `story/`, `bug/`, `devops/`, `task/` | [`branching`](../../rules/branching.mdc) |

This pack collapses many of those into fewer always-on topics (see [`AGENTS.md`](../../AGENTS.md) rule index). When adopting, either keep numbered rules 1:1 with docs, or map concerns onto this pack's flatter set — but every written standard still needs an owning layer ([`model`](../../rules/model.mdc)).

---

## 2. Canonical engineering docs (worked example)

Human-readable source of truth. Agent rules summarize these; a rule↔doc sync validator keeps them aligned.

### Design (structure)

| Example doc | Guardrail focus | Pack twin |
| ----------- | --------------- | --------- |
| `design-system.md` | Bounded contexts, layer flow, domain map | [`architecture`](../../rules/architecture.mdc) · [`ddd-strategic`](../engineering/ddd-strategic.md) |
| `design-monorepo.md` | `apps/<swimlane>/<role>/`, `packages/<context>/`, registry-driven structure | [`architecture`](../../rules/architecture.mdc) · [`folder-structure`](../../rules/folder-structure.mdc) · [`custom-validators`](../../rules/custom-validators.mdc) · ref [`folder-structure`](../engineering/folder-structure.md) |
| `design-frontend.md` | State hierarchy, React Query, theming, a11y | stack skills |
| `design-backend.md` | Nest composition, DTOs, suppliers, idempotency, jobs | [`observability`](../../rules/observability.mdc) + stack |
| `design-branching.md` | Branch types, release workflow, required CI checks | [`branching`](../../rules/branching.mdc) · [`release-lifecycle`](../ship/release-lifecycle.md) |
| `design-library-configuration.md` | Shared lib `forRoot` options; no `process.env` inside libraries | [`lint-strategy`](../../rules/lint-strategy.mdc) § config externalization |

### Standards (behavior)

| Example doc | Guardrail focus | Pack twin |
| ----------- | --------------- | --------- |
| `standards-coding.md` | Principles, naming, control flow, comments, config, patterns | [`coding-principles`](../../rules/coding-principles.mdc) |
| `standards-eslint.md` | Lint rollout phases, rule catalog, promotion timeline | [`lint-strategy`](../../rules/lint-strategy.mdc) |
| `playbook-lint-new-code-ratchet.md` | How the diff-aware lint ratchet works locally | [`lint-strategy`](../../rules/lint-strategy.mdc) § ratchet |
| `standards-code-review.md` | Author/reviewer checklists, severity tags, CI gate map, CODEOWNERS | [`review-policy`](../../rules/review-policy.mdc) |
| `standards-database.md` | Schema rules, JSONB policy, migration process | [`design`](../../rules/design.mdc) |
| `standards-security.md` | Data tiers, auth, secrets, PII redaction, rate limits | [`security`](../../rules/security.mdc) |
| `standards-devops-scripts.md` | Script authoring rules | review |
| `standards-ai-tooling.md` | Slash commands and AI guardrails | [`skill-library`](../../rules/skill-library.mdc) · [`commands/`](../../commands/) |

### Testing

| Example doc | Guardrail focus | Pack twin |
| ----------- | --------------- | --------- |
| `docs/testing/strategy.md` | Pyramid, priority matrix, AAA, tenant isolation, supplier sections A–E | [`testing`](../../rules/testing.mdc) · [`engineering/testing`](../engineering/testing.md) |

---

## 3. Lint guardrails

### Shared presets (worked example)

Example shared preset tree (`devops/eslint-presets/` or this pack's [`references/lint`](../lint/README.md)):

| Example preset | Rules / policy |
| -------------- | -------------- |
| `clean-code.cjs` | `curly`, `no-nested-ternary`, `prefer-const`, `no-var`, `prefer-template`, `eqeqeq`, `no-empty-function`, `max-depth: 1`, `complexity: 10`, `max-lines-per-function: 50`, `max-lines: 300`, SonarJS cognitive complexity **15**, duplicate-string threshold **3**, `no-identical-functions`, `no-nested-switch`. `no-unreachable` = **error**. Thresholds re-exported as named constants. |
| `no-magic-numbers.cjs` | Named constants for numeric literals (whitelist: `-1, 0, 1, 2`, indexes, defaults) |
| `no-process-env.cjs` | No direct `process.env` outside config adapters |
| `no-forbidden-role-tokens.cjs` | Ban alias imports like `@/helpers`, `@/common`, `@/ui` |
| `no-nonstandard-abbreviations.cjs` | `unicorn/prevent-abbreviations` with curated replacements |

**Verified:** tests / specs / mocks / fixtures turn size+complexity+duplicate-string rules **off** (not merely relaxed). TypeScript-plugin and import-plugin rules stay **out** of the shared clean-code preset — each app registers those plugins itself.

### Size / complexity ceilings (warn burn-down)

Authoritative table: [`lint-strategy`](../../rules/lint-strategy.mdc) § Recommended thresholds · encoded in [`references/lint/README.md`](../lint/README.md):

| Rule family | Ceiling | Oxlint | ESLint | Biome | Ruff |
| ----------- | ------- | ------ | ------ | ----- | ---- |
| Nesting depth | **1** | `max-depth` | `max-depth` | — | `max-nested-blocks` |
| Cyclomatic complexity | **10** | `complexity` | `complexity` | — | `mccabe.max-complexity` |
| Lines / statements per function | **50** (target 20–30) | `max-lines-per-function` | `max-lines-per-function` | — | `pylint.max-statements` |
| Lines per file | **300** | `max-lines` | `max-lines` | — | — |
| Cognitive complexity | **15** | — | — | `noExcessiveCognitiveComplexity` | — |
| Duplicate string threshold | **3** | — | SonarJS (example preset) | — | — |

KISS prose twin: [`coding-principles`](../../rules/coding-principles.mdc) (split ~30 lines, hard ~50, max one nesting).

### Per-workspace lint

- Each app/workspace has a flat config consuming shared presets.
- Example plugins in use: `@typescript-eslint`, `eslint-plugin-import`, `eslint-plugin-boundaries`, `eslint-plugin-sonarjs`, `eslint-plugin-unicorn`, `eslint-plugin-security`, React plugins (frontend).
- This pack's default install path: **Oxlint + Oxfmt** via [`setup-skills`](../../skills/setup-skills/SKILL.md); ESLint+Prettier / Biome remain copyable alternatives under [`references/lint`](../lint/README.md).

### Boundary lint chassis (monorepo / DDD)

Example `tools/eslint-boundaries/` enforces (when wired):

1. Layer direction inside packages (`domain` → `application` → `infrastructure`/`presentation`)
2. Cross-package imports only via facade / sanctioned subpaths
3. Micro layer packages are private
4. `importableBy` DAG from a registry (`monorepo.config.yaml` or equivalent)

See [`architecture`](../../rules/architecture.mdc) · [`layers`](../engineering/layers.md) · [`hexagonal`](../engineering/hexagonal.md).

**Rollout status (worked example):** config exists; per-app wiring is opt-in — track as a known gap until CI-wired.

### Diff-aware lint ratchet (`lint-new-code`)

Two layers on **changed files vs merge-base** — full pattern in [`lint-strategy`](../../rules/lint-strategy.mdc):

| Layer | Behavior |
| ----- | -------- |
| **No-regression** | New lines must be clean; universal-rule counts must not increase vs merge-base |
| **Boy-scout** | Touching legacy debt requires retiring ≥ K fixable violations (default K=3; waivable via label) |

**Portable idea:** run strict rules only on touched lines so you adopt hard standards without a big-bang cleanup.

---

## 4. Custom diff-aware validators

Beyond the linter — see [`custom-validators`](../../rules/custom-validators.mdc). Most are **fix-on-touch** (fail only when you edit matching files). Each parses `git diff BASE..HEAD`, classifies added/changed paths or lines, and errors on new violations while warning on pre-existing.

| Validator | Example script | What it blocks |
| --------- | -------------- | -------------- |
| File-suffix spelling | `check-file-suffixes.mjs` | Invented suffixes (`.utils`, `.interface`, `.model`, stacked suffixes) |
| File placement | `check-file-placement.mjs` | Files outside canonical layer folders |
| Domain-model construction | `check-domain-model.mjs` | Anemic domain, wrong construction pattern, primitive-obsession ratchet |
| Util filenames | `check-util-filenames.mjs` | `*.util.ts` must be `{context}-{concern}-{role-noun}.util.ts` |
| Config options | `check-config-options.mjs` | Nest `forRoot`/`forRootAsync` must use named `*Options` types |
| No config literals | `check-no-config-literals.mjs` | New hardcoded timeouts, limits, retention windows, etc. |
| No tracked env | `check-no-tracked-env.mjs` | Any `.env` file staged or in git |
| Legacy chassis paths | `check-no-legacy-chassis-paths.mjs` | References to pre-monorepo folder names |
| Monorepo structure | `monorepo:check` (registry tool) | Registry vs filesystem drift |
| ESLint config drift | `check-eslint-config-drift.mjs` | Universal rules missing from workspace configs |
| Sensitive-paths coverage | `check-sensitive-paths-coverage.mjs` | Sensitive paths not covered by CODEOWNERS |
| Workflow naming | `check-workflow-naming.mjs` | New workflows must match `<category>-<verb>-<scope>.yaml` |
| Rule↔doc sync | `check-rule-doc-sync.mjs` | Policy doc changes without matching `.cursor/rules` update |
| Diff lint ratchet | `check-lint-new-code.mjs` | Implements the two-layer ratchet above |

Also present in the worked example (supporting tooling, not always PR-blocking): `apply.mjs` (push rulesets), `lint-autofix.mjs`, `list-required-checks.mjs`, prod-sync integrity helpers.

**Requirements:** unit-test the classifiers; support local run with the same `BASE_REF` / `HEAD_REF` as CI; document in a playbook, not only in CI YAML.

**Example local run commands (root `package.json`):**

```bash
yarn ci:structure          # monorepo registry
yarn ci:suffixes           # file suffixes (staged)
yarn ci:rulesets           # vitest for all validators
yarn validate:util-filenames
yarn monorepo:check
yarn deps:drift            # report-only third-party drift
```

Adapt script names to your package manager (`bun` / `pnpm` / `npm`).

---

## 5. Git hooks

See [`pre-commit`](../../rules/pre-commit.mdc). This pack ships lefthook + lint-staged presets ([`references/lint`](../lint/README.md)). Worked example below uses Husky; the sequence is what matters.

### Pre-commit (fast, diff-aware, staged only)

Runs before every commit:

1. README / doc ledger script
2. `check-no-tracked-env` (staged)
3. `check-no-legacy-chassis-paths --cached`
4. `check-file-suffixes --cached`
5. `check-file-placement --cached`
6. `check-domain-model --cached`
7. `check-util-filenames --cached`
8. `check-config-options --cached`
9. Registry structure check — **only when** `apps/`, `packages/`, registry config, or registry tool paths are staged
10. lint-staged → lint `--fix` then format `--write` on staged files

**lint-staged policy (verified):**

- Skip pure renames (same basename, no content change)
- Lint fix first, format second
- Per-workspace configs (example: `apps/<swimlane>/{api,web,admin-web}/.lintstagedrc.cjs`, `packages/.lintstagedrc.cjs`)
- Invoke the **root-installed** lint-staged binary (`yarn exec lint-staged` / equivalent) so Yarn Berry does not resolve an older workspace copy that cannot auto-discover per-workspace configs

### Pre-push (affected only)

Parity gate before code leaves the machine:

```bash
# base = upstream, else merge-base with release trunk, else HEAD~1
monorepo:check
turbo run build lint typecheck --filter="...[base]"
# optionally exclude workspaces not yet gate-ready (deferred-decisions ledger)
```

Escape hatch: `git push --no-verify` (sparingly — CI remains source of truth).

### Post-checkout (optional — often omitted from drafts)

When `yarn.lock` / `package.json` changed between previous and new HEAD → reinstall deps (`install --immutable`). Prefer local package-manager binary, then corepack.

**Portable idea:** pre-commit = fast diff-aware custom checks + staged lint. pre-push = build/lint/typecheck on affected workspaces only. post-checkout = keep the install tree honest after branch switches.

---

## 6. CI gates (GitHub Actions) — worked-example inventory

Classify by what they protect — taxonomy in [`ci-taxonomy`](../../rules/ci-taxonomy.mdc). Expose a local equivalent for every blocking gate.

### Required on release trunk / prod PRs

| Check context | Example workflow | Enforces | Pack twin |
| ------------- | ---------------- | -------- | --------- |
| `validate-branch` | `checks-branch-naming.yaml` | Branch prefix + PR target | [`branching`](../../rules/branching.mdc) |
| `validate-branch-title` | `checks-pr-title.yaml` | Ticket ID in title (`NGP-####` / `SP-####` shape) | [`branching`](../../rules/branching.mdc) |
| `review` | `checks-claude-pr-review.yaml` | AI review with severity rubric | [`review-policy`](../../rules/review-policy.mdc) |
| `sensitive-paths-coverage` | `checks-sensitive-paths-coverage.yaml` | CODEOWNERS coverage | [`security`](../../rules/security.mdc) |
| `no-tracked-env` | `checks-no-tracked-env.yaml` | No secrets in git | [`security`](../../rules/security.mdc) |
| `no-merge-markers` | `checks-no-merge-markers.yaml` | No `<<<<<<<` in diff | process |
| `no-config-literals` | `checks-no-config-literals.yaml` | No new config-shaped literals | [`custom-validators`](../../rules/custom-validators.mdc) |
| `monorepo-structure` | `checks-monorepo-structure.yaml` | Registry ↔ filesystem | [`custom-validators`](../../rules/custom-validators.mdc) |
| `lint-new-code` | `checks-lint-new-code.yaml` | Diff-aware lint ratchet | [`lint-strategy`](../../rules/lint-strategy.mdc) |
| Lint + build + test | `checks-lint-and-build-<app>-*.yaml` | Per-app quality | [`testing`](../../rules/testing.mdc) |
| Final summary rollup | `checks-generate-final-summary.yaml` | Prod-promotion PRs only | process |

### Additional checks (PR or path-scoped)

| Check | Example workflow | Notes |
| ----- | ---------------- | ----- |
| File suffixes | `checks-validate-file-suffixes.yaml` | Belt-and-braces with pre-commit |
| File placement | `checks-validate-file-placement.yaml` | |
| Domain model | `checks-validate-domain-model.yaml` | |
| Util filenames | `checks-validate-util-filenames.yaml` | |
| Config options | `checks-validate-config-options.yaml` | |
| Legacy chassis paths | `checks-no-legacy-chassis-paths.yaml` | Often missing from early drafts |
| ESLint config drift | `checks-eslint-config-drift.yaml` | |
| Workflow naming | `checks-workflow-naming.yaml` | New workflows only |
| Rule↔doc sync | `checks-rule-doc-sync.yaml` | Doc ↔ cursor rule parity |
| Package lint | `checks-lint-packages.yaml` | `packages/**` |
| Yarn / workspace constraints | `checks-yarn-constraints.yaml` | `workspace:*`, `private: true` |
| Scaffold / template paths | `checks-scaffold.yaml` | Extra vs many drafts |
| OpenAPI contract diff | `ai-contract-changes.yaml` | API breaking changes |
| Helm validate | `checks-helm-validate-*.yaml` | Deployment charts |
| Dependency drift | `checks-dependency-drift.yaml` | **Report-only**, never blocks |
| README ledger | `docs-readme-ledger.yml` | Doc index consistency |
| Security scan | `security-aws-code-guru.yaml` (or equivalent) | Vendor security scan |
| Lint autofix automation | `automation-lint-autofix.yaml` | Non-blocking helper |

### Scheduled / regression (not PR blockers)

- E2E: `scheduled-automation-e2e-*.yaml` (per env)
- Regression: `scheduled-automation-regression-*.yaml`
- Optional: weekly engineering reports

### Release / branch automation (Tier-4 process)

Examples that often sit beside the quality gates: create-release-branch, create-release-ticket, merge-prod-into-release, propagate-prod-to-release-branches, update-release-PRs, complete-conflict-merge, deferred-followups, QA Slack notifications. See [`release-lifecycle`](../ship/release-lifecycle.md) for the pack's portable release story.

---

## 7. GitHub repository rulesets

Hard blocks at the git layer (applied via an `apply.mjs`-style script), independent of CI:

| Example ruleset | Target | Key rules |
| --------------- | ------ | --------- |
| `branch-rules-prod.yaml` | `prod` (or your trunk) | No direct push; PR + required checks |
| `branch-rules-release.yaml` | `release/*` | No human creation; PR + required checks |
| `branch-rules-working-branches.yaml` | `story\|bug\|devops\|task/*` | Blocks force-push (non-fast-forward) |
| `branch-rules-disallowed.yaml` | Off-pattern branches | Blocks `feature/`, `subtask/`, etc. |

---

## 8. Branch & PR process guardrails

See [`branching`](../../rules/branching.mdc) · [`release-lifecycle`](../ship/release-lifecycle.md).

### Allowed branch prefixes

| Prefix | Use when |
| ------ | -------- |
| `story/` | Any source-code change (feature, refactor, perf) |
| `bug/` | Source-code defect fix |
| `devops/` | CI/CD, infra, deployment scripts |
| `task/` | Docs/rules only — no source code |

Pattern: `<prefix>/<TICKET-ID>[-description]`
Worked-example ticket shape: `(NGP|SP)-####`.

### Blocked patterns

- `release/*` — automation-only (tracker → GitHub)
- `feature/`, `subtask/`, `subbug/`, etc.
- PRs targeting another working branch (must target `release/*` or `prod` / your integration branch)

### PR title format

```
<TICKET-ID> Add booking validators
[Release] <TICKET-ID>: Summary
[Hotfix] <TICKET-ID>: Summary
```

Commit message describes the change (Conventional Commits, subject ≤ 50 chars). PR title carries the ticket ID for automation.

### CODEOWNERS

- Product code → QA / owning team
- `devops/`, `.github/` → platform / DevOps team
- Sensitive paths require additional approvals (2nd reviewer tier)

PR template mirrors the author pre-PR checklist ([`branching`](../../rules/branching.mdc) § Author checklist).

---

## 9. Code-review severity rubric

From [`review-policy`](../../rules/review-policy.mdc). Every review comment should be tagged:

| Tag | Mergeable? | Examples |
| --- | ---------- | -------- |
| `[CRITICAL]` | **No** | Tenant isolation break, bad migration, security breach |
| `[HIGH]` | **No** | Architecture violation, missing tests on core logic |
| `[MED]` | Fix or ticket + sign-off | N+1, missing index in model, style deviation |
| `[NIT]` | Yes | Naming polish |
| `[FYI]` | Yes | Informational |

Loop while `critical + high + med > 0`. Compressed one-liner: `path:line: severity: problem. fix.`

Ship Phase 8 axes (this pack): `ship-review` (`ac` + `quality` + `simplicity`) · `design-auditor` — see [`subagents`](../../rules/subagents.mdc). Never run Phase 8 ship review and a second ad-hoc review wave in parallel.

---

## 10. Security guardrails

From [`security`](../../rules/security.mdc):

| Area | Requirement |
| ---- | ----------- |
| **Data classification** | Confidential / Restricted / Internal / Public |
| **Authorization** | Every HTTP / GraphQL / job entrypoint validates tenant + actor + resource before side effects |
| **Multi-tenant isolation** | Scope column on every scoped table / query / cache key / storage path |
| **Secrets** | External source of truth (e.g. 1Password); never in code, logs, or PR bodies |
| **PII redaction** | One central redaction list (worked example: under the telemetry/logger package — **not** a single top-level `observability/redaction.ts`) |
| **Input validation** | Schema validation (class-validator / Zod) at every boundary |
| **SQL safety** | Parameterized queries only; no string interpolation |
| **Rate limiting** | Auth endpoints, search/booking, API keys |
| **Webhooks** | Signature verification + idempotency |
| **Dependencies** | Audit blocks critical/high; Renovate / Dependabot |

---

## 11. Testing guardrails

From [`testing`](../../rules/testing.mdc) + [`engineering/testing`](../engineering/testing.md):

- **Pyramid:** Unit ≫ Integration ≫ E2E
- **Naming:** `should <do X> when <condition>`
- **AAA pattern** required
- **No escape-hatch types** (`any`) in tests
- **Multi-tenant DB tests:** unique tenant slug + `cleanupTenantData()`-style teardown in `afterAll`
- **Supplier / integration contracts:** Sections A–E coverage (booking questions, cancellation policies, N+1, caching, error handling)
- **Mocks:** `*.mock.ts` factory per service/repository
- **Frontend:** RTL queries by role/label; MSW (or equivalent) for API mocking
- **Invariant-linked tests:** name after behavior — ⊥ `§V` / `TestV7_*` in product test names

---

## 12. Configuration & magic-number guardrails

Two rules enforced by lint + a config-literal CI scanner ([`lint-strategy`](../../rules/lint-strategy.mdc) § config externalization):

1. **Explaining variables** — no bare numeric/string literals in business logic (whitelist: `0`, `1`, `2`, indexes, defaults)
2. **Externalize tunables** — timeouts, limits, retention, batch sizes → env/config with defaults

Env-var naming: suffix matches the runtime unit (`_MS`, `_SECONDS`, `_DAYS`, etc.).

Worked-example nuance: ESLint threshold constants (`MAX_DEPTH_LIMIT`, …) live in the preset with an explicit scanner ignore comment — rule policy ≠ deploy config.

---

## 13. Database / data-system guardrails

From [`design`](../../rules/design.mdc) (mandatory ship phases 6 + 8) + [`references/data-systems/catalog.md`](../data-systems/catalog.md):

- Stable IDs (UUIDs) over slugs as foreign keys
- JSONB policy and state-column patterns documented
- Indexes declared in both migration **and** model
- Schema changes: design + audit gate (RFC / DBA approval in the worked example)
- **Open gap pattern:** no automated migration ↔ model parity CI yet (agent rule only) — call it out until automated

Every ship run still writes short `design_design.json` (`pick: n/a` per axis when no surface) + `design_audit.json` pass.

---

## 14. AI tooling guardrails

From [`skill-library`](../../rules/skill-library.mdc) + [`commands/`](../../commands/):

- **Rules bind the AI** — always-applied `.cursor/rules` override ad-hoc prompts
- **Slash commands** standardize workflows: `/ship` only (plus worked-example extras like `/review-*`, `/write-tests`, `/fix-ci-rulesets` if the consuming repo adds them)
- **Reviewers are read-only** — findings are advisory until `ship-execute` (fix mode) or `builder` applies them
- **Context discipline** — pass file paths, not pasted bodies ([`delegation`](../../rules/delegation.mdc))
- **Contract mutator** — only the contract/spec skill rewrites `SPEC.md` §G…§B
- **AskQuestion** for human gates — never prose A/B/C menus

---

## 15. Package-manager / monorepo guardrails

| Mechanism | What it enforces |
| --------- | ---------------- |
| Registry config (`monorepo.config.yaml` or equivalent) + registry tool | Apps, packages, domains, shapes, forbidden folder tokens |
| Package-manager constraints (`yarn.config.cjs` / pnpm / bun equivalent) | Internal deps use `workspace:*`; workspaces stay `private: true` |
| Turbo (or Nx) affected graph | Affected-only build/lint/typecheck |
| `deps:drift` (or equivalent) | Report-only third-party version drift (defer via deferred-decisions ledger) |

---

## 16. What to port to another repo (priority order)

Mirrors [`adoption`](../../rules/adoption.mdc). Max leverage, min setup cost:

### Tier 1 — High ROI, relatively portable

1. **Canonical standards docs** — start with coding, security, code-review
2. **Shared lint presets** — clean-code + no-magic-numbers ([`references/lint`](../lint/README.md); prefer Oxlint+Oxfmt)
3. **Pre-commit lint-staged** — lint `--fix` + format `--write` on staged files only
4. **PR template + review severity tags** — `[CRITICAL]` / `[HIGH]` / `[MED]` / `[NIT]` / `[FYI]`
5. **Branch naming CI** — prefix + ticket ID validation
6. **No tracked `.env` check** — trivial script, huge security win

### Tier 2 — Diff-aware ratchets (good for legacy codebases)

7. **`lint-new-code` pattern** — strict on new/touched lines only
8. **`no-config-literals` scanner** — block new hardcoded timeouts/limits
9. **Pre-push** — build/lint/typecheck on affected packages only

### Tier 3 — Monorepo / DDD-specific (adopt if structure matches)

10. **File suffix + placement validators**
11. **Domain model construction gate**
12. **Boundary lint** (`eslint-plugin-boundaries` + registry)
13. **Monorepo registry validator**
14. **GitHub rulesets** for branch protection

### Tier 4 — Org/process (requires tooling investment)

15. **Release-branch automation** (tracker → GitHub, prod→release sync)
16. **AI PR review gate**
17. **Cursor rules + slash commands** (install this pack)
18. **CODEOWNERS + sensitive-paths-coverage**

---

## 17. Key file index (worked-example ↔ pack)

| Area | Worked-example location | Pack location |
| ---- | ----------------------- | ------------- |
| Agent rules | `.cursor/rules/*.mdc` | [`rules/`](../../rules/) |
| Engineering docs | `docs/engineering/` | (consumer repo; pack has [`references/engineering/`](../engineering/)) |
| Lint presets | `devops/eslint-presets/` | [`references/lint/`](../lint/) |
| Custom validators | `devops/scripts/…/rulesets/` | pattern in [`custom-validators`](../../rules/custom-validators.mdc) |
| CI workflows | `.github/workflows/checks-*.yaml` | taxonomy in [`ci-taxonomy`](../../rules/ci-taxonomy.mdc) |
| Branch rulesets | `.github/rulesets/` | §7 above |
| Git hooks | `.husky/pre-commit`, `pre-push`, `post-checkout` | [`lefthook.yml`](../lint/lefthook.yml) |
| lint-staged policy | `tools/lint-staged/index.cjs` | [`lint-staged.config.mjs`](../lint/lint-staged.config.mjs) |
| Monorepo registry | `monorepo.config.yaml`, `tools/monorepo-registry/` | §15 |
| Boundary lint | `tools/eslint-boundaries/` | [`architecture`](../../rules/architecture.mdc) |
| Testing strategy | `docs/testing/strategy.md` | [`testing`](../../rules/testing.mdc) · [`engineering/testing`](../engineering/testing.md) |
| Top-level agent guide | `AGENTS.md` | [`pack template`](../pack/agents-root-template.md) · [`AGENTS.md`](../../AGENTS.md) |
| Ship run state | `.runs/ship/<id>/` | [`ship`](../../rules/ship.mdc) · [`state.schema.json`](../ship/state.schema.json) |
| This catalog | — | [`catalog.md`](./catalog.md) |

---

## 18. Known gaps (document, then automate)

Track intentional gaps — do not pretend CI covers them ([`ci-taxonomy`](../../rules/ci-taxonomy.mdc) § Adapt when missing):

| Rule | Typical status (worked example) |
| ---- | ------------------------------- |
| Migration ↔ model parity | Agent rule only; no CI |
| Boundary lint | Config exists; not fully wired to CI |
| Dead-code detection (Knip etc.) | Manual |
| Cursor-rule sync on doc change | Partial (`checks-rule-doc-sync`) |
| Repo-wide lint `error` promotion | Burn-down in progress (`warn` today) |
| Gate-ready exclusions for some devops workspaces | Deferred via decisions ledger |

---

## Verification notes (2026-07-26)

Fills / corrections applied when checking the production monorepo against an earlier draft:

| Claim | Verdict |
| ----- | ------- |
| Size ceilings 1 / 10 / 50 / 300 / cognitive 15 / dup-string 3 | **Confirmed** in `clean-code.cjs`; named constants re-exported |
| Test override | Rules turned **off**, not relaxed |
| Husky hooks | `pre-commit`, `pre-push`, **and** `post-checkout` (often missing from drafts) |
| lint-staged config suffix | On-disk `.lintstagedrc.cjs` (some comments say `.json`) |
| Extra CI workflows | `checks-no-legacy-chassis-paths`, `checks-scaffold`, `checks-generate-final-summary`, `automation-lint-autofix` |
| PII redaction path | Under telemetry/logger (+ shared resilience constants) — draft's single `packages/observability/redaction.ts` path was wrong |
| Local `ci:*` scripts | `ci:structure`, `ci:suffixes`, `ci:rulesets`, plus `validate:util-filenames`, `monorepo:check`, `deps:drift` |

---

**See also:** [`adoption`](../../rules/adoption.mdc) · [`anti-patterns`](../../rules/anti-patterns.mdc) · [`glossary`](../../rules/glossary.mdc) · [`summary`](../../rules/summary.mdc) · [`lint/README`](../lint/README.md)
