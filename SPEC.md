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
- Tables: follow shadcn Radix Data Table guide (`@tanstack/react-table` + `@workspace/ui` Table primitives); ⊥ ad hoc data-grid/table vocab.
- Forms: follow shadcn Radix Field guide (`FieldSet`/`FieldGroup`/`Field`/`FieldLabel`/`FieldDescription`/`FieldError`); ⊥ one-off label/help/error wrappers.
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
| status | Planning, Procurement, Ongoing, Ready for Review, For Revision, Completed, Rejected |
| category | Infrastructure, Education, Health, Agriculture, Social Services, Scholarship |
| lgu_level | Municipality, Barangay, District, SK |
| fund_source | General Fund, Special Education Fund, Special Health Fund, Trust Fund, Others |
| deadline_status | Lapsed, Completed, On Track, Near Deadline |
| role | Super Admin, Province, Municipality, Barangay |
| account_status | Active, Inactive |
| audit_action | create, update, delete, deactivate, approve, reject, request_revision, reset_password |

**Cagayan location options**

Tuguegarao City; Abulug; Alcala; Allacapan; Amulung; Aparri; Baggao; Ballesteros; Buguey; Calayan; Camalaniugan; Claveria; Enrile; Gattaran; Gonzaga; Iguig; Lal-lo; Lasam; Pamplona; Peñablanca; Piat; Rizal; Sanchez-Mira; Santa Ana; Santa Praxedes; Santa Teresita; Santo Niño; Solana; Tuao.

Canonical tree stored in `src/seed/cagayan-locations.ts`: 29 municipalities + 820 barangays from `cagayan_municipalities_barangays.sql`. PB `locations` stores active municipality rows plus `Municipality / Barangay` rows by name+hierarchy slug.

**Access**

- RBAC roles: Super Admin, Province, Municipality, Barangay.
- Role value `Province` is user-facing **Provincial Admin** in approval/review copy; persisted enum remains `Province`.
- RBAC is client-critical (Atty. Charo): ~820 barangays require fail-closed, indexed municipality/barangay scoping; UI filters ⊥ widen backend scope.
- PBAC: code role→policy map + PB rule enforcement by action/resource, evaluated after auth and before UI/API mutate.
- First Super Admin: promote existing PB auth user/admin manually.
- Super Admin: user account CRUD, role/status management, admin-assisted temp password reset (offline delivery), system settings.
- Password recovery ⊥ SMTP/SMS/email link/OTP/self-service forgot-password; Super Admin sets temp password in-app, delivers out-of-band (in-person/phone); user forced password change on next login (V208–V212).
- Province / Provincial Admin: view all projects; approve/reject/request revision; process fund releases; ⊥ manage users/settings.
- Municipality: view all projects in assigned municipality; update scoped project progress/photos/docs; ⊥ project edit/status/delete; ⊥ outside municipality.
- Barangay: view own barangay projects; update scoped project progress/photos/liquidation docs; ⊥ project edit/status/delete; ⊥ approve; ⊥ outside barangay.
- Auth users carry one role + account_status + scope fields (`municipality?`, `barangay?`; required by scoped role) for PBAC scoping.
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
| ui std | shadcn Radix Data Table guide: `https://ui.shadcn.com/docs/components/radix/data-table` |
| ui std | shadcn Radix Field guide: `https://ui.shadcn.com/docs/components/radix/field` |
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
| seed | `packages/pocketbase/scripts/seed-dev.ts`, `src/seed/dev-fixtures.ts`, `src/seed/cagayan-locations.ts`; `bun run seed:dev` |
| deploy | `.github/workflows/deploy.yml` — GHCR build/push, direct EC2 `rsync`/`scp`, backup/smoke/rollback |

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
| `user-management-module.tsx` | Super Admin user CRUD, roles, status, admin-assisted temp password reset |
| `change-password-form.tsx` | forced password change when `users.must_change_password=true` |
| `password-requirements.tsx` | shared `FieldDescription` for password min-length policy (V213) |
| route `/change-password` | admin forced password change before module access |
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
projects → id, name, description, category, status, municipality, barangay, location, lgu_level, contractor,
  start_date, target_end_date, budget_year, total_budget,
  moa_file, resolution_file, supporting_docs[],
  progress_pct, number_of_students?, approval_status?, approved_at?, approved_by?, rejection_reason?

budget_allocations → project, amount, year, description, date, allocated_by,
  moa_file?, resolution_file?, supporting_docs[]

budget_expenses → project, amount, year, main_account, sub_account?, date, receipt_number, description

budget_funding_years → name, active, sort_order
budget_fund_main_accounts → name, active, sort_order
budget_fund_sub_accounts → main_account, name, active, sort_order
project_status_options / project_category_options / user_role_options / user_account_status_options → name, active, sort_order

progress_updates → project, from_pct, to_pct, notes, site_photo, updated_by, updated_at
  certification_completion, certificate_acceptance, proof_payment_barangay,
  acknowledgment_completion, audit_documents[], verification_documents[], liquidation_documents[]

approval_actions → project, action(approve|reject|request_revision), authority_name, reason?, created_at

locations → name, slug, level(Municipality|Barangay), municipality_name?,
  municipality_slug?, barangay_name?, active, sort_order?, created_by?, updated_by?

activity_logs → actor_user, actor_role, actor_municipality?, actor_barangay?, action, resource, resource_id?, policy_key?,
  target_user?, before?, after?, outcome, error?, duration_ms, request_id, env, created_at

users auth fields → role(Super Admin|Province|Municipality|Barangay), account_status,
  municipality?, barangay? (required for scoped Municipality/Barangay roles), must_change_password(bool default false), name?, email

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
| J6 | Super Admin `/users` create/edit/deactivate/delete/admin-assisted temp password reset | admin |
| J17 | user `must_change_password=true` → login → `/change-password` → dashboard | admin |
| J7 | Province/Municipality/Barangay direct `/users` → deny/redirect; nav link hidden | admin |
| J8 | public `/projects` location filter combines w/ status/category | public |
| J9 | Projects module content stays visible at 100% zoom under nav/header | admin |
| J10 | mutate/approve/report actions append structured `activity_logs` row | admin |
| J11 | admin Budget/Progress/Approvals/Reports municipality+barangay filters combine w/ module filters | admin |
| J12 | dashboard date/location filters update all KPI/widget data | admin |
| J13 | role-scoped users cannot view/mutate outside assigned barangay/municipality | admin |
| J14 | admin Projects import template + multi-file Excel upload partially imports valid rows and reports row/file errors | admin |
| J15 | Super Admin creates user → new account appears in `/users` list without reload | admin |
| J16 | Province requests revision on ready project → Barangay can update progress/details → resubmits to review queue | admin |

**UI surfaces** (per module — detail in §V)

- **App shell** (admin): icon sidebar + breadcrumb top bar + theme icon toggle + Sign out; ⊥ global search v1; page header band + optional Live pill; mobile drawer.
- **Dashboard** (`/dashboard`): page header + alert if approval queue; visible filters — date/date range From/To, municipality, barangay; KPI cards w/ value + trend + footer line + drill chevron; 2×2 widgets — budget split, progress buckets, deadline heatmap (real project data), quick links; all dashboard metrics/widgets obey filters.

**Projects** (`/projects`) — admin (V72–V74,V50,V172–V176,V187)

- List: project cards — name, municipality/barangay, location, description, category, date range (start→target_end), budget_year, total_budget (₱), progress bar, status badge.
- Filters: status, category, municipality, barangay, date range — visible **From:** / **To:** labels (V101); search bar by name; free-form `location` ⊥ filter.
- Actions: New project; Import (multi-file Excel); per-card Edit + Delete; ⋮ Change status via portal popover (V50); ⊥ inline row expand v1.
- Create/Edit modal fields: name, description (textarea), category, status, municipality, barangay, location (free text), contractor, start_date, target_end_date, budget_year (required), total_budget (PHP); doc uploads — MOA, Resolution, Supporting Project Documents — `DocumentUploadField` drag-drop UI (V102): all upload fields multi (≤10).

**Budget** (`/budget`) — admin (V9,V10,V75–V80,V150,V152,V155–V157,V178,V179,V188–V190)

