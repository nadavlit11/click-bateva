---
name: deploy-workflow
description: >
  TRIGGER when: user says "deploy", "ship it", "push to production", "create deploy PR",
  or wants to release develop to main. Handles the full workflow: rebase, PR creation,
  and merge. Do NOT confuse with firebase-deploy (emergency manual CLI deploy commands).
---

# deploy-workflow

Automates the develop → main deployment pipeline. All deployments go through CI/CD (GitHub Actions) — this skill creates the PR and merges it.

---

## Steps

### 1. Pre-flight checks

```bash
git status --short         # must be clean — no uncommitted changes
git fetch origin --quiet
git rebase origin/main     # resolve any conflicts before PR
```

If there are conflicts, resolve them and commit before proceeding.

### 2. Check what's being deployed

```bash
git log --oneline origin/main..HEAD   # commits being released
```

Review the list — this becomes the PR body.

### 3. Create the PR

```bash
gh pr create --base main --head develop \
  --title "Deploy: <summary of changes>" \
  --body "<generated from git log>"
```

### 4. Merge immediately

Per project convention, deploy PRs are merged right away — no need to wait for CI:

```bash
gh pr merge <PR-number> --merge
```

### 5. Verify

```bash
gh run list --branch main --limit 1   # check CI kicked off
```

---

## Gotchas

- **Never push directly to main** — always go through a PR from develop
- **Always rebase from main first** — stale branches cause merge conflicts in CI
- **CI runs after merge** — no need to wait for CI before merging deploy PRs
- **Don't confuse with `/firebase-deploy`** — that skill is for emergency manual CLI deploys only
