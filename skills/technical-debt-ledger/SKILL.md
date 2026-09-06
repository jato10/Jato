---
name: technical-debt-ledger
description: Harvests deliberate shortcuts and deferred work marked in code comments into a durable ledger — each entry naming its ceiling (the limit the shortcut is safe up to) and its upgrade trigger (the condition that means revisit it now) — so a temporary "good enough for now" decision can't quietly rot into a permanent, untracked liability. Use when you make a scoped shortcut during code-simplification, incremental-implementation, or a time-pressured fix and need to mark it instead of hiding it. Use when auditing a codebase for deferred work before a release, a handoff, or a planning cycle. Use when the user says "what did we defer", "list the shortcuts", "debt ledger", or asks what corners were cut and why.
---

# Technical Debt Ledger

> Concept credited to `ponytail-debt`, part of [DietrichGebert/ponytail](https://github.com/DietrichGebert/ponytail), adapted here as a marker convention and standalone ledger process independent of any specific simplification persona.

## Overview

A deliberate shortcut is not a bug — it's a scoped trade a senior engineer makes on purpose, under a known constraint. The failure mode isn't making the trade; it's making it silently, so "later" never arrives. This skill gives every deliberate shortcut a comment marker naming its ceiling and its upgrade trigger, then collects those markers into a ledger that stays visible instead of rotting into forgotten context.

This is not a general TODO tracker and not a code-quality review — it only harvests trades you *chose* to make and *labeled*, so the ledger stays a short, trustworthy list instead of a dumping ground for every rough edge in the codebase.

## When to Use

- Right after choosing a scoped shortcut during `code-simplification`, `incremental-implementation`, a hotfix, or a spike — mark it the moment you make the trade, not after
- Auditing a codebase for deferred work before a release, a handoff, or a planning/roadmap cycle
- The user asks what was deferred, what corners were cut, or wants a "debt ledger" / "shortcut list"
- Before removing or "cleaning up" scaffolding you don't fully understand — check the ledger first; it may be there on purpose with a stated reason

**When NOT to use:**

- For unplanned messiness (dead code, unclear naming, accidental complexity) — that's `code-simplification` or `code-review-and-quality`, not a marked trade
- For sanctioned removal of old systems on a timeline — that's `deprecation-and-migration`
- To justify skipping a fix that has no real constraint behind it — a marker needs an actual ceiling, not "I didn't feel like doing it properly"
- As a substitute for an issue tracker on multi-week initiatives — the ledger is for small, local, in-code trades, not project planning

## Marker Convention

Every deliberate shortcut gets one comment, placed at the point of the trade, in the project's native comment syntax:

```
// DEBT: <what was simplified>. ceiling: <the limit this is safe up to>. upgrade: <the trigger to revisit>.
```

```python
# DEBT: linear scan instead of an index. ceiling: fine under ~500 rows. upgrade: this table is user-facing and will grow past that.
```

```javascript
// DEBT: in-memory queue, no persistence. ceiling: acceptable for a single-process demo. upgrade: before this ships behind a second worker.
```

All three fields are required:

- **What** — the trade in one clause, specific enough to locate in a diff
- **Ceiling** — the concrete condition under which this is still fine (a scale, a load, a user count, an environment)
- **Upgrade trigger** — the concrete condition that means "revisit this now," not "revisit this eventually"

A marker missing the ceiling or the upgrade trigger is not a debt entry — it's a TODO wearing a disguise. Reject it in review.

## Process

### Step 1: Mark at the moment of the trade

When `code-simplification`, `incremental-implementation`, or time pressure leads you to a scoped shortcut, write the marker in the same commit as the shortcut — not as a follow-up. If you can't state the ceiling and upgrade trigger right now, you don't understand the trade well enough to make it yet.

### Step 2: Harvest the markers

Scan the repo for the marker convention, excluding build output and dependency directories:

```bash
grep -rnE '(#|//|<!--) ?DEBT:' . --exclude-dir={node_modules,.git,dist,build,vendor}
```

Adjust the comment-prefix alternation for languages the grep above doesn't cover (e.g. add `--` for SQL, `;` for Lisp-family).

### Step 3: Render the ledger

One row per marker, grouped by file, oldest-first within a file so long-lived debt surfaces first:

```
<file>:<line> — <what>. ceiling: <limit>. upgrade: <trigger>. age: <first-commit date if available>
```

### Step 4: Triage against the upgrade trigger

For each entry, check whether its upgrade trigger has already fired (the scale was hit, the second environment shipped, the deadline passed). An entry whose trigger already fired is not debt anymore — it's an open bug; flag it as due, don't leave it listed alongside entries still under their ceiling.

### Step 5: Retire on resolution

When a marked shortcut is properly fixed, delete the marker in the same commit as the fix. A ledger is only trustworthy if resolved entries disappear — don't leave dead markers for "history," that's what git blame is for.

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "I'll add the marker later, I remember the context" | You won't. Context that isn't written down at the moment of the trade is gone by the next unrelated task. Mark it now or don't make the trade. |
| "It's obviously temporary, it doesn't need a ceiling" | "Obviously temporary" code is exactly what survives three years in production. A ceiling is what makes it *provably* temporary instead of just hopefully temporary. |
| "This is basically a TODO, same thing" | A bare TODO has no ceiling and no upgrade trigger, so it can never be triaged automatically — only reread and re-guessed. That's the rot this skill exists to prevent. |
| "The ledger is a report, nobody acts on it" | An entry whose upgrade trigger has already fired is due work, not a report line — surface it as such, don't let the ledger become a read-only artifact. |
| "I'll mark everything rough as debt, more coverage is better" | A ledger of unlabeled roughness is noise nobody trusts or reads. Only mark trades you deliberately chose and can state a ceiling for. |

## Red Flags

- A `DEBT:` marker with no ceiling or no upgrade trigger — it's an unlabeled TODO, fix the marker or drop it
- Ledger entries whose upgrade trigger has visibly already fired, sitting untriaged
- Markers left in place after the surrounding code was already properly fixed (dead markers)
- The ledger growing without any entries ever being retired — a sign shortcuts are being taken faster than resolved, or resolutions aren't cleaning up their markers
- A marker added long after the shortcut was committed, reconstructing a ceiling after the fact — the constraint reasoning is now a guess, not a decision

## Verification

After running the ledger process, confirm:

- [ ] Every marker found by the grep has all three fields: what, ceiling, upgrade trigger
- [ ] Entries are grouped by file with the oldest surfaced first
- [ ] Every entry was checked against its upgrade trigger; any that fired are flagged as due, not left blended in with active debt
- [ ] No marker corresponds to code that was already fixed (stale markers removed)
- [ ] The ledger's marker convention (prefix, required fields) is documented once, discoverable by anyone adding a new entry