- Summary: 4 cards — Total Budget (₱ + project count), Allocated (₱ + progress bar), Amount released (₱ + progress bar), Remaining (₱).
- Breakdown list: per project — name, location, total_budget, allocated, amount released, remaining, spend-% progress bar.
- Transactions tabs: Allocations | Released Amount; filter dropdowns — project, year, municipality, barangay, date range From/To; barangay options scoped by municipality; free-form `location` ⊥ filter; visible tab/section copy ⊥ "Expenses".
- Allocations tab: cols project, amount (green/+), year, description, date, allocated_by display name; `+ Allocate` → modal (project, amount, year default current, description, Required documents section w/ labeled V102 uploads).
- Released Amount tab: cols project, amount (red/−), year, main_account, sub_account, date, receipt_number, description; `+ Released Amount` → modal (project, amount, receipt_number, Fund Source section label only, Year dropdown, Main account dropdown, conditional child control per V157/V178/V190, expense date, description).

**Progress** (`/progress`) — admin (V6,V7,V8,V81–V84,V150,V155,V199)

- Summary: 4 cards — Active Projects, On Track (≥50%), Needs Attention (<25%), Updates Today.
- Filters: status, category, municipality, barangay, date range From/To; barangay options scoped by municipality; free-form `location` + `lgu_level` ⊥ filter.
- List per project: name, status badge, location, lgu_level, progress bar + %, start_date, target_end_date, contractor, last_updated; recent 3 updates inline (e.g. 80%→90%, notes, date) + "View all N updates"; View Details + Update Progress when actor may update scoped progress (Municipality own municipality or Barangay own barangay for Planning/Procurement/Ongoing/For Revision; admin where policy allows); Completed/Approved/Rejected read-only.
- Detail panel (side): name, location, category, lgu_level, timeline, status, overall progress bar; chronological history — from%→to%, datetime, notes, site_photo?, updated_by display name; latest revision note shown when status For Revision; Update Progress CTA bottom when actor may update per V199.
- Update Progress modal: project name + current %; slider 0–100% w/ markers 0/25/50/75/100; site_photo required (JPG,PNG,WebP) via V102 multi-file upload; notes textarea; if target progress = 100%, completion docs V110 required before Save; Save + Cancel. Saving a project at 100% with required docs sets status Ready for Review for Province review.

**Approvals** (`/approvals`) — admin only (V3,V4,V5,V13,V85–V87,V150,V155,V158,V159,V199)

- Summary: 4 cards — Pending Approval, For Revision, Approved, Rejected.
- Filters: status/tab, category, municipality, barangay, date range From/To; barangay options scoped by municipality; free-form `location` + `lgu_level` ⊥ filter.
- Tabs: Completion Approval | For Revision | Approved | Rejected.
- Queue card: name, location, status badge, category, lgu_level, total_budget, progress bar + %, budget utilization bar (spent/saved), progress update count, latest site photo(s) carousel; Province sees View Details, Approve (green), Reject (red), Request Revision; Barangay sees status only.
- Detail panel (side): V93 — full project + budget summary + progress history + completion docs; warning/block V13; Province-only Approve + Reject + Request Revision CTAs bottom for Ready for Review entries; For Revision entries are read-only in approvals and show latest revision note.
- Approve modal: confirmation copy; approving authority name (required); Cancel + Confirm Approval.
- Reject modal: explanation copy; reviewing authority name; reason (required textarea); Cancel + Confirm Rejection.
- Request Revision modal: reviewing authority name; required revision notes; Cancel + Confirm Request. Confirm writes `approval_actions.action=request_revision` + reason and moves project status Ready for Review → For Revision.

**Reports** (`/reports`) — admin only (V11,V12,V88–V91,V150)

- Header: title Reports; subtitle "Generate and export reports as Excel files"; `Export All Sheets` + `Export Current Tab` (V12).
- Global filters (all tabs): status (incl. All Status), category (incl. All Categories), municipality (All Municipality), barangay (All Barangay), date range from/to (V94,V150); free-form `location` + `lgu_level` ⊥ filter.
- Summary cards (clickable tab selectors): Projects count, Budget total (₱), Progress update count, Approvals count (V95).
- Tabs + preview tables w/ record-count badge:
  - **Projects**: name, category, status, deadline_status (V11), lgu_level, location, total_budget, progress.
  - **Budget**: name, category, lgu_level, total_budget, allocated, spent, remaining, util %; total row bottom.
  - **Progress**: name, category, lgu_level, from %, to %, change (+N%), site photo thumbnail (V96), updated_at, updated_by — 1 row per update.
  - **Approvals**: name, category, lgu_level, status, total_budget, spent, savings (green), approved_at, approved_by; pending → "Pending" in approved cols.

- **User Management** (`/users`) — Super Admin only (V115–V121)
  - List: all registered users — name, email, role, account_status, created/updated, last_login?.
  - Actions: Create account; Edit name/email/role/status/scope; Deactivate; Delete (soft default; hard confirm); Reset password → confirm dialog → auto-gen temp password (manual override optional) → PB update + one-time reveal modal w/ copy; deliver temp password offline; created account appears in list immediately after PB create succeeds (V191,J15,V208–V211).
  - Reset password flow: Super Admin clicks Reset password → confirm → system generates cryptographically secure temp password (≥12 chars) or accepts manual entry → `users.update(id,{password,passwordConfirm,must_change_password:true})` → one-time modal shows temp password + Copy; modal copy warns offline delivery only; temp password never re-fetchable; ⊥ `requestPasswordReset`/`confirmPasswordReset`.
  - Forced change: user w/ `must_change_password=true` logs in → redirect `/change-password` (AuthGuard blocks other routes); form fields current/temp password, new password, confirm; submit `users.update` w/ `oldPassword` + new password + `must_change_password:false`; success → intended route or `/dashboard` (V210,J17).
  - Create/Edit account dialog fields: name, email, password (create only), role, account_status, municipality for Municipality/Barangay roles, barangay for Barangay role; scope fields load active PB `locations` and clear invalid child values on role/municipality change (V195).
  - Province role policies: can approve/reject/request revision + process fund releases; ⊥ manage users; ⊥ system settings.
  - UI: Super Admin sees Users nav + role badge; Province/Municipality/Barangay hide Users nav and unavailable actions.

- **Activity Logs** — admin audit surfaces (V124–V128)
  - Budget: allocation/expense rows record who logged action.
  - Approvals: approve/reject record actor + authority fields.
  - Reports: project/budget/progress/approval create/update/delete actions visible/exportable by Super Admin only.

- **Public shell**: logo left; header right — theme toggle + Admin CTA (links admin login); ⊥ pill nav / module links (V100); landing full-bleed bands; footer Sections → `/projects`.
- **Public landing** (`/`): centered hero + eyebrow badge + Admin CTA + admin portal preview frame (sidebar + projects list silhouette, live names when loaded) + subtle lavender radial; carousel recent N dup auto-scroll pause hover; enriched cards; accountability; ⊥ explore divide-y list (V31).
- **Public /projects**: read-only projects list (V72,V73,V123); municipality + barangay filters; free-form `location` ⊥ filter; ⊥ Edit/Delete/New (V2,J3,J8).
- **Public module pages**: skeleton loading (V24); dashed empty + hint (V25); dark/light tokens (V60,V61); PB realtime + Live pill (V62–V67).

## §V

