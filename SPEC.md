# Cagayan PPMS

## §G

Cagayan PPMS — public read-only project monitoring + authenticated admin for tracking, budget, progress, approvals, reports.

## §C

- Bun monorepo; `apps/admin-frontend` (admin), `apps/public-frontend` (public); backend PocketBase.
- Dev ports: public 3000, admin 3001, PocketBase 8090; browser `NEXT_PUBLIC_POCKETBASE_URL=http://localhost:8090`.
- Docker dev stack → `docs/specs/local-dev-docker.md`.
- Shared UI `@workspace/ui` (shadcn); Next.js 16; fonts Geist + Geist Mono.
- Currency PHP (₱).
- Public: read-only `/` + `/projects` only; budget/progress/reports ⊥ public route/nav (V99); export ⊥.
- Admin: full CRUD where module allows; approvals admin-only module, ⊥ public route/nav (V3).
- Upload MIME: PDF, DOC, XLS, JPG, PNG; site photos also WebP.
- Excel export: admin only (`Export All Sheets`, `Export Current Tab`).
- Dev demo data: `bun run seed:dev` → 8 `Demo:` projects + budget/progress (V70); `seed:dev:force` replaces demos.

**Design** (`DESIGN.md` — getdesign `linear.app`, PPMS-adapted)

- Strategic context: `PRODUCT.md`, `DESIGN.md` at repo root; seed `linear.app/DESIGN.md`.
- Register: **dark product** — canvas `#010102`, surface ladder, lavender `#5e6ad2` accent scarce.
- Color strategy: Linear-inspired — near-black canvas, light gray ink, single lavender chromatic accent; semantic status colors only where data requires.
- Scene: dense operations desk — official records, calm accountability, product UI clarity (not civic indigo/teal).
- Fonts: Geist + Geist Mono substitute Linear Display/Text/Mono.
- Components: `@workspace/ui` shadcn; ⊥ reinvent buttons/forms/modals.
- ⊥ bans (carry from impeccable + Linear): side-stripe borders, gradient text, glassmorphism default, hero-metric SaaS row, identical icon-card grids, numbered eyebrows 01/02/03, ghost-card (border + shadow blur ≥16px), card radius >16px, lavender section fills, atmospheric gradients, spotlight cards.
- **Wireframes** (`wireframes/`): layout-shell ASCII — header band, sidebar, card-list containers, split panels, modals, responsive stacks; prod tokens `DESIGN.md` dark Linear; reference img light theme ≠ shipped UI.
- **Wireframe vs module precedence** (V92): wireframes define chrome & spatial patterns; module field/column/tab/modal requirements (§I UI surfaces, V72–V91) authoritative for data surfaces — where wireframe cols abbreviated, expand to full module spec.
- **Admin layout** (wireframes/admin): page header band; conditional alert bar; dashboard 2×2 + heatmap (V45); projects rich cards V72; budget V75–V80; progress V81–V84; approvals V85–V93; reports tab cards V90–V91; status popover V50.
- **Public layout** (wireframes/public): header logo left + theme/Admin right; ⊥ header module nav links (V100); landing hero + carousel; inner `/projects` header band + Live pill V72; ⊥ public budget/progress/reports (V99).
- **Theme**: `next-themes` class on `<html>`; default dark; light + system; visible toggle public nav + admin top bar; hotkey `d`; `.light` inverse tokens `globals.css`; both themes WCAG AA (V22).
- **PB realtime**: `collection.subscribe('*')` on mounted data modules; collections: projects, budget_allocations, budget_expenses, progress_updates, approval_actions (admin); shared subscribe helper in `@workspace/pocketbase`; zod parse events (V33); unsubscribe on unmount; ⊥ subscribe `/login`; reconnect retry on `window` focus; Live pill when subscribed; admin mutate → refetch/realtime confirm (⊥ optimistic v1).
- **PocketBase docs**: before writing/changing PB code (`packages/pocketbase/**`, `pb_migrations/**`, `pb_hooks/**`, PB SDK/rules/realtime/auth), read `packages/pocketbase/AGENTS.md` and fetch current @PocketBase docs / `https://pocketbase.io/docs/`; ⊥ rely on stale training data.

**Wireframe decisions** (locked)

| area | decision |
|---|---|
| public hero | keep preview frame + subtle lavender radial glow |
| public carousel | recent N dup for loop; auto-scroll; pause hover/focus; reduced-motion static |
| public /projects | static read-only card-list v1 |
| admin top bar | minimal — theme icon toggle + Sign out; search ⊥ v1 |
| admin dashboard heatmap | real deadline data from projects |
| admin /projects | card fields V72; filters V73; ⋮ Edit/Delete/status popover V50 |
| admin /budget | 4 summary cards V75 + breakdown V76 + transaction tabs V77–V80 |
| admin /progress | 4 summary cards V81 + list V82 + side detail V83 |
| admin /approvals | 4 summary cards V85 + tabs V86 + queue cards V87 + detail V93 |
| admin /reports | tab-selector summary cards V90 + 4 report tables V91; heatmap dashboard-only |
| wireframe precedence | layout shell from `wireframes/`; data cols/fields V72–V91 (V92) |
| realtime UI | Live pill in page header; retry subscribe on focus after drop |
| theme | sun/moon icon toggle (dark ↔ light); hotkey `d`; system via OS only |
- Product bans: display fonts in UI chrome; modal-first for simple edits; spinners in content area (use skeleton); inconsistent button/form vocab across screens.
- Motion: 150–250ms ease-out; state/feedback only; `@media (prefers-reduced-motion: reduce)` fallback required.
- Popovers/dropdowns: portal / `<dialog>` / `fixed` — escape `overflow:hidden` parents.
- Z-index semantic scale: dropdown → sticky → modal-backdrop → modal → toast → tooltip.
- a11y: WCAG 2.1 AA; focus-visible; status ≠ color alone; optional `.light` inverse theme via next-themes.

**Testing**

- TDD mandatory: red → green → refactor; ⊥ prod code without failing test first.
- Runner: Vitest (+ `@testing-library/react`, jsdom/happy-dom).
- ⊥ Playwright, ⊥ Cypress, ⊥ browser E2E runners.
- Pyramid: many unit (lib/hooks/utils), more component/integration (pages, forms), few journey tests (critical paths only).
- Journey tests: Vitest + RTL render user flows; page-object helpers OK; selectors via role/label or `data-testid` — ⊥ CSS class / nth-child.
- Tests independent; each creates own fixtures; ⊥ order deps across files.
- Mocks minimal — prefer real modules; MSW OK for PocketBase HTTP boundary.
- Skill refs: `apps/.agents/skills/vitest/SKILL.md`, TDD skill, e2e-testing-patterns (Vitest adaptation only).

