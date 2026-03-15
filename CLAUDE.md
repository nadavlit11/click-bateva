# CLAUDE.md — click-bateva

## Commit Workflow Rules

**Every change** (feature, bug fix, one-liner) must go through:
1. `/code-review` skill — all 4 subagents must PASS before committing
2. Run relevant tests — whichever suite covers the changed code must pass
3. Commit only after both pass

**Bug fixes** additionally require `/bug-retro` to encode the lesson.

**Retros are automatic** — after every `feat:` or `fix:` commit with logic changes, IMMEDIATELY run a quick retro before doing anything else. Do NOT wait for the user to ask. This is the last step of every feature/fix, right after commit.

No exceptions — not even for "obviously safe" changes.

**Always run `cd app && npx tsc -b --noEmit` before committing app changes** — catches missing fields that local IDE may not flag but CI's `tsc -b` will. The Poi type has 4+ manual constructors (useFirestoreData mapper, business PoiEditPage preview, filterPois test mkPoi, admin PoiEditPage) — all must be updated when adding fields.

**Always run `npm run lint` before committing** in the relevant package (especially `functions/`). CI enforces `max-len: 120` and double quotes. Test files with inline data objects easily exceed 120 chars — extract data into a `const` variable to keep lines short.

**Large features: commit incrementally.** When implementing a feature with multiple steps (e.g., data model → rules → functions → admin UI → user-web), run `/code-review` and commit after each logical step — NOT one giant review at the end. This catches lint errors, pattern violations, and dead code early, avoids massive diffs that are harder to review, and keeps CI green throughout.

**Requirements clarification rule:** When a user request is ambiguous about *where* in the UI something should go or *what the output should do*, ask before implementing. Confirm the **location** and **purpose** of the feature with the user.

**CSS layout rule — think before coding:** When adding conditional UI elements near existing elements, STOP and think about the layout approach BEFORE writing code. Prefer flow-based layout over absolute positioning. Never apply background color to a wrapper that has empty reserved space. Never use `boxShadow` as a border substitute. If the first approach causes layout shift — step back and reconsider instead of patching with more CSS hacks.

---

## Codebase Navigation Rule

Before launching an Explore agent or reading code to understand an area, read the `/codebase-map` skill and the relevant sub-page. Only launch Explore agents for details not covered there. **After exploring, update the relevant sub-page.**

**Targeted exploration:** List the specific gaps the map left unanswered — don't give broad "explore everything about X" prompts.

---

## Planning Rule: Write LLD before implementing

When planning a new app or a major feature area, create `docs/lld-<name>.md` **before starting implementation**.

Existing LLDs (follow these for format):
- `docs/lld-user-web.md` — user-facing map app
- `docs/lld-admin-dashboard.md` — admin dashboard
- `docs/lld-business-dashboard.md` — business dashboard

---

## Branching & Deployment Workflow

- **`develop`** — local development branch. All work happens here.
- **`main`** — production branch. Deploys automatically via GitHub Actions CI/CD on push.
- **To deploy:** create a Pull Request from `develop` → `main` and merge it. Never push directly to `main`.
- **Before opening a PR:** always rebase from main first: `git fetch origin && git rebase origin/main`
- **No need to wait for CI in PRs** — it runs in the GitHub Actions run afterwards.
- **Do NOT deploy locally** — all deployments go through CI/CD.

---

## Weekly Skills & Memory Audit

On the first conversation of each week, run a quick audit of skills and memory files:
1. Check line counts — flag files that grew >20% above baseline (CLAUDE.md: 65, MEMORY.md: 45, code-review: 218, cloud-functions: 188)
2. Search for file paths referenced in skills that no longer exist in the repo
3. Search for rules that appear in multiple files (duplication)
4. Remove stale content, consolidate duplicates
