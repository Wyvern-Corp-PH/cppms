# Refactoring — foundations

## What

Refactoring = **systematic improve structure without new behavior**. Goal: dirty → clean + simple design. Smell = signal (may be symptom of deeper design issue). Technique = named safe step. Pros/cons — motivate each move.

## Dirty vs clean

| Dirty | Clean |
| ----- | ----- |
| Inexperience × deadlines × shortcuts × mismanagement | Easy read / understand / change |
| Unpredictable delivery | Predictable change cost |

## Technical debt (Ward Cunningham metaphor)

Loan → ship faster now; interest = slower every day until repaid (tests, design). Causes: business pressure unfinished features; mgmt not seeing interest; monolith coupling; no tests; no docs; tribal knowledge; long-lived branches; delayed refactor while new code piles on obsolete parts; no compliance; incompetence.

## When

| Trigger | Move |
| ------- | ---- |
| **Rule of Three** | 1st get done · 2nd cringe-duplicate · **3rd refactor** |
| Add feature | Clean path first → easier change |
| Fix bug | Bugs hide in dirt; clean → bugs surface |
| Code review | Last tidy before public; pair with author |

## How (done right)

1. **Small steps** — each leaves program working
2. **Tests green** after every step (or fix error / raise test altitude if private-method tests broke)
3. **Cleaner after** — if still mess, you wandered; rewrite chunk only with tests + time
4. **⊥ new features** in refactor commits — split at least by commit
5. Comment urge inside method → often **Extract Method** signal

## Process loop

```
smell spotted → name smell → pick technique(s) → one step → test → repeat → stop when clean enough for task
```

Boy-scout: leave touched path slightly better. Cap scope (ratchet K) — ⊥ boil ocean mid-feature.

## Related packs

| Pack | Boundary |
| ---- | -------- |
| **simplicity** | Delete / YAGNI / stdlib first — before inventing structure |
| **codebase-design** | Shallow module → deeper interface (after green build) |
| **code-review** | Standards axis may cite smells |
| **coding-principles** | KISS / DRY-3 / SOLID at seams |

## Cite form

`smell:long-method` · `tech:extract-method` · pack file name.
