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

Launch all four at the same time with the Task tool:

### Subagent A — Security Review

Prompt:
> Review the following git diff for security issues. Check for:
> - Hardcoded secrets, API keys, or credentials
> - Command injection, XSS, SQL/NoSQL injection risks
> - Firebase Security Rule gaps: missing auth checks, overly permissive rules, missing field validation on writes
> - Any logic that lets unauthenticated users read or write data they shouldn't
> - Exposed internal data structures in API responses
>
> Output: PASS or FAIL, followed by a numbered list of findings (empty list if PASS).
>
> Diff:
> [paste diff]

### Subagent B — Project Pattern Consistency

Prompt:
> Review the following git diff for consistency with this project's patterns.
>
> Key patterns to enforce:
> - Firestore collection names: `points_of_interest`, `categories`, `tags`, `icons`, `users`, `businesses`, `clicks`
> - `clicks` is a TOP-LEVEL collection (never a subcollection)
> - `icons` documents have `path` field (NOT `url`, NOT `storagePath`)
> - `categories` documents have `color`, `iconId`, `iconUrl` fields
> - Roles: `admin`, `content_manager`, `business_user`, `standard_user` (no other values)
> - Storage rules use `request.auth.token.role` (custom claims) — NEVER `firestore.get()`
> - Firestore rules use `get(/databases/$(database)/documents/users/$(request.auth.uid))` for role checks
> - Denormalize fields (e.g. `iconUrl` on categories) rather than doing extra reads at query time
> - `clicks` documents must have exactly: `poiId`, `categoryId`, `timestamp`
> - `businesses` documents must have `associatedUserIds: string[]` (checked by POI update rule)
> - `createBusinessUser` Cloud Function must set BOTH `role` AND `businessRef` custom claims; `businessRef` format: `/databases/(default)/documents/businesses/${uid}`
>
> Output: PASS or FAIL, followed by a numbered list of findings (empty list if PASS).
>
> Diff:
> [paste diff]

### Subagent C — Code Quality

Prompt:
> Review the following git diff for code quality issues. Flag both over-engineering AND under-engineering.
>
> **Over-engineering (too much complexity):**
> - Abstractions, helpers, or utilities created for a single use
> - Dead code: unused variables, functions, imports
> - Premature generalization: designing for hypothetical future requirements not in the work plan
> - Unnecessary backwards-compatibility shims or feature flags
> - Validation in the wrong place: only validate at system boundaries (user input, external APIs) — don't re-validate internal data
>
> **Under-engineering (missing structure that should be there):**
> - Repeated logic (3+ similar lines) that should be extracted into a shared function
> - Shared utilities, types, or Firebase config that should live in `shared/` but were duplicated
> - React patterns that should be used but weren't: custom hooks for reusable stateful logic, component decomposition for reused UI, context for app-wide state
> - Firebase SDK patterns skipped in favor of raw fetch or manual workarounds
> - TypeScript types missing where they'd prevent bugs (any used where a proper type exists or is obvious)
>
> **Missing error handling:**
> - Unhandled promise rejections
> - Uncaught Firebase errors at system boundaries
>
> Output: PASS or FAIL, followed by a numbered list of findings (empty list if PASS).
>
> Diff:
> [paste diff]

### Subagent D — Test Coverage

Prompt:
> Review the following git diff and determine whether the new logic has adequate test coverage.
>
> **What must be tested:**
> - Cloud Functions (callable + triggers): every exported function needs a unit test covering the happy path and key error cases
> - `filterPois` and other pure utility functions: unit tests for each logical branch
> - Firestore Security Rules changes: integration test using the emulator for each new rule or rule change (allow + deny case)
>
> **What does NOT need tests (acceptable to skip):**
> - React UI components (no component tests in this project)
> - Firebase config / boilerplate files (`firebase.ts`, `main.tsx`, etc.)
> - Type-only files (`types/index.ts`)
> - Simple CRUD pages that only wire existing SDK calls (Firestore `getDocs`/`onSnapshot`/`updateDoc` with no business logic)
> - Routing and layout scaffolding
>
> For each piece of logic that requires a test, check if a corresponding test file exists in the diff (or already exists in the repo if you can verify). Output PASS if all required tests are present or if nothing testable was added. Output FAIL with a specific list of missing tests otherwise.
>
> Output: PASS or FAIL, followed by a numbered list of findings (empty list if PASS).
>
> Diff:
> [paste diff]

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

## Step 4 — Commit and push

Once all subagents pass:

```bash
git commit -m "<type>: <description>"
git push
```

Always push immediately after committing.
