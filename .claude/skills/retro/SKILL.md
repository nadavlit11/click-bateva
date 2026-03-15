# retro

Use this skill to capture lessons learned and keep skills sharp.

Two tiers — use the right one based on the size of the change:

---

## Quick retro (after small features, bug fixes, refactors)

While the details are fresh, ask:
- Did anything go wrong or require an unexpected fix?
- Is there a gotcha worth adding to an existing skill?
- Did a checklist step turn out to be wrong or incomplete?
- Could we create or update something (a skill, memory entry, codebase-map page, utility) that would make a similar task faster next time?
- Before adding a rule, check if an existing rule already covers the same scenario — update it instead of adding a duplicate.

If yes → update the relevant skill file now. No commit needed yet.

---

## Full retro (after large features or multi-commit work)

### 1. Reflect

- What patterns came up repeatedly that could be a reusable skill?
- What would have been useful to know at the start of this work?
- Did anything deviate from the plan, and why?

### 2. Update existing skills

Review every skill touched during this work:
- Add new gotchas or edge cases discovered
- Fix steps that turned out to be wrong or incomplete
- **Deduplication check:** Before adding a new rule, search MEMORY.md and code-review/SKILL.md for existing rules that cover the same scenario. If found: update the existing rule instead of adding a new one. If the new rule supersedes an old one, remove the old one.
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

### 4. Look for future investments

Beyond new skills, think broadly: memory entries, codebase-map pages, shared utilities, test helpers, deploy scripts, documentation.

The question: **"If a new conversation started this exact work from scratch, what would have saved the most ramp-up time or prevented the most friction?"**

If something comes to mind → create or update it now as part of this retro.

### 5. Update codebase-map

Review the `/codebase-map` sub-pages (`.claude/skills/codebase-map/*.md`) for the areas touched:
- Update key file lists if files were added, renamed, or removed
- Update data flow diagrams if component structure changed
- Add new patterns or gotchas discovered
- Remove outdated information

### 6. Check for missing LLD docs

Was an LLD doc created for any new app or major feature area?
- `docs/lld-user-web.md` — user-facing map app
- `docs/lld-admin-dashboard.md` — admin dashboard
- `docs/lld-business-dashboard.md` — business dashboard

**If an LLD was skipped:** create it now (post-hoc is better than never), then add a reminder that next time, LLDs should be written **at the end of planning, before implementation starts**.

### 7. Commit everything

```bash
git add .claude/skills/ docs/
git commit -m "chore: retro — update skills and docs after <summary>"
```
