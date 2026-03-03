# start

Session startup briefing. Run at the beginning of a new conversation to quickly understand the project state.

---

## Steps

Run all of these in parallel (single message, multiple Bash calls), then present the summary.

### 1. Branch & working tree

```bash
git status --short --branch
git stash list
```

### 2. Recent commits (last 5 on current branch)

```bash
git log --oneline -5
```

### 3. Develop vs. main drift

```bash
git fetch origin --quiet
git rev-list --left-right --count origin/main...HEAD
```

Interpret: `<behind>\t<ahead>` — report how many commits ahead of main (unreleased) and behind (needs rebase).

### 4. Open PRs

```bash
gh pr list --state open --limit 5
```

### 5. CI status

```bash
gh run list --limit 3 --json status,conclusion,headBranch,event,createdAt --template '{{range .}}{{.headBranch}} {{.conclusion}} ({{.event}}, {{timeago .createdAt}}){{"\n"}}{{end}}'
```

### 6. Codebase orientation

Read `.claude/skills/codebase-map/SKILL.md` (the dispatcher page only, not the sub-pages).

---

## Output format

Present a compact summary like this:

```
## Session Briefing
- **Branch:** develop (clean, 3 ahead of main)
- **Last commits:** fix modal dialog, remove icon backgrounds, POI button layout
- **Open PRs:** none
- **CI:** main ✓ passing, develop ✓ passing
- **Unreleased:** 3 commits on develop ready for PR to main
```

Then state: "Ready to go. What are we working on?"

---

## Notes

- This is **read-only** — no changes to code, no commits, no deploys.
- If `gh` commands fail (not authenticated, no remote), skip those sections and note it.
- Do NOT read sub-pages of codebase-map — just the dispatcher. Sub-pages are read on-demand when working on a specific area.
