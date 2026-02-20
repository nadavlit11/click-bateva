# bug-retro

Run this after fixing any non-trivial bug. The goal is to make sure the same bug can never slip through again.

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

## Step 4 — Commit

```bash
git add .claude/skills/code-review/SKILL.md
git commit -m "chore: encode bug lesson — <one-line summary of the rule added>"
```

---

## Checklist

- [ ] Bug described: symptom + root cause + fix
- [ ] Root cause classified
- [ ] Concrete rule added to the right code-review subagent
- [ ] Committed