V1: ∀ unauthenticated admin route (≠ `/login`) → redirect login.
V2: Public frontend ⊥ mutate API calls (create/update/delete).
V3: Approvals routes & nav ⊥ exist on public frontend.
V4: Project status Ready for Review → eligible for approval queue; For Revision/Completed/Rejected ⊥ pending approval queue.
V5: Approve action requires `authority_name`; reject requires `reason` + `authority_name`.
V6: Progress update requires `site_photo` upload.
V7: Progress summary Needs Attention = projects w/ progress_pct < 25%.
V8: Progress summary On Track = projects w/ progress_pct ≥ 50%.
V9: Budget summary cards aggregate ∀ projects (total, allocated, amount released, remaining).
V10: Expense amounts display negative/red; allocation amounts positive/green.
V11: Reports deadline_status: Lapsed=red, Completed=green, On Track=blue, Near Deadline=orange.
V12: Excel export ⊥ available on public frontend.
V13: 100% progress update w/o completion docs → block save/forward/approval; approval detail/card show missing docs list.
V14: PB rules are scoped PBAC: public read only for public project/location data; users + activity_logs Super Admin-only; approvals/progress/budget writes require role+scope policy.
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
V72: Project list cards show name, municipality/barangay context, free-form location when present, description, category, date range (start_date→target_end_date), budget_year, total_budget, progress bar, status badge.
V73: Project list filters: status, category, municipality, barangay, date range (from/to); search bar matches name (case-insensitive substring); free-form `projects.location` ⊥ filter.
V74: Admin project card actions: Edit + Delete + status change only for project-mutation roles; Municipality/Barangay scoped users see no project edit/status/delete affordances; public ⊥ create/edit/delete affordances (V2,J3).
V75: Budget summary = 4 cards: total budget (₱ + project count), allocated (₱ + progress bar), amount released (₱ + progress bar), remaining (₱); aggregates ∀ projects (V9).
V76: Budget breakdown row: project name, location, total_budget, allocated, amount released, remaining, spend-% progress bar.
V77: Budget Allocations & Released Amount tabs — filterable by project dropdown, year dropdown, municipality dropdown, barangay dropdown, date range From/To.
V78: Allocations table cols: project, amount (green positive V10), year, description, date, allocated_by.
V79: Released Amount table cols: project, amount (red negative V10), Year, Main Account, Sub Account, date, receipt_number, description; Sub Account blank when none; ⊥ Category/Fund Source/Fund Type cols.
V80: Allocate modal: project, amount, year (default current), description, 3 doc uploads (MOA, Resolution, supporting); Released Amount modal: project, amount, receipt_number, Fund Source section label only, Year dropdown, Main account dropdown (`General Fund`, `Special Education Fund`, `Special Health Fund`, `Trust Fund`, `Others`), conditional child control per V157/V178/V190, expense date, description; ⊥ "Record Expense" label.
V81: Progress summary = 4 cards: active projects (status ∈ Planning|Procurement|Ongoing|For Revision), on track (V8), needs attention (V7), updates today (progress_updates dated today).
V82: Progress list row: status badge, location, lgu_level, progress %, dates, contractor, last_updated; inline preview last 3 updates + "View all N updates" link.
V83: Progress detail panel: full project context + chronological update history; admin Update Progress CTA at bottom.
V84: Progress update modal: slider 0–100% w/ markers 0/25/50/75/100; site_photo required (V6); notes textarea.
V85: Approvals summary = 4 cards: pending approval count, for revision count, approved count, rejected count.
V86: Approvals tabs: Completion Approval | For Revision | Approved | Rejected.
V87: Approval queue card: budget utilization bar (spent + saved), progress update count, site photo carousel (V96) when photos on file.
V88: Reports header subtitle "Generate and export reports as Excel files"; admin Export All Sheets + Export Current Tab; public ⊥ export (V12).
V89: Reports global filters — status, category, municipality, barangay, date range from/to w/ All sentinel options (V94,V150) — apply ∀ tab previews.
V90: Reports summary cards clickable → activate matching tab (Projects, Budget, Progress, Approvals counts per V95).
V91: Reports tab table cols: Projects (V11 deadline_status), Budget (+ total row), Progress (per-update row w/ from/to/change/photo thumbnail V96), Approvals (pending → "Pending" in approved_at/approved_by).
V92: Wireframe ASCII = layout shell only; module UI surfaces + V72–V91 override abbreviated wireframe cols/rows; dashboard heatmap ⊥ replace reports tab-selector model (V90).
V93: Approvals detail panel: name, location, category, lgu_level, status, contractor, timeline, description; budget summary total/spent(red)/savings(green); progress history w/ transitions, notes, photos, updated_by; V13 warning + Province-only Approve/Reject/Request Revision CTAs for Ready for Review entries only (V4,V109,V158); For Revision shows latest revision note and no Province action CTAs until Barangay resubmits.
V94: Reports filter dropdowns include All Status / All Categories / All LGU sentinel options + date range from/to (V89).
V95: Reports Approvals summary card = count completed+approved projects (status Approved ∨ approval approved).
V96: `progress_updates.site_photo` → render `<img>` via PB file URL (`recordFileUrl`) in admin progress history (V83), admin approval queue carousel (V87) + detail photos (V93), admin reports Progress tab photo col; ⊥ text-only "attached" / Yes-No badge only.
V97: ∀ user-facing date/datetime → `formatDisplayDate` / `formatDisplayDateTime` (`MMM D, YYYY`; timestamps + time); ⊥ raw ISO / `YYYY-MM-DD` strings in UI tables, cards, history.
V98: Admin + public responsive ∀ breakpoints — sidebar collapses mobile (admin); tables `overflow-x-auto`; tab bars horizontal scroll; filter grids `grid-cols-1` → `sm+`; touch targets ≥44px; hero `text-balance` + stepped heading scale; modals `w-[calc(100vw-2rem)]` mobile.
V99: Public frontend routes = `/` landing + `/projects` only; ⊥ `/budget`, `/progress`, `/reports` route files + header nav links (admin modules unchanged); footer `/projects` link OK.
V100: Public header ⊥ module nav links — logo left + theme toggle + Admin CTA right only; `/projects` via landing CTA, footer, or direct URL.
V101: Date range filters show visible **From:** / **To:** labels above date inputs on admin `/projects` (V73), admin `/reports` (V89), public `/projects` (V55); aria-label retained.
V102: Doc upload fields (`DocumentUploadField`) — drag-drop zone (`aria-labelledby` label) + file list w/ per-file remove by stable identity (`name:size:lastModified`); all app file uploads multi (≤10, limit message when truncated), including MOA, Resolution, supporting_docs, progress site_photo, and completion docs; `existingNames` shows server filenames on edit; MIME per §C.
V103: Budget allocate modal — Required documents section w/ visible labels: Memorandum of Agreement, Resolution, Supporting project documents (V80,V102).
V104: Upload modal file picks cleared on dialog close — admin project CRUD modal + budget allocate modal (`clearUploadFiles` / `clearAllocationUploads` on `onOpenChange(false)`).
V105: `DocumentUploadField` file rows keyed by `fileIdentity`; remove one of duplicate filenames must not drop siblings.
V106: Budget allocation/expense table amount cells show exactly one signed, comma-formatted value: `+100,000` / `-100,000`; ⊥ duplicate PHP currency suffix in those cells.
V107: `progress_updates.from_pct=0` valid; PB migration keeps `from_pct` non-required so zero-default start projects can create first update (V6,V84).
V108: Approval completion writes free-text authority only to `approval_actions.authority_name`; `projects.approved_by` relation ⊥ receive authority_name string.
V109: For Revision/Completed/Rejected approval tab entries are read-only in Approvals: card + detail show View details only; ⊥ Approve/Reject/Request Revision buttons. For Revision entries show latest request_revision reason; Rejected entries show `rejection_reason` on card + detail.
V110: Required completion docs for target progress 100%: Certification of Completion, Certificate of Acceptance, Proof of Payment from Barangay, Acknowledgment of Completion, Audit Documents, Verification Documents, Liquidation Documents; all must be uploaded before progress save or approval action.
V111: Pending approval review surfaces display uploaded completion docs from the latest 100% progress update with file links/names; missing docs list remains visible until complete.
V112: Scholarship project category requires `number_of_students` numeric input >0 in project create/edit; non-Scholarship omits/clears it.
V113: PB optional number fields return `0` when unset — record schemas coerce `0|""|null`→`undefined` before positive/int parse; valid rows must not be dropped by `parseRecordList`.
V114: PB additive migrations guard existing fields before `fields.add`; fresh DB initial snapshot + later migration must not duplicate fields.
V115: Auth user has exactly one §C role + account_status + required scope fields for Barangay/Municipality roles; Inactive → login/session denied; first Super Admin = promoted existing PB auth user/admin.
V116: Super Admin role → access `/users` route/nav + account create/edit/deactivate/delete/admin-assisted temp password reset.
V117: Province/Municipality/Barangay roles → `/users` route denied/redirected; Users nav hidden; user-management mutate APIs rejected.
V118: PBAC policy check `(actor, action, resource)` uses code role→policy map + PB rules before admin mutate; deny → no PB write + user-visible forbidden state.
V119: Province policy grants system-wide project read, approval actions, and fund release processing only; ⊥ manage users/system settings.
V120: Role change/status/delete/reset password actions require Super Admin + audit row; delete defaults soft deactivate, hard delete requires explicit confirm.
V121: UI shows current user role badge and hides unavailable actions; server/PB rules still enforce (⊥ UI-only auth).
V122: Admin nav/header uses non-obscuring layout: content offset/sticky safe at 100% zoom; Projects text/actions not covered.
V123: Public `/projects` filter options load active PB `locations`; municipality dropdown lists active municipality names; barangay dropdown lists active barangays for selected municipality; filters match `projects.municipality` + `projects.barangay`; combines w/ status/category/date/search filters; free-form `projects.location` ⊥ filter.
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
V135: Admin frontend project surfaces include municipality/barangay + free-form location end-to-end: `/projects` cards show both when present; filters use municipality/barangay only; create/edit modal has municipality/barangay comboboxes plus `location` text input; budget/progress/approval/report project references display location context when space allows.
V136: Dev seed demo project `location` values ∈ canonical PB `locations`; `seed:dev` repairs existing `Demo:` rows with non-canonical locations on rerun.
V137: PocketBase JS hook entrypoints use `pb_hooks/*.pb.js`; serialized handlers ⊥ close over outer variables, use `globalThis.__hooks`/`require()` inside handler bodies per @PocketBase docs.
V138: Local verification runs from lockfile-restored workspace deps: if `turbo test` cannot resolve package-local dev tools (`vitest`, `eslint`, `tsc`), run `bun install --frozen-lockfile` before treating it as app failure.
V139: Cagayan `locations` seed source = SQL municipality→barangay hierarchy: exactly 29 municipalities + 820 barangays; PB rows include hierarchy fields and unique slugs (`municipality-slug` or `municipality-slug/barangay-slug`).
V140: Admin project create/edit location UI = separate `Municipality` + `Barangay` popover comboboxes w/ search inputs plus `Location` text input; barangay choices derive from selected municipality; save writes `projects.municipality`, `projects.barangay`, `projects.location`; project dialog/cards/filter ⊥ expose `lgu_level`.
V141: Admin chrome/top navbar has dialog-open blur state: when modal locks body scroll, `[data-admin-chrome]` blurs/dims behind overlay.
V142: Dialog overlay/content z-index > sticky admin chrome: dialog uses `--z-modal-backdrop`/`--z-modal`, never raw `z-50`; navbar cannot overlap modal close/title area.
V143: Admin project location comboboxes tolerate partial/legacy PB location rows: optional `locations.level=""` parses; municipality choices may derive from barangay rows; selected municipality always unlocks matching barangay options.
V144: Dev seed includes role simulation users for Province, Municipality, Barangay, and inactive account; seed upserts by email, sets role/status/scope/password, and password is env-overridable via `SEED_SAMPLE_USER_PASSWORD`.
V145: Dev seed demo activity runs through sample users: privileged sample auth creates demo project interactions; allocation/progress/approval rows are attributed to that sample user when relation fields exist.
V146: Portal dropdown overlays (`Select`, `Popover`, `DropdownMenu`, `Combobox`) use shared `--z-overlay` token > `--z-modal`; raw `z-50` ⊥ in those primitives so dialog-contained selects/popovers render above dialog content.
V147: Admin New/Edit Project municipality/barangay command lists are scrollable: list max-height respects popover/dialog available height at common zoom levels, uses `overflow-y-auto` + `overscroll-contain`; long Cagayan barangay lists never trap page/modal scroll.
V148: Public `/projects` mirrors admin project location surface: no `lgu_level` filter/card display; filters are 2 dropdowns (`Municipality`, `Barangay`) from active location hierarchy; cards show municipality/barangay + free-form location + category.
V149: Admin UI relation fields rendered to humans (`allocated_by`, `updated_by`, `approved_by`, audit actor/target where shown) resolve user id → user `name` then `email`; fallback id/placeholder only when user row unavailable.
V150: Admin Budget/Progress/Approvals/Reports filters use project municipality+barangay hierarchy, not generic `location`/`lgu_level`: dropdowns load active PB `locations`; barangay disabled/All until municipality selected; selected barangay resets when municipality changes; filters combine w/ module status/category/project/year/date/search filters and apply to all visible summaries/tables/cards/exports.
V151: Admin Budget/Progress/Approvals/Reports location filter UI uses visible labels `Municipality` + `Barangay`; copy must not say generic `Locations` for these controls.
V152: Allocate Budget dialog is viewport/zoom responsive: content uses fluid width + `max-height: calc(100dvh - safe margin)` + internal `overflow-y-auto`; fields/docs/actions reflow on narrow/zoomed viewports; submit/cancel remain reachable without browser-level horizontal scroll.
V153: Admin ∀ `DialogContent` uses viewport-safe width + max-height + internal `overflow-y-auto`; actions remain reachable at browser zoom / narrow viewports; page-level horizontal scroll ⊥. Small dialogs may keep narrower `sm:max-w-*` but still use mobile `w-[calc(100vw-2rem)]`.
V154: Admin dashboard filters (date/date range, municipality, barangay) independently combine; default none → all data; filter changes update Active Projects (status ∈ Planning|Procurement|Ongoing), Total Budget, On Track count/%, Awaiting Approval, Budget Utilization, Deadline Heatmap without full page reload.
V155: Admin Budget/Progress/Approvals date range filter is visible at top of module via shared picker UX; default none → all records; selected range filters all visible records/summaries in that module without full page reload.
V156: Budget module copy uses "Released Amount" everywhere expense-entry action/tab/section appears; visible "Expenses" copy ⊥ in Budget UI/tests.
V157: Budget Released Amount form replaces Materials/category control with Fund Source section: Year dropdown from `budget_funding_years`; Main account dropdown from `budget_fund_main_accounts`; Sub account control conditional — General Fund/Trust Fund → dropdown; Special Education Fund/Special Health Fund → no field; Others → free-text field with label/copy ≠ "Sub Account"; hidden children store blank.
V158: Approval actions (Approve, Reject, Request Revision) available only to Province/Provincial Admin role; Barangay/Municipality users see status/read-only detail only; backend rejects non-Province approval mutations.
V159: Barangay submissions (progress/photos, liquidation docs) route Barangay → Province review before approval or succeeding fund release; Barangay self-approval/bypass impossible in UI and PBAC.
V160: RBAC data scope: Barangay sees own barangay projects and updates scoped progress/docs only; Municipality sees all projects in own municipality and updates scoped progress/docs only; Province sees all projects and manages approvals/fund releases/project mutations; Super Admin manages users/permissions/config; backend enforces every scope.
V161: Structured audit wide events include actor_role + actor scope (`municipality?`, `barangay?`) for denied/approved approval and fund-release actions; ⊥ unstructured console logs.
V162: Admin date/date-range filters use shadcn/Radix Date Picker composition (`Popover` trigger + `Calendar`; range mode for date ranges) plus date input fields inside picker content; standalone always-visible native date inputs ⊥.
V163: PB select field values match manifest enums after migrations: `approval_actions.action` includes `request_revision`; `activity_logs.actor_role` = §C roles; `activity_logs.action` includes §C `audit_action`.
V164: Dev seed scoped users persist `municipality`/`barangay` when fixture defines them; scoped Barangay/Municipality users never seed blank scope.
V165: §T `x` rows citing `J<N>` require matching `apps/admin-frontend/tests/journeys/j<N>-*.test.tsx`; otherwise cite component/source tests only or status `.`.
V166: `@workspace/ui` Calendar uses only `react-day-picker` v10 `classNames` slots; stale v8/v9 slots like `table` ⊥.
V167: Approval UI fail-closed: absent/unknown/non-Province actor sees status/read-only detail only; Approve/Reject/Request Revision buttons ⊥.
V168: Role assignment required before active login: each auth user has exactly one role; Barangay requires municipality+barangay scope; Municipality requires municipality scope; Province/Super Admin scopes optional and ignored for access.
V169: RBAC matrix exact: Barangay read own barangay projects + update scoped progress/docs only; Municipality read all own municipality projects + update scoped progress/docs only; Province read all + project mutation + approve/reject/request_revision + fund releases only; Super Admin user/permission/config only unless separately granted by policy.
V170: RBAC enforcement is backend-first: every non-public list/view/mutate path applies actor role/status/scope in PB rules or shared PBAC before data leaves server; UI nav/buttons/pages mirror policy but are never sole enforcement.
V171: RBAC tests use TDD red→green and cover both UI restrictions + backend denials, including a fixture with many barangays so municipality/barangay scoping cannot degrade into client-side post-filter only.
V172: Admin Projects shows `Import` action beside `New project`; opens Excel import UI; accepts one or more `.xlsx`/`.xls` files only; public frontend ⊥ import/export affordance.
V173: Project import template downloads Excel with exact headers: `Project Name`, `Description`, `Location`, `Contractor`, `Total Budget`; dropdown/date/file fields ⊥ template.
V174: Project import parses rows by exact headers and maps only text-phase fields: `name`, `description`, `location`, `contractor`, `total_budget`; storage-only defaults may fill required out-of-scope fields (`category=Infrastructure`, `status=Planning`, `budget_year=current year`, `progress_pct=0`).
V175: Project import validates each row independently: missing `Project Name` or invalid/missing numeric `Total Budget` rejects that row with 1-based Excel row number + reason; other valid rows still create records.
V176: Project import completion shows summary `N of M projects imported successfully` plus failed file+row list; creates use `projectMutateSchema` + existing PBAC create policy before PB write.
V177: ∀ dropdown option sets → PocketBase-backed source: relation/lookup rows (`projects`, `locations`, `users`) or option rows (`budget_fund_*`, `project_*_options`, `user_*_options`); local manifest arrays are fallback only when PB option collections are unavailable/empty.
V178: Budget sub account exact tree: General Fund → `GF - Proper`, `20% DF`, `Hospital Serv.`, `Econ. Enterp.`, `Bayanihan Fund`, `SA - Excise Tax`; Special Education Fund → ∅; Special Health Fund → ∅; Trust Fund → `Trust Fund - Proper`, `LDRRMF - SA`; Others → free text; copy/case must match client values.
V179: Budget fund source data model stores selected main account separately from selected sub account; records/list/search/export render both columns, never recombine into legacy category/material/fund_type text.
V180: ∀ tabular data UI (admin/public, reports, budget tx, users, imports, future tables) follows shadcn Radix Data Table guide: `@tanstack/react-table` column defs + state, `@workspace/ui` Table primitives, accessible headers/actions, responsive `overflow-x-auto`; ⊥ hand-rolled data-grid/table markup.
V181: ∀ form UI follows shadcn Radix Field guide: controls grouped via `FieldSet`/`FieldGroup`/`Field`; labels via `FieldLabel htmlFor`; helper/error via `FieldDescription`/`FieldError`; invalid state sets `data-invalid` + `aria-invalid`; zod errors render as field-level errors.
V182: Table/form refactors obey TDD: failing-first Vitest/RTL covers user behavior (sort/filter/page/actions where present; submit/validation/errors for forms) with role/label/`data-testid` selectors; ⊥ CSS/nth-child selectors.
V183: Workspace packages consumed by Next `transpilePackages` expose raw TS safely: internal source imports are extensionless or package-export imports; emitted-only relative `.js` specifiers in `.ts` source ⊥ because Turbopack resolves real files during Docker/Next builds.
V184: Production deploy workflow builds/pushes service images to lowercase GHCR paths and deploys to EC2 by direct `rsync`/`scp` + remote pull; GitHub artifact upload/download actions ⊥.
V185: Production deploy supports no-domain EC2-IP bootstrap: missing `DOMAIN` renders `DOMAIN=:80`; Caddy serves via `{$DOMAIN::80}`; pre-deploy backup runs before new `.env` upload so it authenticates against current running PocketBase env.
V186: Pre-deploy PocketBase backup auth uses the running `pocketbase` container env (`docker inspect .Config.Env`) before API login; stale remote `.env` values must not block backup after a failed prior deploy.
V187: Project import input supports multi-select file picker + drag/drop for ≥1 Excel files; parser processes files independently, aggregates valid rows across all files, and reports errors with filename + 1-based Excel row.
V188: Budget tab beside Allocations labelled `Released Amount`; visible `Expenses` copy ⊥ in tab labels/headings/buttons/tests, while `budget_expenses` storage name may remain internal.
V189: Budget Fund Source main-account dropdown values exactly: `General Fund`, `Special Education Fund`, `Special Health Fund`, `Trust Fund`, `Others`.
V190: Budget sub-account UI: only General Fund/Trust Fund display labelled `Sub Account` dropdown; Special Education Fund/Special Health Fund display no child control; Others displays unlabeled-by-Sub-Account free-text purpose/other field.
V191: `/users` create-account success inserts/refetches created user into visible list before toast/close completes; PB success with stale UI list ⊥.
V192: Budget Others validation/error copy says purpose/other-purpose; visible/form error copy ⊥ says `Sub Account` for Others.
V193: Dev seed budget expenses use canonical Budget fund values (V178,V189,V190): General Fund/Trust Fund rows include valid canonical `sub_account`; Special Education Fund/Special Health Fund rows store blank `sub_account`; Others rows store free-text purpose; legacy `Other` + `GT - Proper` ⊥ in fixtures/seed writes.
V194: Approval/RBAC UI copy may show `Provincial Admin`, but auth/schema/policy value stays `Province`; copy/tests must not imply Municipality/Barangay can approve/reject/request revision.
V195: User create/edit dialog persists RBAC scope fields: Municipality role requires `municipality`; Barangay role requires `municipality` + `barangay`; Province/Super Admin submit blank scope; UI hides irrelevant scope fields and backend rejects missing required scope.
V196: Budget allocation create writes current auth user id to `budget_allocations.allocated_by` for JSON and FormData/doc-upload paths; Allocations table resolves it via V149 and must not show blank for new attributed rows.
V197: Applied PB schema for `budget_expenses` contains only current Released Amount fields (`project`, `amount`, `year`, `main_account`, `sub_account`, `date`, `receipt_number`, `description`); legacy `category`, `fund_source`, `funding_years`, `fund_type`, `fund_type_other` fields are absent or non-required before create.
V198: Project import `Location` header maps only to free-text `projects.location`; import/edit never derives `municipality` or `barangay` from that value. Structured municipality/barangay fields display only persisted `projects.municipality`/`projects.barangay`.
V199: Completion review transition: Municipality/Barangay 100% scoped progress save with V110 docs sets status Ready for Review; Province action on Ready for Review project writes `approval_actions.action=request_revision` with required reason and sets `projects.status="For Revision"` or approve sets `projects.status="Completed"`; scoped Municipality/Barangay actor can Update Progress/details/docs for own For Revision project; Completed/Rejected remain read-only; saving For Revision at 100% with V110 docs sets status back to Ready for Review.
V200: Budget option PB collections are repaired as a complete set after applied-history drift: `budget_fund_sources`, `budget_funding_years`, `budget_fund_main_accounts`, `budget_fund_sub_accounts`; repair seeds canonical V178/V189 values, resets auth read/write rules, and must tolerate any existing subset.
V201: Released Amount rows returned by PB with missing legacy/drifted `year` derive display/filter year from `date`; valid saved `budget_expenses` rows must still count in Budget summary/breakdown/table instead of being dropped by `parseRecordList`.
V202: Released Amount create requires `sub_account` when `main_account` is `General Fund` or `Trust Fund`; blank child account create is blocked with `Sub account is required.`; Special Education Fund/Special Health Fund keep blank child value; Others still requires purpose copy per V192.
V203: Legacy Released Amount rows with blank `sub_account` for General Fund/Trust Fund render and repair to canonical defaults (`GF - Proper`, `Trust Fund - Proper`) instead of showing `—`; repair also reasserts current `budget_expenses` fields and removes legacy fund fields.
V204: Live PB schema audit via `/v1` shows every manifest collection has all §I fields, no id-only option records, and no legacy `agreement_file`; option repairs use `fields.addMarshaledJSON` + reseed after applied-history drift.
V205: Role-scope checks distinguish project mutation from progress mutation: Municipality/Barangay scoped actors may `progress_updates.create` only for in-scope projects, while `projects.create|update|delete` stays denied and Projects UI hides project mutate affordances.
V206: `/users` create/edit scope selects are dialog-safe and pointer-interactable in RTL/browser flows: role change reveals required Municipality/Barangay controls, option selection never leaves trigger/body `pointer-events:none`, and submit payload includes valid scope.
V207: Approval request-revision flow completes deterministically under standard Vitest timeout: Province opens Request Revision, submits authority+notes, writes `approval_actions.action=request_revision`, moves project to `For Revision`, and emits no React `act`/suspense warnings.
V208: Password recovery ⊥ SMTP/SMS/email reset link/OTP/self-service forgot-password route; only Super Admin admin-assisted temp password reset in `/users`.
V209: Super Admin reset password → confirm dialog → PB `users.update(id,{password,passwordConfirm,must_change_password:true})` via `manageRule`; default auto-gen temp password ≥12 chars; manual entry optional; one-time reveal modal w/ Copy; temp password never returned again by API/UI; offline delivery copy in modal.
V210: `users.must_change_password=true` → authenticated user ⊥ access admin modules until `/change-password` succeeds: `users.update` w/ `oldPassword` (temp) + new `password`/`passwordConfirm` + `must_change_password:false`; AuthGuard + login redirect enforce; `/change-password` ⊥ behind auth.
V211: PB `users.manageRule` = Super Admin only (`@request.auth.role = "Super Admin"`); enables Super Admin password set w/o `oldPassword`; password change refreshes `tokenKey` → prior sessions invalid.
V212: Reset password UI/tests/hooks ⊥ call `requestPasswordReset`/`confirmPasswordReset`; audit action remains `reset_password`; PB audit hook emits `reset_password` row when Super Admin sets temp password (not generic `update` only).
V213: Password entry UIs (`/change-password` new password, `/users` create initial password) show shared requirements via `FieldDescription` (`PASSWORD_REQUIREMENTS_TEXT`); zod min length = `PASSWORD_MIN_LENGTH` (8).
V214: Temp password reveal modal Copy uses `copyTextToClipboard` (clipboard API + `execCommand` fallback); success → visible `Copied!` + updated aria-label; Vitest+RTL asserts clipboard write.
V215: `users.updateRule` = Super Admin full update OR authenticated self-update when `@request.body.oldPassword:isset` (forced/voluntary password change w/o manageRule); repair migration `1740000027_users_self_password_update_rule.js`; ⊥ Super-Admin-only updateRule blocking V210.

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
| T8 | x | PB collection rules: scoped PBAC read/write by role+resource+scope | V2,V14,V16,V118,V160 |
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
| T33 | x | theme icon toggle + visible Live pill across subscribed modules + PB realtime helper + focus retry | V60–V67,I.pb-realtime,reports-module.test.tsx |
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
| T44 | x | Super Admin promotion + RBAC/PBAC role-policy map + `/users` management panel | V16,V115–V121,user-management-module.test.tsx,access-control.test.ts |
| T45 | x | PB `locations` collection + public location filter by name+slug | V16,V55,V73,V123,J8 |
| T46 | x | admin nav/header obscuring fix at 100% zoom, especially Projects | V16,V98,V122,admin-shell.test.tsx |
| T47 | x | PB hook-owned Super Admin-only activity_logs audit trail + wide-event structure | V16,V124–V128,V130,audit-ownership.test.ts,manifest.test.ts |
| T48 | x | rename "Province/Barangay Agreement" to "Resolution" incl `resolution_file` migration | V16,V80,V102,V103,V129 |
| T49 | x | post-J5 behavior coverage via Vitest+RTL/component/source checks | V18,V19,user-management-module.test.tsx,audit-ownership.test.ts,admin-shell.test.tsx |
| T50 | x | bugfix public projects location fallback + legacy admin login role/status backfill | V16,V123,V131,V132,J1,J3,J8 |
| T51 | x | admin project location UI: cards, filters, create/edit modal, and cross-module project references | V135,V72,V73,V74,V75–V91 |
| T52 | x | seed canonical demo locations + PB audit hook docs-compliant `*.pb.js` entrypoint/runtime actor capture | V133,V136,V137,V124–V128,V130 |
| T53 | x | SQL-backed Cagayan municipality/barangay location tree + PB hierarchy migration + location filter copy | V123,V135,V136,V139 |
| T54 | x | admin project dialog searchable municipality+barangay popover/comboboxes; remove LGU from Projects UI | V135,V139,V140 |
| T55 | x | admin navbar blur marker/style while dialogs are open | V122,V141 |
| T56 | x | dialog z-index tokens above sticky admin navbar | V122,V141,V142 |
| T57 | x | harden barangay rendering against empty optional `level` and barangay-only location rows | V139,V140,V143 |
| T58 | x | add sample users to `seed:dev` for legacy role/status simulation | V70,V115–V121,V144 |
| T59 | x | seed sample privileged-user demo allocations/progress/approvals for interaction simulation | V70,V124–V128,V145 |
| T60 | x | replace raw portal dropdown `z-50` with shared overlay token above dialogs | V140,V142,V146 |
| T61 | x | make admin municipality/barangay command lists scroll inside dialog popovers | V140,V147 |
| T62 | x | sync public Projects location UI/filter with admin: barangays yes, LGU no | V123,V135,V140,V148 |
| T63 | x | admin module location filters + responsive allocate dialog regressions; TDD red first via Vitest+RTL component tests | V16,V19,V77,V89,V147,V150–V152,budget-module.test.tsx,progress-module.test.tsx,approvals-module.test.tsx,reports-module.test.tsx |
| T64 | x | make every admin dialog viewport-safe responsive+scrollable; add source/RTL regressions | V16,V19,V98,V153,projects-module.test.tsx,budget-module.test.tsx,user-management-module.test.tsx,progress-module.test.tsx,approvals-module.test.tsx |
| T65 | x | dashboard date/municipality/barangay filters applied to all KPI/widget data | V16,V19,V154,dashboard-module.test.tsx |
| T66 | x | Budget/Progress/Approvals top date-range filters, shared UX, no reload | V16,V19,V155,budget-module.test.tsx,progress-module.test.tsx,approvals-module.test.tsx |
| T67 | x | initial Budget Released Amount rename + PB-backed dropdown groundwork | V16,V34,V156,V177,budget-module.test.tsx |
| T68 | x | Province-only approval workflow incl Request Revision + barangay status-only submissions | V16,V118,V158,V159,V167,approvals-module.test.tsx |
| T69 | x | four-role RBAC/PBAC scope enforcement for Barangay/Municipality/Province/Super Admin | V16,V115–V121,V160,V161,user-management-module.test.tsx,access-control.test.ts |
| T70 | x | add Vitest+RTL journey coverage for dashboard filters + role-scoped access | V16,V18,V19,V165,J12,J13,j12-dashboard-filters.test.tsx,j13-role-scope.test.tsx |
| T71 | x | finish replacing admin visible date inputs with shadcn/Radix range picker on Projects + Reports | V16,V19,V154,V155,V162,projects-module.test.tsx,reports-module.test.tsx |
| T72 | x | PB repair migration for approval/audit select enum drift | V16,V134,V163,manifest.test.ts |
| T73 | x | persist scoped seed user municipality/barangay in `seed:dev` | V70,V144,V164,dev-fixtures.test.ts |
| T74 | x | align Province progress-update policy/rules with RBAC scope | V118,V119,V160,access-control.test.ts,manifest.test.ts |
| T75 | x | render visible Reports Live pill when subscribed | V67,T33,reports-module.test.tsx |
| T76 | x | add or remove journey refs for J6–J13 according to actual files | V18,V19,V165,J8,J12,J13 |
| T77 | x | fix Calendar react-day-picker v10 classNames build failure | V16,V166,calendar.test.ts |
| T78 | x | harden RBAC role matrix with failing-first Vitest/RTL + PBAC denial tests for Barangay/Municipality/Province/Super Admin | V16,V19,V168–V171,J13,access-control.test.ts,user-management-module.test.tsx |
| T79 | x | Projects Excel import: template download, `.xlsx/.xls` upload parse, partial bulk create, row-level validation summary | V16,V19,V172–V176,J14,projects-module.test.tsx |
| T80 | x | make admin/public dropdown option sets PocketBase-backed with failing-first RTL regressions | V16,V19,V177,projects-module.test.tsx,reports-module.test.tsx,user-management-module.test.tsx,budget-module.test.tsx,public-projects.test.tsx |
| T81 | x | amend Budget Released Amount data/UI: remove Materials/category/fund_type/funding_years, add year/main_account/sub_account Fund Source section, update expense table/export with red-first tests | V16,V19,V79,V80,V156,V157,V178,V179,budget-module.test.tsx,manifest.test.ts |
| T82 | x | standardize all data tables on shadcn Radix Data Table/TanStack pattern with red-first RTL regressions | V16,V19,V180,V182,reports-module.test.tsx,budget-module.test.tsx,user-management-module.test.tsx,projects-module.test.tsx |
| T83 | x | standardize all forms on shadcn Radix Field pattern with zod field errors and red-first RTL regressions | V16,V19,V23,V35,V181,V182,projects-module.test.tsx,budget-module.test.tsx,progress-module.test.tsx,approvals-module.test.tsx,user-management-module.test.tsx |
| T84 | x | fix Docker/Next build regression from emitted-only `.js` package source import | V16,V183,source-imports.test.ts |
| T85 | x | harden production deploy workflow: lowercase GHCR metadata, early config validation, no GitHub artifacts | V16,V21,V184,source-imports.test.ts |
| T86 | x | fix no-domain deploy + pre-backup env ordering regression | V16,V21,V184,V185,source-imports.test.ts |
| T87 | x | fix pre-deploy backup auth after stale remote `.env` from failed deploy | V16,V21,V185,V186,source-imports.test.ts |
| T88 | x | Projects multi-file Excel import: multi-select/drop, aggregate rows, filename+row errors | V16,V19,V172–V176,V187,J14,projects-module.test.tsx |
| T89 | x | Budget Released Amount copy + fund-source/sub-account conditional UI/options | V16,V19,V156,V157,V178,V188–V190,budget-module.test.tsx,manifest.test.ts |
| T90 | x | `/users` create account refresh/insert visible row after PB success | V16,V19,V116,V191,J15,user-management-module.test.tsx |
| T91 | x | RBAC copy/tests align Province/Provincial Admin approvals + scoped Municipality/Barangay reads | V16,V19,V158,V160,V168–V171,V194,J13,approvals-module.test.tsx,access-control.test.ts |
| T92 | x | repair applied Budget option values + Others validation copy + seed guards | V16,V134,V178,V189,V190,V192,V193,manifest.test.ts,forms.test.ts,dev-fixtures.test.ts |
| T93 | x | add user scope fields to `/users` create/edit dialog + PB payload/tests | V16,V19,V115,V168,V170,V191,V195,user-management-module.test.tsx,access-control.test.ts |
| T94 | x | align dev seed budget expenses with conditional sub-account tree | V16,V178,V189,V190,V193,dev-fixtures.test.ts,seed-dev.ts |
| T95 | x | fix Budget allocation actor attribution for plain/create-with-docs paths | V16,V19,V149,V196,budget-module.test.tsx |
| T96 | x | add PB repair migration + tests proving Released Amount create no longer requires legacy `fund_type` | V16,V34,V133,V134,V179,V197,manifest.test.ts,forms.test.ts |
| T97 | x | fix Projects import/edit Location mapping so free-text location never populates Municipality/Barangay | V16,V19,V174,V187,V198,projects-module.test.tsx |
| T98 | x | Completion review status workflow: add Ready for Review + For Revision options/tabs/summary, keep Barangay Update Progress available, resubmit to Ready for Review with red-first tests | V16,V19,V4,V81,V85,V86,V93,V109,V158,V159,V199,J16,approvals-module.test.tsx,progress-module.test.tsx,forms.test.ts,manifest.test.ts |
| T99 | x | repair missing Budget option PB collections after applied migration drift | V16,V133,V134,V177,V178,V189,V200,manifest.test.ts |
| T100 | x | keep Released Amount rows visible after PB schema/rule drift | V16,V33,V75–V80,V134,V200,V201,budget-module.test.tsx,records.test.ts,manifest.test.ts |
| T101 | x | require General Fund/Trust Fund sub-account on Released Amount create | V16,V19,V34,V157,V190,V202,budget-module.test.tsx,forms.test.ts |
| T102 | x | repair/display legacy blank GF/Trust Fund Released Amount sub-account rows | V16,V19,V178,V190,V197,V203,budget-module.test.tsx |
| T103 | x | repair id-only option records and live PB collection field-shape drift | V16,V17,V133,V134,V177,V204,manifest.test.ts |
| T104 | x | fix J13 role-scope expectation and regress scoped progress vs project mutation split | V16,V19,V160,V169,V171,V205,J13,access-control.test.ts,j13-role-scope.test.tsx |
| T105 | x | harden `/users` scoped role create/edit selects in dialog and remove pointer-event/timeout flake | V16,V19,V146,V181,V195,V206,user-management-module.test.tsx |
| T106 | x | harden Province request-revision approval test/UI flow to be deterministic and warning-clean | V16,V19,V158,V167,V199,V207,approvals-module.test.tsx |
| T107 | x | PB migration: `users.must_change_password` bool default false + `users.manageRule` Super Admin; manifest/schema/tests | V16,V133,V134,V211,manifest.test.ts,records.test.ts |
| T108 | x | replace `/users` reset email w/ admin temp-password confirm+reveal dialog; red-first Vitest+RTL; ⊥ `requestPasswordReset` | V16,V19,V116,V120,V208,V209,V212,J6,user-management-module.test.tsx |
| T109 | x | forced password change: `/change-password` form, AuthGuard redirect/block, login post-auth routing; Vitest+RTL journey J17 | V16,V19,V210,J17,change-password-form.test.tsx,auth-guard.test.tsx,j17-change-password.test.tsx |
| T110 | x | PB audit hook: Super Admin temp password set → `activity_logs.action=reset_password`; redact password fields | V16,V124,V128,V212,audit-ownership.test.ts |
| T111 | x | password requirements UI on password fields + fix temp password Copy w/ fallback/feedback; red-first Vitest+RTL | V16,V19,V181,V213,V214,password-policy.test.ts,copy-to-clipboard.test.ts,change-password-form.test.tsx,user-management-module.test.tsx |
| T112 | x | PB repair migration: users self password updateRule for forced change (V210); manifest regression | V16,V133,V134,V210,V215,manifest.test.ts |

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
| B27 | 2026-06-23 | Dialog primitives used `z-50` while admin navbar used `--z-sticky=100`, so navbar overlapped modal close/title area | switch dialog overlay/content to `--z-modal-backdrop`/`--z-modal`; add UI source regression | V142 |
| B28 | 2026-06-23 | barangay rows could be loaded but not render because municipality choices only used explicit municipality rows; PB empty optional `level` could also drop legacy location rows during zod parse | coerce `locations.level=""` to undefined; derive municipality choices from barangay rows and cover with RTL/schema regressions | V143 |
| B29 | 2026-06-23 | Select/popover portals still used raw `z-50`, lower than dialog `--z-modal=210`, so dialog-contained dropdowns could render behind modal content | add `--z-overlay`; move Select/Popover/DropdownMenu/Combobox portal content to `z-(--z-overlay)`; source regression bans raw `z-50` there | V146 |
| B30 | 2026-06-23 | municipality/barangay popover list used generic command list height only; long lists could exceed usable dialog viewport and feel unscrollable | add viewport-aware max height + overscroll containment to location command lists; RTL regression asserts scroll classes | V147 |
| B31 | 2026-06-23 | relation display mapped IDs only after strict full `userRecordSchema`; denied/partial `/users` rows left `allocated_by`/`updated_by` raw ids | display map accepts minimal `{id,name,email}` rows + current auth user; regressions cover empty + partial users list | V149 |
| B32 | 2026-06-24 | Budget/Progress/Approvals/Reports still expose generic location/LGU filtering instead of municipality+barangay hierarchy | add shared admin location filters backed by active PB `locations`; combine with each module filter/export path | V150,V151 |
| B33 | 2026-06-24 | New/Edit Project municipality/barangay dropdown lists remain hard to scroll for long Cagayan lists in dialog context | strengthen dialog popover max-height/overflow behavior and cover with RTL/source regression | V147 |
| B34 | 2026-06-24 | Allocate Budget dialog layout stays static under browser zoom/viewport changes; fields/actions can fail to reflow | make dialog fluid, max-height bounded, internally scrollable, and assert responsive classes/behavior | V152 |
| B35 | 2026-06-24 | Admin dialogs used mixed `DialogContent` sizing; some lacked viewport width/max-height/internal scroll | normalize all admin dialog content to viewport-safe responsive+scrollable classes; add regressions | V153 |
| B36 | 2026-06-24 | PB migrations allow `approval_actions.action` approve/reject only and stale audit select values, while manifest/spec/hooks use `request_revision` + §C roles | add later repair migration for approval/audit select values; test manifest vs migration | V163,T72 |
| B37 | 2026-06-24 | V14/T8 still described old public-read/admin-write baseline after PBAC scope rules landed | rewrite invariant/task to scoped PBAC by collection/role/resource/scope | V14,T8 |
| B38 | 2026-06-24 | Reports module renders subscribed state as `sr-only` text, violating visible Live pill invariant | render shared `LivePill`/`PageHeaderBand` in Reports header | V67,T75 |
| B39 | 2026-06-24 | Province policy/rules allow `progress_updates.*` despite RBAC saying Province approvals/fund releases only and Barangay owns updates | remove Province progress mutation or amend RBAC intentionally | V119,V160,T74 |
| B40 | 2026-06-24 | `seed:dev` sample user fixture has scope fields but `upsertSampleUser` omits them from payload | persist fixture `municipality`/`barangay` for scoped sample users | V164,T73 |
| B41 | 2026-06-24 | Projects/Reports still show standalone native date inputs after T71 marked complete | finish picker migration or keep T71 open until all admin modules comply | V162,T71 |
| B42 | 2026-06-24 | §T rows cited J6–J13 as complete journey coverage, but repo only has `j1`–`j5` journey files | add missing journey files or cite existing component/source tests only | V165,T70,T76 |
| B43 | 2026-06-24 | `Calendar` passed stale `classNames.table` to `react-day-picker@10`, so admin Next build failed typecheck | remove stale slot; add source regression for supported v10 slots | V166,T77 |
| B44 | 2026-06-25 | approvals UI defaulted missing auth actor to allowed → approval buttons could render without Province actor | fail-closed `canCreateApprovalActions`; add no-actor RTL regression | V167,T68 |
| B45 | 2026-06-25 | scoped Municipality/Barangay actor with blank scope could be active; blank actor scope could match blank project scope | require scoped role assignments before active policy/scope checks; blank scope values never match | V168,V170,T78 |
| B46 | 2026-06-25 | `packages/pocketbase/src/schemas/forms.ts` imported `./enums.js`; Docker/Next Turbopack consumed raw TS via `transpilePackages` and could not resolve real `enums.js` | use package export import + source regression banning relative `.js` TS imports | V183,T84 |
| B47 | 2026-06-25 | deploy uploaded new `.env` before backup, so current PocketBase could auth with mismatched env; deploy also required `DOMAIN` before DNS existed | backup before env upload; render missing `DOMAIN` as `:80`; Caddy env default supports IP-only deploy | V185,T86 |
| B48 | 2026-06-25 | prior failed deploy left remote `.env` newer than running PocketBase process env, so backup still auth'd with wrong superuser password | load backup auth vars from running `pocketbase` container env before API login; use Bearer token header | V186,T87 |
| B49 | 2026-06-25 | Projects import UI allowed only one Excel file; user needs MOA-like multi import workflow | multi-file import invariant + T88 red-first tests | V187,T88 |
| B50 | 2026-06-25 | Budget visible tab/label beside Allocations still says "Expenses" after Released Amount rename | visible copy invariant bans "Expenses" in Budget UI | V188,T89 |
| B51 | 2026-06-25 | Budget sub-account behavior/options drifted: wrong `GT - Proper`, SEF/SHF child field, Others labelled Sub Account | exact fund-source tree + conditional child-control invariants | V157,V178,V189,V190,T89 |
| B52 | 2026-06-25 | `/users` create succeeds in PocketBase but created user not inserted/refetched into UI list | visible-list refresh invariant + J15 | V191,T90 |
| B53 | 2026-06-25 | Budget option fix edited applied migration `1740000014`; DBs with `_migrations` row keep old `Other`/`GT - Proper` data | later repair migration `1740000016_budget_fund_option_value_repair.js` renames option rows + existing expense values | V134,V178,V189,T92 |
| B54 | 2026-06-25 | Others form validation still returned `Sub account is required.` while UI must not label Others as Sub Account | validation copy says `Other purpose is required.` | V190,V192,T92 |
| B55 | 2026-06-25 | seed tests did not guard Budget demo expenses against legacy `Other`/`GT - Proper` values | fixture tests assert canonical fund values only | V193,T92 |
| B56 | 2026-06-25 | `/users` create/edit dialog only captured name/email/role/status/password, so scoped Municipality/Barangay accounts could be created without required scope | add municipality/barangay controls, payload fields, validation, and PBAC regressions | V195,T93 |
| B57 | 2026-06-25 | dev seed budget expenses can use canonical main accounts but still omit required GF/Trust Fund sub_account examples | require seed fixtures/tests to follow V190 conditional sub-account tree | V193,T94 |
| B58 | 2026-06-26 | Budget allocation create omits `allocated_by`; new rows render blank Allocated By even though auth actor exists | include actor id in allocation create payload/FormData; red-first RTL covers table display | V196,T95 |
| B59 | 2026-06-26 | deployed `budget_expenses` still rejects create with `"fund_type": "cannot be blank"` after frontend stopped sending legacy field | repair applied PB schema so legacy fund fields are absent/non-required; keep current schema/payload tests | V197,T96 |
| B60 | 2026-06-26 | Projects import stores Excel `Location` as free text, but edit form fallback splits that free text into Municipality/Barangay when structured fields are blank | remove free-text-to-hierarchy fallback; add import/edit regression | V198,T97 |
| B61 | 2026-06-26 | request_revision leaves review-ready project in Completed/read-only flow, so Barangay loses Update Progress and cannot revise submitted completion | introduce Ready for Review + For Revision statuses with Barangay update/resubmit invariant and tests | V199,T98 |
| B62 | 2026-06-26 | live PB had `budget_fund_sources` but missed `budget_funding_years`/`budget_fund_main_accounts`/`budget_fund_sub_accounts`; old collection migration already applied so admin Budget dropdown GETs 404 | add later idempotent collection repair migration that creates/seeds all Budget option collections as a set | V200,T99 |
| B63 | 2026-06-26 | saved `budget_expenses` rows can return without current `year` after applied schema drift; strict zod parse drops rows → Released Amount summary/table stays ₱0 despite PB records | derive missing expense year from `date` before record parse; RTL regression covers denied aux lookups + missing year row | V201,T100 |
| B64 | 2026-06-26 | existing Budget option collections can keep superuser-only rules because collection repair only sets rules when creating missing collections | add later rules repair migration resetting `budget_fund_*` list/view/mutate rules to authenticated access | V200,T100 |
| B65 | 2026-06-26 | `budgetExpenseMutateSchema` required Others purpose only, so General Fund/Trust Fund releases could save `sub_account` blank and table rendered `—` | require sub-account for dropdown-bearing main accounts; RTL/schema regressions block blank create | V202,T101 |
| B66 | 2026-06-26 | existing General Fund/Trust Fund Released Amount rows saved before V202 can still have blank `sub_account`, so table shows `—` despite the current option tree | display canonical defaults for legacy rows and add idempotent PB migration backfilling blank child accounts/current fields | V203,T102 |
| B67 | 2026-06-26 | live `/v1` PB audit found option collections whose schema contained only `id`, creating id-only option records; projects/budget_allocations/progress_updates also missed current manifest fields after applied migrations | add later field-shape repair migrations using `addMarshaledJSON`, delete unusable id-only option rows, reseed canonical options, and re-audit `/v1` clean | V204,T103 |
| B68 | 2026-06-26 | J13 expected Municipality `progress_updates.create` denied, contradicting scoped-progress RBAC that allows Municipality/Barangay progress updates while denying project mutation | update journey/source tests to assert project mutation denied but scoped progress mutation allowed only in-scope | V205,T104 |
| B69 | 2026-06-26 | `/users` scoped role tests time out or hit `pointer-events:none` on Municipality/Barangay selects inside dialog, so scoped account create/edit cannot be trusted | make dialog-contained selects portal/cleanup safe and keep scope payload regressions warning-clean | V206,T105 |
| B70 | 2026-06-26 | Province Request Revision approval test times out despite spec requiring request_revision action + For Revision transition | stabilize request-revision interaction/submit flow and keep Vitest/RTL output free of React act/suspense warnings | V207,T106 |
| B71 | 2026-07-06 | `requestPasswordReset` depends on PB mailer/SMTP; deploy has no reliable email/SMS → reset emails never reach barangay/municipality users | admin-assisted temp password reset + forced change on login; ⊥ email/SMS recovery | V208–V212,T107–T110 |
| B72 | 2026-07-06 | temp password Copy called `navigator.clipboard.writeText` only — no fallback/feedback → silent fail in dev/non-secure contexts; password UIs lacked visible requirements | `copyTextToClipboard` w/ execCommand fallback + Copied! state; `PasswordRequirements` + shared `PASSWORD_MIN_LENGTH` | V213,V214,T111 |
| B73 | 2026-07-06 | `users.updateRule` Super Admin only after PBAC migrations; non–Super Admin forced change PATCH → PB 404 `sql: no rows in result set` despite valid temp password | migration `1740000027` adds self-update when `oldPassword` in body; keeps Super Admin full update | V210,V215,T112 |
