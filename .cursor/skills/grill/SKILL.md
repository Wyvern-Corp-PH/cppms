---
name: grill
description: >
 Grill the user relentlessly about a plan, decision, or idea (one question at a time).
 Triggers: grill, grill me, grill-me, grilling, stress-test this idea.
 Stateless by default — use /grill-with-docs when a codebase CONTEXT.md trail is wanted.
---

Interview me relentlessly about every aspect of this until we reach a shared understanding. Walk down each branch of the decision tree, resolving dependencies between decisions one-by-one. For each question, provide your recommended answer.

Ask the questions one at a time, waiting for feedback on each question before continuing. Asking multiple questions at once is bewildering.

If a *fact* can be found by exploring the environment (filesystem, tools, etc.), look it up rather than asking me. The *decisions*, though, are mine — put each one to me and wait for my answer.

Do not act on it until I confirm we have reached a shared understanding.

## Modes

| Mode | Invoke | Behaviour |
| ---- | ------ | --------- |
| **Stateless** (default) | `/grill` (was `/grill-me`) | Interview only — no local docs |
| **With docs** | `/grill-with-docs` | Runs `/grill` + `/domain-modeling`; keeps `CONTEXT.md` / ADRs |