**Validation**

- Zod 4.x runtime parse @ PB boundary + admin form submit.
- Schemas: `packages/pocketbase/src/schemas/` — single source; types via `z.infer<>` ⊥ duplicate TS-only unions in apps.
- Enums → `z.enum()` from manifest constants (§C Enums).
- Public: parse-on-read (`safeParse` → fallback empty/skip bad row).
- Admin: `safeParse` mutate payloads before `pb.collection().create|update`; form field errors from `ZodError`.
- Login, approval approve/reject, progress update → shared schemas (V5, V6, V15).

**Enums**

| domain | values |
|---|---|
| status | Planning, Procurement, Ongoing, Completed, Approved, Rejected |
| category | Infrastructure, Education, Health, Agriculture, Social Services, Scholarship |
| lgu_level | Municipality, Barangay, District, SK |
| expense_category | Materials, Labor, Equipment, Permits & Fees, Other |
| deadline_status | Lapsed, Completed, On Track, Near Deadline |
| role | Super Admin, Admin, User |
| account_status | Active, Inactive |
| audit_action | create, update, delete, deactivate, approve, reject, reset_password |

**Cagayan city/municipality options**

Tuguegarao City; Abulug; Alcala; Allacapan; Amulung; Aparri; Baggao; Ballesteros; Buguey; Calayan; Camalaniugan; Claveria; Enrile; Gattaran; Gonzaga; Iguig; Lal-lo; Lasam; Pamplona; Peñablanca; Piat; Rizal; Sanchez-Mira; Santa Ana; Santa Praxedes; Santa Teresita; Santo Niño; Solana; Tuao.

Canonical list stored in PB `locations` collection; Super Admin can add/edit/deactivate entries. Public filter uses active `locations` by name+slug.

**Access**

- RBAC: Super Admin > Admin > User.
- PBAC: code role→policy map + PB rule enforcement by action/resource, evaluated after auth and before UI/API mutate.
- First Super Admin: promote existing PB auth user/admin manually.
- Super Admin: user account CRUD, role/status management, password reset trigger, system settings.
- Admin: project/budget/progress/approval/report data actions per policy; ⊥ manage users/settings.
- User: public/read-only or assigned read scope unless policy grants more.
- Audit logs PB-owned: `pb_hooks` emits one structured wide event per completed mutate/approval/reset; client ⊥ writes `activity_logs`.

## §I

