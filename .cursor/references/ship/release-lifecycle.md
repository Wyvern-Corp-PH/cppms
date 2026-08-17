# Release lifecycle — env promotion + Release Please

Org workflow for this pack’s intended delivery path. **Release Please is release automation, not a branching strategy** — it expects linear history (rebase / squash) and maintains **one** Release PR on the production branch. Environments and promotion are your workflow around it.

---

## Environments

| Branch | Role |
| ------ | ---- |
| `dev` | Active integration — default base for feature work |
| `staging` | QA / UAT |
| `main` | Production — **only** branch Release Please watches |

Never skip environments. Never cherry-pick across them. Promote the **same** commits: `feature → dev → staging → main`.

---

## Skill / pipeline map

How this lifecycle attaches to pack surfaces:

```text
Ticket + branch from dev
  → /ship Phase 1–2 `ship-setup` · or /triage · /wayfinder
Clarify / spec
  → Phases 3–5: grill* · research · spec|contract · to-tickets
Plan + design
  → Phase 6: design-architect → design_design.json
Implement + Conventional Commits
  → Phase 7: build · tdd · simplicity · ship-execute (commit/unit)
Review + CI
  → Phase 8 ship-review + design-auditor · Phase 9 ship-verify
  → CI fail → /ci-investigator
Rebase / conflict
  → /resolving-merge-conflicts  (rebase, not merge-commit)
PR → dev (Rebase and Merge)
  → Phase 9 AskQuestion push/PR · /code-review if ad-hoc
Promote dev → staging → main
  → human / CI promotion PRs  (⊥ ship invents cherry-picks)
Release Please on main
  → needs feat:/fix:/… from Phase 7 commits
Hotfix on main
  → branch hotfix/<TICKET> · merge main · then merge back → staging → dev
```

| Stage | Pack surface |
| ----- | ------------ |
| Ticket + branch | `ship-setup`, `/triage`, `/wayfinder`, `rules/branching.mdc` |
| Spec / contract | `/ship` 3–5 · `spec` / `contract` |
| Design | `design-architect` / `design-auditor` · `skills/design` |
| Code + commits | `build`, `tdd`, `simplicity`, `ship-execute` |
| Rebase conflicts | `resolving-merge-conflicts` |
| Diff review | Phase 8 `ship-review` · or `/code-review` |
| CI red | `ci-investigator` |
| Push / open PR | Phase 9 AskQuestion |
| Env promotion | This doc + org CI (not a ship phase) |
| Version / tag / GitHub Release | Release Please on `main` |

Full orchestrator: [`../../commands/ship.md`](../../commands/ship.md) · Pipelines: [`../../AGENTS.md`](../../AGENTS.md).

---

## High-level lifecycle

```text
Ticket
 │
 ▼
SP-123
 │
 ▼
feature/SP-123-add-payment   (or story/SP-123-… — see branching.mdc)
 │
 │ (rebase onto origin/dev frequently)
 ▼
dev
 │
 │ Release Candidate PR
 ▼
staging
 │
 │ QA
 │
 ├── rejected → bug ticket → feature fix → dev → staging again
 │
 └── approved → PR staging → main
         │
         ▼
       main
         │
         ▼
  Release Please
         │
         ├── Release PR (one, continuously updated)
         ├── CHANGELOG
         ├── version bump
         ├── git tag
         └── GitHub Release
```

---

## Development (feature → `dev`)

```text
Ticket: SP-123 Fix Login Issue
  │
  ▼
git checkout dev
git pull --ff-only
git checkout -b feature/SP-123-login-fix   # or story/SP-123-login-fix

  │  develop (ship execute / build — Conventional Commits)
  ▼
git fetch origin
git rebase origin/dev
  │  resolve if needed → /resolving-merge-conflicts
  ▼
git push --force-with-lease
  │
  ▼
PR → dev   (GitHub: Rebase and Merge — no merge commit)
```

Linear history Release Please prefers:

```text
A — B — C — D — E — F     # chronological; no merge bubbles
```

---

## Ticket status ladder (example)

