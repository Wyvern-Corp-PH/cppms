# Refactoring — catalog index

Agent paraphrase index (23 smells · 66 techniques). Cite `smell:<slug>` / `tech:<slug>`.

## Smell → file

| Smell | File section |
| ----- | ------------ |
| Long Method | smells.md (bloaters) |
| Large Class | smells.md (bloaters) |
| Primitive Obsession | smells.md (bloaters) |
| Long Parameter List | smells.md (bloaters) |
| Data Clumps | smells.md (bloaters) |
| Switch Statements | smells.md (oo-abusers) |
| Temporary Field | smells.md (oo-abusers) |
| Refused Bequest | smells.md (oo-abusers) |
| Alternative Classes With Different Interfaces | smells.md (oo-abusers) |
| Divergent Change | smells.md (change-preventers) |
| Shotgun Surgery | smells.md (change-preventers) |
| Parallel Inheritance Hierarchies | smells.md (change-preventers) |
| Comments | smells.md (dispensables) |
| Duplicate Code | smells.md (dispensables) |
| Lazy Class | smells.md (dispensables) |
| Data Class | smells.md (dispensables) |
| Dead Code | smells.md (dispensables) |
| Speculative Generality | smells.md (dispensables) |
| Feature Envy | smells.md (couplers) |
| Inappropriate Intimacy | smells.md (couplers) |
| Message Chains | smells.md (couplers) |
| Middle Man | smells.md (couplers) |
| Incomplete Library Class | smells.md (couplers) |

## Technique → file

| Technique | File section |
| --------- | ------------ |
| Extract Method … Substitute Algorithm | techniques.md (composing-methods) |
| Move Method … Introduce Local Extension | techniques.md (moving-features) |
| Self Encapsulate Field … Replace Subclass With Fields | techniques.md (organizing-data) |
| Decompose Conditional … Introduce Assertion | techniques.md (simplifying-conditionals) |
| Rename Method … Replace Exception With Test | techniques.md (simplifying-calls) |
| Pull Up Field … Replace Delegation With Inheritance | techniques.md (generalization) |

Full technique names live in `techniques.md` section headers.

## Quick routes

| User says… | Open |
| ---------- | ---- |
| long method / god function | smells.md + techniques.md (composing) |
| god class | smells.md → extract-class |
| stringly typed / magic ints | smells.md (primitive-obsession) + organizing-data |
| switch / type codes | smells.md (oo-abusers) + polymorphism tech |
| change one thing → many files | smells.md (change-preventers) |
| dead / speculative code | smells.md (dispensables) (+ simplicity) |
| feature envy / middle man | smells.md (couplers) + moving-features |
| nested if hell | techniques.md (conditionals) |
| messy API / params | techniques.md (calls) |
| inheritance mess | techniques.md (generalization) |
| when / how / debt | foundations.md |
