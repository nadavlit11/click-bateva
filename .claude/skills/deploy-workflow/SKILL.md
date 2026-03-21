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

### 5. Verify jobs ran (not just CI kicked off)

```bash
gh run list --branch main --limit 1 --json databaseId --jq '.[0].databaseId'
# then:
gh run view <id> --json jobs --jq '.jobs[] | {name: .name, conclusion: .conclusion}'
```

Check that each expected job ran with `success` — not `skipped`. If CI-App or CI-Functions was skipped, that component was NOT deployed. A `skipped` job means the path filter didn't match — no deploy happened for that layer.

---

## Gotchas

- **Never push directly to main** — always go through a PR from develop
- **Always rebase from main first** — stale branches cause merge conflicts in CI
- **CI runs after merge** — no need to wait for CI before merging deploy PRs
- **Don't confuse with `/firebase-deploy`** — that skill is for emergency manual CLI deploys only
- **A failed CI job in a PR causes deploy-production to be SKIPPED entirely** — if CI-Functions fails but CI-App passed (or vice versa), neither layer gets deployed. The code lands on main but stays undeployed. Fix: create a new PR that touches the affected files to trigger a fresh deploy of each layer. Check past CI runs with `gh run view <id> --json jobs` to identify which components are stale.