```text
Backlog → Selected → In Progress → Code Review
  → Ready For QA → Merged → dev → deploy DEV
  → Ready For Staging → Merged → staging → QA
      ├── Fail → Bug ticket → feature/* → re-enter at In Progress
      └── Pass → Ready For Release → PR staging → main
            → Release Please Release PR → merge → GitHub Release
```

---

## Branch promotion

```text
feature ──► dev ──► staging ──► main
```

| Rule | Detail |
| ---- | ------ |
| No skip | ⊥ feature → main, ⊥ staging without prior `dev` land |
| No cherry-pick | Promote commits; don’t invent parallel histories |
| Same commits | What QA’d on staging is what merges to main |
| Feature base | Always `dev` (except hotfix — see Edge cases) |

---

## Rebase (mandatory)

Morning / before PR:

```text
origin/dev:  A---B---C
feature:     A---B---X---Y

git fetch && git rebase origin/dev
→ A---B---C---X'---Y'
```

Conflict path: resolve → `git rebase --continue` → `git push --force-with-lease`. **⊥** merge commit “just to unblock.”

Skill: [`resolving-merge-conflicts`](../../skills/resolving-merge-conflicts/SKILL.md).

---

## Release Please on `main`

```text
main @ v1.0.0
  │  feat: … / fix: … / feat!: …
  ▼
Release Please Action
  │  opens or updates single Release PR
  ▼
Merge Release PR → version bump · CHANGELOG · tag · GitHub Release
```

| Fact | Detail |
| ---- | ------ |
| One PR | Existing Release PR is updated when more releasable commits land; not a second PR |
| Triggers | Conventional Commits: `feat:`, `fix:`, `deps:`, breaking `feat!:` / `BREAKING CHANGE` |
| Ignored | `update login`, `wip`, chore-only (unless configured) |
| Force version | Footer / commit: `Release-As: 3.2.0` |
| Won’t open | No releasable commits; `autorelease: pending` stuck; failed workflow; bad messages |

Ship Phase 7 already requires Conventional Commits — that is the Release Please input.

---

## Edge cases

### 1. QA rejects

Fix via **new bug ticket** → feature branch → `dev` → `staging`. **⊥** commit directly on `staging`.

### 2. Another feature lands on `dev` during QA

Stays on `dev`. Included only in the **next** `dev → staging` promotion unless you intentionally widen the RC.

### 3. Hotfix

```text
main → hotfix/SP-999 → main → Release Please → tag
     → merge hotfix back → staging → dev
```

Always flow hotfix **down** so histories don’t diverge.

### 4. Release PR open + more commits on `main`

Release Please **updates** the same Release PR.

### 5. Merge conflict on feature

Rebase onto `dev` → resolve → continue → `--force-with-lease`. Skill: `resolving-merge-conflicts`.

### 6. CI failure on PR

Fix → rebase if needed → push → green. Agent: `ci-investigator`.

### 7. Wrong version on Release PR

Commit with `Release-As: x.y.z`.

### 8. Bad commit message

```text
# ignored as release trigger
update login

# good
fix(auth): prevent login timeout
feat(payment): support Maya QR
feat!: remove legacy API
```

### 9. Revert after Release PR

`revert(…)` updates the Release PR / changelog to match history.

---

## Recommended commands

```bash
# Start
git checkout dev && git pull --ff-only
git checkout -b feature/SP-123-login

# Stay linear
git fetch origin && git rebase origin/dev
git push --force-with-lease

# Land
# PR → dev with "Rebase and Merge"

# Promote (PRs, same commits)
# dev → staging → (QA) → staging → main

# Release
# Merge Release Please PR on main
```

---

## Ideal end-to-end

```text
Ticket → feature branch → rebase origin/dev → PR (Rebase & Merge) → dev
  → deploy DEV → PR → staging → QA
       ├── FAIL → bug ticket → feature → …
       └── PASS → PR → main → Release Please → Release PR → merge
              → version · tag · GitHub Release → production
```

Keeps `dev` / `staging` / `main` predictable, tickets traceable, history linear for Release Please, and versions driven by Conventional Commits from `/ship` execute — not manual release management.
