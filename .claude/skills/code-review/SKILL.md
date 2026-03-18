---
name: code-review
description: >
  Run before every code commit. Acts as a gate — do not commit if any subagent returns FAIL.
  TRIGGER when: about to commit, user says "review"/"commit", or has staged changes.
  Skip for: pure doc updates, config-only changes, chore commits with no logic changes.
---

# code-review

Run before every code commit. Acts as a gate — do not commit if any subagent returns FAIL.

**Skip for:** pure doc updates, config-only changes, chore commits with no logic changes.

---

## Step 1 — Get the diff

```bash
git status          # check for untracked files that should be staged
git diff --staged   # review what's already staged
```

Stage any missing files before reviewing. **Always check `git status` first** — untracked files won't appear in the diff and are easy to miss before committing. Pass the staged diff output to all subagents.

---

## Step 2 — Spawn subagents in parallel

Launch all four at the same time with the Task tool. Read the full prompt for each subagent from its sub-file:

| Subagent | Prompt file | Focus |
|----------|-------------|-------|
| A — Security | `subagents/security.md` | Secrets, injection, Firebase rule gaps, data protection regressions |
| B — Patterns | `subagents/patterns.md` | Collection names, roles, custom claims, CSP, emulator gating |
| C — Code Quality | `subagents/code-quality.md` | Over/under-engineering, RTL layout, modal state-reset, React patterns |
| D — Test Coverage | `subagents/test-coverage.md` | Missing tests, mutation testing, Stryker coverage |

---

## Step 3 — Aggregate results

| Subagent | Result |
|----------|--------|
| A — Security | PASS / FAIL |
| B — Patterns | PASS / FAIL |
| C — Code Quality | PASS / FAIL |
| D — Test Coverage | PASS / FAIL |

**If all PASS** → proceed to commit.

**If any FAIL** → fix all findings (or write the missing tests), re-stage, and re-run this skill before committing.

---

## Step 4 — Run relevant tests

Before committing, run whichever test suite covers the changed code:

```bash
# Cloud Function changes:
cd functions && npm test

# Firestore Security Rules changes:
cd firestore-tests && npm test   # requires: firebase emulators:start --only firestore

# User-web logic changes (filterPois etc.):
cd app && npm test
```

All tests must pass. If any fail, fix them before proceeding.

---

## Step 4.5 — Update docs (if behavior changed)

If the code changes affect any documented behavior — data model, UI flows, component APIs, routing, filtering logic, or admin features — run the `/update-docs` skill before committing. Skip this step for pure refactors, test-only changes, or config tweaks that don't change documented behavior.

**Codebase map check:** If this change modifies component structure, data flow, key file paths, or introduces new patterns/gotchas, update the relevant `/codebase-map` sub-page (`.claude/skills/codebase-map/*.md`) before committing.

---

## Step 5 — Commit and push

Once all subagents pass AND tests pass:

```bash
git commit -m "<type>: <description>"
git push
```

Always push immediately after committing.
