# phase-retro

Use this skill to capture lessons learned and keep skills sharp.

Two tiers — use the right one based on context:

---

## Subphase retro (lightweight — do this immediately after any subphase)

While the details are fresh, ask:
- Did anything go wrong or require an unexpected fix?
- Is there a gotcha worth adding to an existing skill?
- Did a checklist step turn out to be wrong or incomplete?

If yes → update the relevant skill file now. No commit needed yet.

---

## Phase retro (full — do this at the end of a complete phase)

### 1. Reflect

- What patterns came up repeatedly that could be a reusable skill?
- What would have been useful to know at the start of this phase?
- Did anything deviate from the plan, and why?

### 2. Update existing skills

Review every skill touched during this phase:
- Add new gotchas or edge cases discovered
- Fix steps that turned out to be wrong or incomplete
- Remove steps that are no longer relevant

Key skills to always check:
- `update-docs` — did we miss updating any doc?
- `review-rules` — did we find any rule gaps or permission errors?
- `new-collection` — did adding a collection require steps not in the guide?

### 3. Create new skills if needed

Worth creating if:
- A multi-step process was done manually and will recur
- A common mistake needs a checklist to prevent it
- A deploy/test workflow has specific steps worth encoding

### 4. Check for missing LLD docs

Was an LLD doc created for any new app or major feature area built this phase?
- `docs/lld-user-web.md` — user-facing map app ✅
- `docs/lld-admin-dashboard.md` — admin dashboard ✅
- Future: `docs/lld-business-dashboard.md` when Phase 3 starts

**If an LLD was skipped:** create it now (post-hoc is better than never), then add a reminder that next time, LLDs should be written **at the end of planning, before implementation starts**.

### 5. Update `docs/progress.md`

- Mark completed steps as ✅ Done
- Add notes on deviations from the work plan

### 6. Commit everything

```bash
git add .claude/skills/ docs/progress.md
git commit -m "chore: phase retro — update skills and progress after phase <N>"
```
