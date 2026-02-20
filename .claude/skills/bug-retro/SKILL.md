# bug-retro

Run this after fixing **any** bug — including small ones. The goal is to make sure the same bug can never slip through again, and that the fix didn't break anything.

> **Rule:** No bug fix gets committed without (1) running the code-review skill and (2) running relevant tests. No exceptions.

---

## Step 1 — Describe the bug in one sentence

Write down:
- What was broken (symptom)
- What caused it (root cause)
- What fixed it

Example: *"Carousel showed the wrong image first (symptom) because `dir=rtl` reverses flex item order (root cause); fixed by adding `direction: ltr` to the track element."*

---

## Step 2 — Classify the root cause

Pick the category that best fits:

| Category | Examples |
|----------|---------|
| **Type / data contract** | Field added to TS type but not mapped in Firestore hook, test fixture, or UI |
| **Platform gotcha** | RTL flex direction, JWT custom claims as strings not paths, emulator env var scope |
| **Missing wiring** | Field exists in DB but never read/displayed in a component |
| **Silent failure** | Promise rejected without logging, error swallowed in catch |
| **Security rule logic** | Wrong type comparison, missing auth check, overly permissive wildcard |
| **Environment assumption** | Dev flag used where an explicit opt-in is needed |

---

## Step 3 — Add a rule to the code-review skill

Open `.claude/skills/code-review/SKILL.md` and add a bullet to the subagent that would have caught this bug:

- **Security issue** → Subagent A
- **Project pattern violated** → Subagent B
- **Code quality / completeness / layout** → Subagent C

Write the rule as a concrete check, not a vague principle:

**Bad:** "Be careful with RTL layouts."
**Good:** "Carousels using `translateX` on a flex track must have `direction: ltr` on the track element — in a `dir=rtl` document, flex reverses physical item order."

If no existing subagent fits, add the rule to Subagent C.

---

## Step 4 — Code review the fix

Run the `/code-review` skill on the bug fix diff before committing. Do not skip this even for one-line changes.

---

## Step 5 — Run relevant tests

```bash
# Cloud Function changes:
cd functions && npm test

# Firestore Security Rules changes:
cd firestore-tests && npm test   # requires: firebase emulators:start --only firestore

# User-web logic changes:
cd apps/user-web && npm test
```

Run whichever test suite covers the changed code. All tests must pass before committing.

---

## Step 6 — Commit (fix + lesson together)

```bash
# Stage the fix files + the updated code-review skill
git add <fix files> .claude/skills/code-review/SKILL.md
git commit -m "fix: <description>

chore: encode bug lesson — <one-line summary of the rule added>"
```

---

## Checklist

- [ ] Bug described: symptom + root cause + fix
- [ ] Root cause classified
- [ ] Code-review skill run on the fix — all subagents PASS
- [ ] Relevant tests run and passing
- [ ] Concrete rule added to the right code-review subagent
- [ ] Committed