| kind | surface |
|---|---|
| compose | `docker-compose.local.yml` |
| env | `.env.sample`, `NEXT_PUBLIC_POCKETBASE_URL` |
| pb | `packages/pocketbase/pb_migrations/`, `pb_hooks/` |
| test | `turbo test`; per-package `vitest.config.ts`; `*.test.ts(x)` colocated w/ source |
| test deps | `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `jsdom` or `happy-dom`; MSW ? for PB API |
| design | `PRODUCT.md`, `DESIGN.md`, `linear.app/DESIGN.md` (getdesign seed) |
| wireframes | `wireframes/README.md`; `wireframes/shared/theme-realtime.ascii`; per-module ↓ |

**wireframe files** (layout shell; fields/cols → V72–V91)

| file | route / scope | cites |
|---|---|---|
| `wireframes/admin/shell.ascii` | admin chrome | V43,V52 |
| `wireframes/admin/projects.ascii` | `/projects` admin | V72–V74,V50 |
| `wireframes/admin/budget.ascii` | `/budget` admin | V75–V80 |
| `wireframes/admin/progress.ascii` | `/progress` admin | V81–V84 |
| `wireframes/admin/approvals.ascii` | `/approvals` admin | V85–V87,V92 |
| `wireframes/admin/reports.ascii` | `/reports` admin | V88–V91 |
| `wireframes/admin/modal.ascii` | CRUD/approve/expense dialogs | V74,V80,V84,V5 |
| `wireframes/admin/dashboard.ascii` | `/dashboard` overview | V45 |
| `wireframes/public/shell.ascii` | public header chrome | V41,V100 |
| `wireframes/public/projects.ascii` | `/projects` public | V72,V73,V55 |
| `wireframes/public/landing.ascii` | `/` hero + carousel | V42,V54 |
| pb-realtime | `packages/pocketbase/src/realtime.ts` — subscribe helper + types |
| theme-toggle | `theme-toggle.tsx` colocated both apps; `theme-provider.tsx` next-themes |
| tokens | `packages/ui/src/styles/globals.css` — OKLCH CSS vars |
| ui lib | `packages/ui/components/*` (shadcn) |
| zod | `packages/pocketbase/src/schemas/` — record + form schemas |
| zod deps | `zod@4` in `@workspace/pocketbase`; apps import schemas only |
| `format-display-date.ts` | `formatDisplayDate` + `formatDisplayDateTime` — en-US `MMM D, YYYY` (V97) |
| seed | `packages/pocketbase/scripts/seed-dev.ts`, `src/seed/dev-fixtures.ts`; `bun run seed:dev` |

**admin routes** (`apps/admin-frontend`)

| route | module |
|---|---|
| `/login` | auth portal |
| `/dashboard` | overview metrics |
| `/projects` | project tracking CRUD |
| `/budget` | allocations + expenses |
| `/progress` | milestone updates |
| `/approvals` | completion review queue |
| `/reports` | tabbed reports + export |
| `/users` | Super Admin user management |

**public routes** (`apps/public-frontend`)

| route | module |
|---|---|
| `/` | landing: centered hero, infinite projects carousel, accountability |
| `/projects` | read-only cards V72 + filters V73 |

**admin UI** (`apps/admin-frontend/components/`)

| file | role |
|---|---|
| `admin-shell.tsx` | sidebar + top bar + theme toggle → header band shell |
| `theme-toggle.tsx` | sun/moon in admin top bar |
| `dashboard-module.tsx` | KPI trend cards + widget grid |
| `projects-module.tsx` | project cards V72, filters V73, CRUD modal |
| `budget-module.tsx` | 4 summary cards + breakdown + allocation/expense tabs |
| `progress-module.tsx` | 4 summary cards + list + detail panel + update modal |
| `approvals-module.tsx` | 4 summary cards + queue cards + approve/reject modals |
| `reports-module.tsx` | global filters + tab-selector cards + 4 report tables + export |
| `user-management-module.tsx` | Super Admin user CRUD, roles, status, password reset |
| `site-photo.tsx` | PB file URL `<img>` for progress_update.site_photo |
| `site-photo-carousel.tsx` | approval queue photo carousel (V87,V96) |
| `summary-card-row.tsx` | compact KPI strip / metric cards |

**public UI** (`apps/public-frontend/components/`)

| file | role |
|---|---|
| `theme-provider.tsx` | next-themes dark default + `d` hotkey |
| `theme-toggle.tsx` | sun/moon in public nav chrome |
| `public-shell.tsx` | header logo + footer + full-bleed landing bands |
| `public-nav.tsx` | header right cluster — theme toggle + Admin CTA (admin login) |
| `public-landing.tsx` | hero + admin portal preview + infinite carousel + accountability |
| `admin-portal-preview.tsx` | landing hero admin `/projects` chrome silhouette |
| `public-projects.tsx` | read-only cards V72 + filters V73 |

**collections** (PocketBase)

```
projects → id, name, description, category, status, location, lgu_level, contractor,
  start_date, target_end_date, budget_year, total_budget,
  moa_file, resolution_file, supporting_docs[],
  progress_pct, number_of_students?, approval_status?, approved_at?, approved_by?, rejection_reason?

budget_allocations → project, amount, year, description, date, allocated_by,
  moa_file?, resolution_file?, supporting_docs[]

budget_expenses → project, amount, category, date, receipt_number, description

progress_updates → project, from_pct, to_pct, notes, site_photo, updated_by, updated_at
  certification_completion, certificate_acceptance, proof_payment_barangay,
  acknowledgment_completion, audit_documents[], verification_documents[], liquidation_documents[]

approval_actions → project, action(approve|reject), authority_name, reason?, created_at

locations → name, slug, active, sort_order?, created_by?, updated_by?

activity_logs → actor_user, actor_role, action, resource, resource_id?, policy_key?,
  target_user?, before?, after?, outcome, error?, duration_ms, request_id, env, created_at

pb_hooks → server-side audit hook on user/project/budget/progress/approval/location mutations
```

**journey tests** (Vitest + RTL — critical paths only)

| id | journey | app |
|---|---|---|
| J1 | admin login → session → reach `/dashboard` | admin |
| J2 | unauthenticated `/dashboard` → redirect `/login` | admin |
| J3 | public `/projects` browse + filter; ⊥ create/edit/delete affordance | public |
| J4 | admin create project via modal → appears in list | admin |
| J5 | admin approve completed project → status Approved | admin |
| J6 | Super Admin `/users` create/edit/deactivate/delete/reset password | admin |
| J7 | Admin direct `/users` → deny/redirect; nav link hidden | admin |
| J8 | public `/projects` city/municipality filter combines w/ status/category | public |
| J9 | Projects module content stays visible at 100% zoom under nav/header | admin |
| J10 | mutate/approve/report actions append structured `activity_logs` row | admin |

**UI surfaces** (per module — detail in §V)

- **App shell** (admin): icon sidebar + breadcrumb top bar + theme icon toggle + Sign out; ⊥ global search v1; page header band + optional Live pill; mobile drawer.
- **Dashboard** (`/dashboard`): page header + alert if approval queue; KPI cards w/ value + trend + footer line + drill chevron; 2×2 widgets — budget split, progress buckets, deadline heatmap (real project data), quick links.

**Projects** (`/projects`) — admin (V72–V74,V50)

- List: project cards — name, location, description, category, lgu_level, date range (start→target_end), budget_year, total_budget (₱), progress bar, status badge.
- Filters: status, category, lgu_level, city/municipality location, date range — visible **From:** / **To:** labels (V101); search bar by name.
- Actions: New project; per-card Edit + Delete; ⋮ Change status via portal popover (V50); ⊥ inline row expand v1.
- Create/Edit modal fields: name, description (textarea), category, status, location, lgu_level, contractor, start_date, target_end_date, budget_year (required), total_budget (PHP); doc uploads — MOA, Resolution, Supporting Project Documents — `DocumentUploadField` drag-drop UI (V102): MOA+Resolution single w/ remove+replace; supporting multi (≤10).

**Budget** (`/budget`) — admin (V9,V10,V75–V80)

- Summary: 4 cards — Total Budget (₱ + project count), Allocated (₱ + progress bar), Spent (₱ + progress bar), Remaining (₱).
- Breakdown list: per project — name, location, total_budget, allocated, spent, remaining, spend-% progress bar.
- Transactions tabs: Allocations | Expenses; filter dropdowns — project, year.
- Allocations tab: cols project, amount (green/+), year, description, date, allocated_by; `+ Allocate` → modal (project, amount, year default current, description, Required documents section w/ labeled V102 uploads).
- Expenses tab: cols project, amount (red/−), category, date, receipt_number; `+ Record Expense` → modal (project, amount, receipt_number, category, expense date, description).

**Progress** (`/progress`) — admin (V6,V7,V8,V81–V84)

- Summary: 4 cards — Active Projects, On Track (≥50%), Needs Attention (<25%), Updates Today.
- List per project: name, status badge, location, lgu_level, progress bar + %, start_date, target_end_date, contractor, last_updated; recent 3 updates inline (e.g. 80%→90%, notes, date) + "View all N updates"; View Details + Update Progress (admin).
- Detail panel (side): name, location, category, lgu_level, timeline, status, overall progress bar; chronological history — from%→to%, datetime, notes, site_photo?, updated_by; Update Progress CTA bottom (admin).
- Update Progress modal: project name + current %; slider 0–100% w/ markers 0/25/50/75/100; site_photo required (JPG,PNG,WebP) via V102 single-file upload w/ remove+replace; notes textarea; if target progress = 100%, completion docs V110 required before Save; Save + Cancel.

**Approvals** (`/approvals`) — admin only (V3,V4,V5,V13,V85–V87)

- Summary: 4 cards — Pending Approval, Approved, Rejected, Total Budget Managed (₱).
- Tabs: Completion Approval | Approved | Rejected.
- Queue card: name, location, status badge, category, lgu_level, total_budget, progress bar + %, budget utilization bar (spent/saved), progress update count, latest site photo(s) carousel; View Details, Approve (green), Reject (red).
- Detail panel (side): V93 — full project + budget summary + progress history + completion docs; warning/block V13; Approve + Reject CTAs bottom.
- Approve modal: confirmation copy; approving authority name (required); Cancel + Confirm Approval.
- Reject modal: explanation copy; reviewing authority name; reason (required textarea); Cancel + Confirm Rejection.

**Reports** (`/reports`) — admin only (V11,V12,V88–V91)

- Header: title Reports; subtitle "Generate and export reports as Excel files"; `Export All Sheets` + `Export Current Tab` (V12).
- Global filters (all tabs): status (incl. All Status), category (incl. All Categories), lgu_level (incl. All LGU), date range from/to (V94).
- Summary cards (clickable tab selectors): Projects count, Budget total (₱), Progress update count, Approvals count (V95).
- Tabs + preview tables w/ record-count badge:
  - **Projects**: name, category, status, deadline_status (V11), lgu_level, location, total_budget, progress.
  - **Budget**: name, category, lgu_level, total_budget, allocated, spent, remaining, util %; total row bottom.
  - **Progress**: name, category, lgu_level, from %, to %, change (+N%), site photo thumbnail (V96), updated_at, updated_by — 1 row per update.
  - **Approvals**: name, category, lgu_level, status, total_budget, spent, savings (green), approved_at, approved_by; pending → "Pending" in approved cols.

- **User Management** (`/users`) — Super Admin only (V115–V121)
  - List: all registered users — name, email, role, account_status, created/updated, last_login?.
  - Actions: Create account; Edit name/email/role/status; Deactivate; Delete (soft default; hard confirm); Trigger password reset email.
  - Admin role policies: can add/update project data per module policy; ⊥ manage users; ⊥ system settings.
  - UI: Super Admin sees Users nav + role badge; Admin/User hide Users nav and unavailable actions.

- **Activity Logs** — admin audit surfaces (V124–V128)
  - Budget: allocation/expense rows record who logged action.
  - Approvals: approve/reject record actor + authority fields.
  - Reports: project/budget/progress/approval create/update/delete actions visible/exportable by Super Admin only.

- **Public shell**: logo left; header right — theme toggle + Admin CTA (links admin login); ⊥ pill nav / module links (V100); landing full-bleed bands; footer Sections → `/projects`.
- **Public landing** (`/`): centered hero + eyebrow badge + Admin CTA + admin portal preview frame (sidebar + projects list silhouette, live names when loaded) + subtle lavender radial; carousel recent N dup auto-scroll pause hover; enriched cards; accountability; ⊥ explore divide-y list (V31).
- **Public /projects**: read-only projects list (V72,V73,V123); city/municipality filter; ⊥ Edit/Delete/New (V2,J3,J8).
- **Public module pages**: skeleton loading (V24); dashed empty + hint (V25); dark/light tokens (V60,V61); PB realtime + Live pill (V62–V67).

## §V

V1: ∀ unauthenticated admin route (≠ `/login`) → redirect login.
V2: Public frontend ⊥ mutate API calls (create/update/delete).
V3: Approvals routes & nav ⊥ exist on public frontend.
V4: Project status Completed → eligible for approval queue.
V5: Approve action requires `authority_name`; reject requires `reason` + `authority_name`.
V6: Progress update requires `site_photo` upload.
V7: Progress summary Needs Attention = projects w/ progress_pct < 25%.
V8: Progress summary On Track = projects w/ progress_pct ≥ 50%.
V9: Budget summary cards aggregate ∀ projects (total, allocated, spent, remaining).
V10: Expense amounts display negative/red; allocation amounts positive/green.
V11: Reports deadline_status: Lapsed=red, Completed=green, On Track=blue, Near Deadline=orange.
V12: Excel export ⊥ available on public frontend.
V13: 100% progress update w/o completion docs → block save/forward/approval; approval detail/card show missing docs list.
V14: ∀ PB collection rules → public read list/view; write admin auth only.
V15: Admin login → session persists; logout clears session.
V16: ⊥ prod code merge w/o preceding failing vitest for that behavior (TDD).
V17: ∀ §T feature row (status → `x`) → cites ≥1 test file covering claimed behavior.
V18: Journey tests J1–J5 exist & pass under `turbo test`.
V19: Journey/UI tests query by role, label, or `data-testid` — ⊥ brittle CSS selectors.
V20: Test files independent; no shared mutable global state between tests.
V21: `turbo test` green locally & in CI before merge.
V22: Body text contrast ≥4.5:1 vs bg; muted-foreground ≥4.5:1 (not washed gray).
V23: ∀ interactive component → default, hover, focus-visible, active, disabled, loading, error states.
V24: Content loading → skeleton rows/cards — ⊥ centered spinner in content area.
V25: Empty states include headline + next-action affordance.
V26: Card/section radius ≤16px; tags/buttons may pill.
V27: ⊥ side-stripe accent borders, gradient text, ghost-card pattern on cards/buttons.
V28: UI motion 150–250ms; `prefers-reduced-motion: reduce` → instant or crossfade.
V29: Popovers/menus in scroll containers use portal/fixed/dialog — ⊥ clipped by overflow.
V30: UI implementation uses `@workspace/ui` primitives — ⊥ one-off custom form/button vocab.
V31: Public landing ⊥ SaaS hero-metric template & identical icon+heading+text card grids.
V32: Theme tokens match `DESIGN.md` Linear OKLCH roles in `globals.css` (`:root` dark canvas).
V40: Default theme dark; lavender accent only on brand, CTA, focus, links — ⊥ lavender section fills.
V33: ∀ PB record consumed in app → zod `.safeParse` w/ collection schema; invalid → skip/log ⊥ crash UI.
V34: ∀ admin PB mutate → zod-validated payload before API call.
V35: Login, approval, progress forms use shared zod schemas; reject shows field-level error (V23).
V36: Zod enum values = §C Enums table (manifest source).
V37: `bun run docker:dev` → compose up exits 0; stack reachable via Caddy URLs.
V38: `createPocketBaseClient` → `autoCancellation(false)`; Next.js client components ⊥ unhandled ClientResponseError 0 on remount.
V39: Root layout `<body suppressHydrationWarning>` — browser extensions may inject attrs; ⊥ hydration mismatch on body.
V41: Public shell — logo left; header right cluster theme toggle + Admin CTA (admin login); ⊥ pill nav / header module links (V100); ⊥ Budget/Progress/Reports (V99); ⊥ separate Browse projects CTA + duplicate Admin text link.
V42: Public landing `/` — centered hero + Admin CTA + admin portal preview (admin `/projects` chrome) + infinite enriched projects carousel + accountability; ⊥ explore list body blocks.
V53: Public ∀ inner module — page header band: title + context subline + ≤3 read-only KPI tiles.
V54: Public landing carousel — recent N projects dup for seamless loop; auto-scroll + pause hover/focus; `prefers-reduced-motion` static; enriched cards; PB `projects` subscribe (V62).
V55: Public `/projects` — read-only project cards V72 + filters V73,V123; ⊥ mutate V74 (V2,J3,J8).
V56: ⊥ public `/budget` route/nav — budget module admin-only (V99).
V57: ⊥ public `/progress` route/nav — progress module admin-only (V99).
V58: ⊥ public `/reports` route/nav — reports module admin-only (V99).
V59: Public wireframe layout — dark default + light toggle (V60); ⊥ reference-only light card styling (drop shadows, radius >16px).
V43: Admin ∀ module page — header band: title + context subline left, ≤3 compact KPI tiles right.
V44: Admin queue/pending surfaces — alert bar below header when approval queue > 0 w/ deep-link CTA.
V45: Admin dashboard — KPI cards (value + optional trend + footer line + chevron link) + 2×2 widget grid.
V46: Admin projects — card fields V72; filters V73; ⋮ Edit/Delete + status portal popover (V50); ⊥ inline row expand v1.
V47: Admin budget — 4 summary cards V75 + per-project breakdown V76 + segmented utilization where applicable.
V48: Admin progress — 4 summary cards V81; list V82; detail panel V83; update modal V84.
V49: Admin reports — global filters V89; tab-selector summary cards V90; 4 tab tables V91; export V88.
V50: Admin project status change — portal popover w/ color-coded §C status options; ⊥ modal for status-only pick.
V51: Admin layout mini viz — CSS progress/sparkline/segment bars only v1; ⊥ chart library dep for layout shell.
V52: Wireframe-inspired admin UI — dark default + light toggle (V60); ⊥ reference light cards, drop shadows, radius >16px, row spotlight glow.
V60: Theme toggle — sun/moon icon public nav + admin top bar; flips dark ↔ light; `next-themes` class on `<html>`; default dark; `data-testid="theme-toggle"`; hotkey `d`; V23 states.
V61: `.light` + `.dark` both map `DESIGN.md` OKLCH roles in `globals.css`; body text contrast ≥4.5:1 each theme (V22).
V62: Data modules subscribe PB realtime `collection.subscribe('*')` on mount; `unsubscribe` on unmount; ⊥ leaked subs; retry subscribe on `window` focus after drop.
V63: Realtime event records → zod `safeParse` before state merge; invalid → skip/log (V33).
V64: Realtime collections — projects (all modules), budget_allocations, budget_expenses, progress_updates; approval_actions admin only; ⊥ subscribe on `/login`.
V65: Public realtime handlers read-only — patch local state only; ⊥ mutate side effects (V2).
V66: Admin PB mutate UI → refetch or realtime confirm; ⊥ optimistic local patch v1.
V67: Page header shows Live pill when PB subscription active.
V68: PB optional select/relation fields return `""` when unset — record schemas coerce `""`→`undefined` before enum parse; valid rows must not be dropped by `parseRecordList` (V33).
V69: Docker dev ⊥ isolate `.next` in named volumes — bind-mount app source + host `.next` (gitignored); stale turbopack manifest → route 404 until cache cleared.
V70: `bun run seed:dev` inserts `Demo:`-prefixed projects + budget/progress rows; fixtures validate via `projectMutateSchema`; idempotent unless `--force`; seeds app `users` login from `POCKETBASE_ADMIN_*`.
V71: PB list/view API may omit `created`/`updated` on records — `baseRecordSchema` treats both optional; `parseRecordList` must not drop rows solely for missing timestamps (V33).
V72: Project list cards show name, location, description, category, lgu_level, date range (start_date→target_end_date), budget_year, total_budget, progress bar, status badge.
V73: Project list filters: status, category, lgu_level, city/municipality location, date range (from/to); search bar matches name (case-insensitive substring).
V74: Admin project card actions: Edit + Delete; public ⊥ create/edit/delete affordances (V2,J3).
V75: Budget summary = 4 cards: total budget (₱ + project count), allocated (₱ + progress bar), spent (₱ + progress bar), remaining (₱); aggregates ∀ projects (V9).
V76: Budget breakdown row: project name, location, total_budget, allocated, spent, remaining, spend-% progress bar.
V77: Budget Allocations & Expenses tabs — filterable by project dropdown + year dropdown.
V78: Allocations table cols: project, amount (green positive V10), year, description, date, allocated_by.
V79: Expenses table cols: project, amount (red negative V10), category, date, receipt_number.
V80: Allocate modal: project, amount, year (default current), description, 3 doc uploads (MOA, Resolution, supporting); Record Expense modal: project, amount, receipt_number, category, expense date, description.
V81: Progress summary = 4 cards: active projects (status ∈ Planning|Procurement|Ongoing), on track (V8), needs attention (V7), updates today (progress_updates dated today).
V82: Progress list row: status badge, location, lgu_level, progress %, dates, contractor, last_updated; inline preview last 3 updates + "View all N updates" link.
V83: Progress detail panel: full project context + chronological update history; admin Update Progress CTA at bottom.
V84: Progress update modal: slider 0–100% w/ markers 0/25/50/75/100; site_photo required (V6); notes textarea.
V85: Approvals summary = 4 cards: pending approval count, approved count, rejected count, total budget managed (₱).
V86: Approvals tabs: Completion Approval | Approved | Rejected.
V87: Approval queue card: budget utilization bar (spent + saved), progress update count, site photo carousel (V96) when photos on file.
V88: Reports header subtitle "Generate and export reports as Excel files"; admin Export All Sheets + Export Current Tab; public ⊥ export (V12).
V89: Reports global filters — status, category, lgu_level, date range from/to w/ All sentinel options (V94) — apply ∀ tab previews.
V90: Reports summary cards clickable → activate matching tab (Projects, Budget, Progress, Approvals counts per V95).
V91: Reports tab table cols: Projects (V11 deadline_status), Budget (+ total row), Progress (per-update row w/ from/to/change/photo thumbnail V96), Approvals (pending → "Pending" in approved_at/approved_by).
V92: Wireframe ASCII = layout shell only; module UI surfaces + V72–V91 override abbreviated wireframe cols/rows; dashboard heatmap ⊥ replace reports tab-selector model (V90).
V93: Approvals detail panel: name, location, category, lgu_level, status, contractor, timeline, description; budget summary total/spent(red)/savings(green); progress history w/ transitions, notes, photos, updated_by; V13 warning + Approve/Reject CTAs for pending entries only (V109).
V94: Reports filter dropdowns include All Status / All Categories / All LGU sentinel options + date range from/to (V89).
V95: Reports Approvals summary card = count completed+approved projects (status Approved ∨ approval approved).
V96: `progress_updates.site_photo` → render `<img>` via PB file URL (`recordFileUrl`) in admin progress history (V83), admin approval queue carousel (V87) + detail photos (V93), admin reports Progress tab photo col; ⊥ text-only "attached" / Yes-No badge only.
V97: ∀ user-facing date/datetime → `formatDisplayDate` / `formatDisplayDateTime` (`MMM D, YYYY`; timestamps + time); ⊥ raw ISO / `YYYY-MM-DD` strings in UI tables, cards, history.
V98: Admin + public responsive ∀ breakpoints — sidebar collapses mobile (admin); tables `overflow-x-auto`; tab bars horizontal scroll; filter grids `grid-cols-1` → `sm+`; touch targets ≥44px; hero `text-balance` + stepped heading scale; modals `w-[calc(100vw-2rem)]` mobile.
V99: Public frontend routes = `/` landing + `/projects` only; ⊥ `/budget`, `/progress`, `/reports` route files + header nav links (admin modules unchanged); footer `/projects` link OK.
V100: Public header ⊥ module nav links — logo left + theme toggle + Admin CTA right only; `/projects` via landing CTA, footer, or direct URL.
V101: Date range filters show visible **From:** / **To:** labels above date inputs on admin `/projects` (V73), admin `/reports` (V89), public `/projects` (V55); aria-label retained.
V102: Doc upload fields (`DocumentUploadField`) — drag-drop zone (`aria-labelledby` label) + file list w/ per-file remove by stable identity (`name:size:lastModified`); MOA+Resolution single (replace on re-select); supporting_docs multi (≤10, limit message when truncated); progress site_photo single; `existingNames` shows server filenames on edit; MIME per §C.
V103: Budget allocate modal — Required documents section w/ visible labels: Memorandum of Agreement, Resolution, Supporting project documents (V80,V102).
V104: Upload modal file picks cleared on dialog close — admin project CRUD modal + budget allocate modal (`clearUploadFiles` / `clearAllocationUploads` on `onOpenChange(false)`).
V105: `DocumentUploadField` file rows keyed by `fileIdentity`; remove one of duplicate filenames must not drop siblings.
V106: Budget allocation/expense table amount cells show exactly one signed, comma-formatted value: `+100,000` / `-100,000`; ⊥ duplicate PHP currency suffix in those cells.
V107: `progress_updates.from_pct=0` valid; PB migration keeps `from_pct` non-required so zero-default start projects can create first update (V6,V84).
V108: Approval completion writes free-text authority only to `approval_actions.authority_name`; `projects.approved_by` relation ⊥ receive authority_name string.
V109: Approved/Rejected approval tab entries are read-only: card + detail show View details only; ⊥ Approve/Reject buttons. Rejected entries show `rejection_reason` on card + detail.
V110: Required completion docs for target progress 100%: Certification of Completion, Certificate of Acceptance, Proof of Payment from Barangay, Acknowledgment of Completion, Audit Documents, Verification Documents, Liquidation Documents; all must be uploaded before progress save or approval action.
V111: Pending approval review surfaces display uploaded completion docs from the latest 100% progress update with file links/names; missing docs list remains visible until complete.
V112: Scholarship project category requires `number_of_students` numeric input >0 in project create/edit; non-Scholarship omits/clears it.
V113: PB optional number fields return `0` when unset — record schemas coerce `0|""|null`→`undefined` before positive/int parse; valid rows must not be dropped by `parseRecordList`.
V114: PB additive migrations guard existing fields before `fields.add`; fresh DB initial snapshot + later migration must not duplicate fields.
V115: Auth user has exactly one §C role + account_status; Inactive → login/session denied; first Super Admin = promoted existing PB auth user/admin.
V116: Super Admin role → access `/users` route/nav + account create/edit/deactivate/delete/reset password email.
V117: Admin/User roles → `/users` route denied/redirected; Users nav hidden; user-management mutate APIs rejected.
V118: PBAC policy check `(actor, action, resource)` uses code role→policy map + PB rules before admin mutate; deny → no PB write + user-visible forbidden state.
V119: Admin policy grants project/budget/progress/approval/report data actions only; ⊥ manage users/system settings.
V120: Role change/status/delete/reset password actions require Super Admin + audit row; delete defaults soft deactivate, hard delete requires explicit confirm.
V121: UI shows current user role badge and hides unavailable actions; server/PB rules still enforce (⊥ UI-only auth).
V122: Admin nav/header uses non-obscuring layout: content offset/sticky safe at 100% zoom; Projects text/actions not covered.
V123: Public `/projects` city/municipality filter options load active PB `locations`; each has name+slug; selected slug matches normalized `projects.location`; combines w/ status/category/lgu/date/search filters.
V124: PB audit hook emits wide event per completed budget allocation/expense create/update/delete with actor_user, actor_role, resource, action, outcome.
V125: PB audit hook observes approval approve/reject mutations and writes `activity_logs` row with actor_user, actor_role, action, project, authority_name, outcome, reason? for reject.
V126: Reports audit view/export shows who created/updated projects, budgets, progress, approvals tables to Super Admin only.
V127: Audit event structure is JSON; include request_id, policy_key, duration_ms, env/version/commit when available; ⊥ unstructured strings as audit logs.
V128: Failed/denied user/account/data actions emit audit row from PB hook with outcome=`error|denied` and sanitized error; ⊥ secrets/passwords in logs.
V129: User-visible labels + PB schema/storage use "Resolution" / `resolution_file`; migrate/rename prior `agreement_file` data.
V130: Admin/public clients ⊥ create/update/delete `activity_logs`; audit trail source of truth = PocketBase hooks only.
V131: Public `/projects` project list renders from `projects` even if `locations` fetch fails/missing; location filter may empty/disable, but project cards ⊥ blank solely due locations error.
V132: User role/status migration backfills existing auth users; login denies only explicit `account_status="Inactive"`; missing legacy `account_status` ⊥ block login before backfill.
V133: ∀ PocketBase-related code/spec changes → follow `packages/pocketbase/AGENTS.md`; fetch current @PocketBase docs before touching migrations, hooks, rules, SDK auth, realtime, or collection APIs.
V134: Applied PocketBase migrations are immutable history; fixes to already-recorded migration behavior ship as later `pb_migrations/*` repair files, not edits-only to old filenames.
V135: Admin frontend project surfaces include location end-to-end: `/projects` cards show location; filters include city/municipality; create/edit modal selects location; budget/progress/approval/report project references display location when space allows.
V136: Dev seed demo project `location` values ∈ canonical PB `locations`; `seed:dev` repairs existing `Demo:` rows with non-canonical locations on rerun.
V137: PocketBase JS hook entrypoints use `pb_hooks/*.pb.js`; serialized handlers ⊥ close over outer variables, use `globalThis.__hooks`/`require()` inside handler bodies per @PocketBase docs.
V138: Local verification runs from lockfile-restored workspace deps: if `turbo test` cannot resolve package-local dev tools (`vitest`, `eslint`, `tsc`), run `bun install --frozen-lockfile` before treating it as app failure.

## §T

| id | status | task | cites |
|---|---|---|---|
| T1 | x | docker-compose pb + admin + public dev | V14, local-dev-docker |
| T2 | x | Next.js frontend Dockerfiles + root `.dockerignore` | local-dev-docker |
| T3 | x | `.env.local` / `.env.sample` + commitlint + semantic-release | local-dev-docker |
| T4 | x | vitest monorepo: per-package configs, `turbo test`, RTL + jsdom, root `test` script | V16,V20,V21 |
| T5 | x | apply civic OKLCH palette to `globals.css` per DESIGN.md | V32,DESIGN.md |
| T6 | x | admin app shell: sidebar + top bar + mobile collapse | V23,V30,PRODUCT.md |
| T7 | x | PB migrations: projects, budget_allocations, budget_expenses, progress_updates, approval_actions | V14,V16 |
| T8 | x | PB collection rules: public read, admin write | V2,V14,V16 |
| T9 | x | shared PocketBase client + types in both frontends | I.env,V16 |
| T10 | x | admin `/login` form, session, route guard + tests | V1,V15,V16,J1,J2 |
| T11 | x | public `/` landing (impeccable): header, hero, carousel, footer + tests | V28,V31,V16 |
| T12 | x | project tracking: cards V72, filters V73, search, admin CRUD modal V74 + tests | V2,V4,V16,V23,V25,V72–V74,J4 |
| T13 | x | budget module: summary V75, breakdown V76, tabs V77–V80 + modals + tests | V9,V10,V16,V24,V75–V80 |
| T14 | x | progress module: summary V81, list V82, detail V83, update modal V84 + tests | V6,V7,V8,V16,V81–V84 |
| T15 | x | approvals (admin only): summary V85, tabs V86, cards V87, detail V93, modals V5 + tests | V3,V4,V5,V13,V16,V85–V87,V93,J5 |
| T16 | x | reports: filters V89,V94, tab cards V90,V95, 4 tables V91, admin Excel export V88 + tests | V11,V12,V16,V88–V95 |
| T17 | x | admin `/dashboard` overview metrics + tests | V9,V16,V24 |
| T18 | x | wire public read-only routes + tests | V2,V3,V12,V16,J3 |
| T19 | x | journey test suite J1–J5 (Vitest + RTL page objects) | V18,V19 |
| T20 | x | impeccable audit pass on shipped admin + public surfaces | V22–V31 |
| T21 | x | zod deps + enum primitives in `packages/pocketbase/src/schemas/` | V36,I.zod |
| T22 | x | collection record schemas (5 collections) + parse helpers | V33,V36,V16 |
| T23 | x | admin modules: validate mutate payloads before PB calls | V34,V5,V6,V16 |
| T24 | x | public modules: parse-on-read for PB list responses | V33,V2,V16 |
| T25 | x | login + approval + progress forms: zod + inline field errors | V35,V23,V16 |
| T26 | x | colocated schema vitest suite under `schemas/*.test.ts` | V16,V17 |
| T27 | x | impeccable polish v2: public nav active states, hero refresh, loading/empty states, metric surfaces, admin dashboard quick links + progress bars | V22,V24,V25,V26,V27,V28,V31 |
| T28 | x | fix hydration body attrs + PB autoCancellation + progress_updates client sort | V38,V39,V16 |
| T29 | x | public landing page: full-bleed hero, explore task list, accountability, footer nav | V28,V31,V25 |
| T30 | x | linear.app design: activate DESIGN.md, OKLCH tokens, public+admin surfaces | V32,V40,DESIGN.md |
| T31 | x | public layout: wireframes/public — shell, landing, module pages per V72–V91 | V41,V42,V53–V59,V72–V91,I.wireframes |
| T32 | x | admin layout: wireframes/admin — shell, modules per V72–V93 | V43–V52,V72–V93,I.wireframes |
| T33 | x | theme icon toggle + Live pill + PB realtime helper + focus retry | V60–V67,I.pb-realtime |
| T34 | x | dev seed script + demo fixtures + fixture zod tests | V70,I.seed |
| T35 | x | site photo render V96 + Admin CTA V41 + portal preview V42 | V41,V42,V87,V93,V96,I.wireframes |
| T36 | x | display date format V97 + responsive polish V98 (impeccable audit) | V97,V98,V22,V23,DESIGN.md |
| T37 | x | public scope trim: ⊥ budget/progress/reports routes+nav; Projects-only public shell | V99,V41,V56–V58 |
| T38 | x | public header: ⊥ module nav links; logo left + theme/Admin right spacing | V100,V41 |
| T39 | x | admin upload UX: From/To filter labels V101; DocumentUploadField V102; budget alloc labels V103 + tests | V73,V80,V84,V101–V103 |
| T40 | x | upload review hardening: V104 modal reset, V105 file identity, reports/public From/To, edit existingNames | V101,V104,V105,document-upload-field.test.tsx |
| T41 | x | production feedback fixes: signed budget cells, 0% progress migration, relation-safe approval | V106,V107,V108 |
| T42 | x | approvals read-only reviewed tabs + rejection reason display | V86,V93,V109 |
| T43 | x | 100% completion docs gate + Scholarship student count | V13,V16,V34,V35,V84,V93,V110,V111,V112,V113,V114 |
| T44 | x | Super Admin promotion + RBAC/PBAC role-policy map + `/users` management panel | V16,V115–V121,J6,J7 |
| T45 | x | PB `locations` collection + public city/municipality filter by name+slug | V16,V55,V73,V123,J8 |
| T46 | x | admin nav/header obscuring fix at 100% zoom, especially Projects | V16,V98,V122,J9 |
| T47 | x | PB hook-owned Super Admin-only activity_logs audit trail + wide-event structure | V16,V124–V128,V130,J10 |
| T48 | x | rename "Province/Barangay Agreement" to "Resolution" incl `resolution_file` migration | V16,V80,V102,V103,V129 |
| T49 | x | J6–J10 coverage via Vitest+RTL/component/source checks | V18,V19,J6–J10 |
| T50 | x | bugfix public projects location fallback + legacy admin login role/status backfill | V16,V123,V131,V132,J1,J3,J8 |
| T51 | x | admin project location UI: cards, filters, create/edit modal, and cross-module project references | V135,V72,V73,V74,V75–V91 |
| T52 | x | seed canonical demo locations + PB audit hook docs-compliant `*.pb.js` entrypoint/runtime actor capture | V133,V136,V137,V124–V128,V130 |

## §B

| id | date | cause | fix |
|---|---|---|---|
| B1 | 2026-06-15 | `docker:dev` used `compose up --watch`; caddy/frontends lack `develop.watch` → exit 1 | default `docker:dev` = `up --build` only; bind mounts + Next HMR; optional `docker:watch` for pb | V37 |
| B2 | 2026-06-15 | PB default autoCancellation cancels duplicate in-flight GETs on React Strict Mode remount → ClientResponseError 0 in admin modules | `createPocketBaseClient` sets `autoCancellation(false)` | V38 |
| B3 | 2026-06-15 | Grammarly etc inject `data-gr-*` on `<body>` before hydration → React body attr mismatch | `suppressHydrationWarning` on `<body>` in both root layouts | V39 |
| B4 | 2026-06-15 | `progress_updates.getFullList({ sort: '-created' })` → 400 in dev | fetch unsorted; sort client-side by `created` desc | T28 |
| B5 | 2026-06-15 | PB unset optional selects (`approval_status`, `lgu_level`) return `""`; zod enum `.optional()` rejects `""` → `parseRecordList` drops all rows → empty UI despite API data | `pbEmptyAsUndefined` preprocess on optional enum/relation fields in record schemas | V68 |
| B6 | 2026-06-15 | `admin_next_cache`/`public_next_cache` named volumes shadow bind mount `.next` → stale turbopack route manifest → `/dashboard` etc 404 while `/login` 200 | drop `.next` named volumes from compose dev; `docker:clean-cache` script | V69 |
| B7 | 2026-06-15 | PB list API omits `created`/`updated`; `baseRecordSchema` required both → `parseRecordList` dropped 100% rows → empty UI all modules | `created`/`updated` optional in `baseRecordSchema`; sort fallbacks use `id` | V71 |
| B8 | 2026-06-17 | budget allocate modal kept `moaFile`/`supportingFiles` in state after cancel → stale picks on reopen | `clearAllocationUploads` on `onOpenChange(false)` + before open | V104 |
| B9 | 2026-06-17 | allocation/expense rows rendered sign helper + PHP formatter → `+100000 ₱100,000` confusing duplicate amount | `formatAllocationAmount` / `formatExpenseAmount` return signed comma value; table cells render helper only | V106 |
| B10 | 2026-06-17 | PB required number field treated first progress `from_pct=0` as blank in deployed form-data create → progress update 400 | migration `1740000003_progress_from_pct_zero.js` makes `from_pct.required=false`; app still sends `0` | V107 |
| B11 | 2026-06-17 | approval update wrote `authority_name` text into `projects.approved_by` relation → project update 400; action created but project not moved Approved | omit `approved_by` relation from project update; keep authority text in `approval_actions` | V108 |
| B12 | 2026-06-18 | PB unset optional `number_of_students` returns `0`; zod `.positive().optional()` rejects `0` → `parseRecordList` drops non-Scholarship projects → empty frontends | `pbZeroAsUndefined` preprocess on optional number fields; records test covers zero-default row | V113 |
| B13 | 2026-06-18 | initial migration snapshot and additive completion-doc migration both define new fields → fresh DB can duplicate field add | `1740000004_completion_docs_students.js` guards `fieldExists()` before add/remove | V114 |
| B14 | 2026-06-23 | admin nav/header can overlay Projects module text at 100% zoom | content offset/sticky safe layout invariant + journey regression | V122,J9 |
| B15 | 2026-06-23 | public `/projects` `Promise.all(projects, locations)` treats missing/blocked `locations` as fatal → catches by clearing projects → no public data | decouple project fetch from location fetch; locations failure only disables/empties location filter | V131 |
| B16 | 2026-06-23 | new login check requires `account_status="Active"`; legacy auth users may lack role/status after migration → valid admin cannot login | backfill existing users role/status in migration/seed; login denies only explicit Inactive | V132 |
| B17 | 2026-06-23 | rules migration referenced `locations`/`activity_logs` before some DBs had them → migration abort | `findCollectionIfExists` skips absent collections; later snapshot/additive migrations own creation | V14,V114 |
| B18 | 2026-06-23 | audit hook only emitted success rows and missed error wide-event fields | add error hooks + before/after, duration, request_id, env version/commit fields | V124–V128 |
| B19 | 2026-06-23 | authenticated `User` could see/invoke admin module mutation controls before PB rejected write | gate project/budget/progress/approval/user actions with `canAccess` policy map before PB calls | V118,V121 |
| B20 | 2026-06-23 | `seed:dev` created 100% progress rows without completion docs → seeded data violated approval gate | seed all `REQUIRED_COMPLETION_DOCUMENTS` fixture files when `fixture.progress.to_pct >= 100` | V70,V110 |
| B21 | 2026-06-23 | seed runs authenticate as `_superusers`; audit hook wrote that id into `activity_logs.actor_user` relation to `users` | map `_superusers` to actor_role `Super Admin`; only set `actor_user` for auth collection `users` | V127,V128 |
| B22 | 2026-06-23 | audit success hooks ran after request context was gone; failed request path could also duplicate after-error row | cache request auth/requestInfo per record; mark request-audited errors before after-error hooks | V124–V128 |
| B23 | 2026-06-23 | edited PB migrations `1740000002`/`1740000006` were already in `_migrations`; existing volume kept stale users rules and missing role/status fields | add later repair migrations `1740000007`/`1740000008`; fix field existence checks; recreate PB so `serve` applies them | V134 |
| B24 | 2026-06-23 | dev seed demo projects used `Provincial-wide`, not canonical `locations`, so admin/public city filters could not match them | replace with canonical Cagayan locations; `seed:dev` repairs existing `Demo:` rows on rerun | V136 |
| B25 | 2026-06-23 | PB audit hook lived in `audit.js` and serialized handlers closed over `hooksDir`; PocketBase only loads `*.pb.js`, then handler runtime threw `ReferenceError` | add `audit.pb.js` entrypoint; require audit module inside handlers via `globalThis.__hooks`; verify app-admin mutation writes actor-aware audit row | V137,V124–V128 |
| B26 | 2026-06-23 | `bun run test` failed before tests because workspace package dev deps were not linked (`packages/pocketbase/node_modules/vitest/vitest.mjs` missing) | run `bun install --frozen-lockfile`; rerun `bun run test` → all package tests pass | V138 |
