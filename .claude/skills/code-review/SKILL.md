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
> - Firestore Security Rules comparing a custom claim to a path literal (e.g. `request.auth.token.someRef == /databases/$(database)/documents/...`): custom claims are always **strings**, so this comparison is always false. Use string concatenation instead: `request.auth.token.someRef == '/databases/' + database + '/documents/...'`
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
> - Firestore collection names: `points_of_interest`, `categories`, `subcategories`, `icons`, `users`, `businesses`, `clicks`
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
> - Firebase emulator connection must be gated on `VITE_USE_EMULATOR === 'true'` (NOT `import.meta.env.DEV`). Using `DEV` connects every local dev server to the emulator even when QA-ing against production data.
> - Firebase Functions v2 `onCall` does NOT add CORS headers for arbitrary origins by default (unlike v1). Every `onCall` from `firebase-functions/v2/https` must include `{ cors: true }`: `onCall({ cors: true }, async (request) => { ... })`. Without this, calls from localhost and non-Firebase-Hosting origins fail with a CORS error.
> - The `onUserCreated` Auth trigger fires for ALL new users, including those created by admin callable functions (e.g. `createBusinessUser`). Any `setCustomUserClaims` call in `onUserCreated` must first check `adminAuth.getUser(uid).customClaims?.role` and skip if a role is already set — otherwise it races with and overwrites claims set by the callable.
> - Demo mode mock data: once production Firestore has been seeded with real catalog data (categories, subcategories), all mock POIs must reference those real seeded document IDs. Never merge parallel MOCK_CATEGORIES/MOCK_SUBCATEGORIES arrays alongside real Firestore data — this causes duplicate entries in the UI.
> - After adding a new Firestore collection, always deploy the updated security rules: `firebase deploy --only firestore:rules`. A rule written in the file but not deployed silently blocks all reads/writes.
> - When removing a concept/entity from the codebase (e.g., deleting a collection, removing a feature), search `.claude/skills/` for references too — skill files encode collection names, field lists, and permission matrices that become stale if not updated.
> - When adding a new field to `PoiEditableFields` (business-editable fields), the `firestore.rules` `affectedKeys().hasOnly(...)` allowlist for `points_of_interest` updates MUST also be updated to include the new field. Without this, business-user saves silently fail with permission-denied.
> - When saving new optional fields to Firestore, use `.trim() || null` (not just `.trim()`) to avoid writing empty strings. Follow the same pattern used by `price`.
> - Hardcoded category IDs must match actual Firestore document IDs (from WordPress import), NOT old mock data. Real IDs: `accommodation`, `food`, `offroad`, `attractions`, `wineries`, `water`, `venues`, `shows`, `hiking`. Common mistake: using `'restaurants'` (old mock) instead of `'food'` (real).
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
> **RTL / layout correctness:**
> - Carousels, sliders, or any component using `translateX` to scroll through flex children must have `direction: ltr` on the track element. In a `dir="rtl"` document, RTL flex reverses physical item order, making `translateX(-N%)` navigate the wrong direction.
> - When a new field is added to a TypeScript type that maps to Firestore, check that: (1) the Firestore data hook (`snapshotTo*`) maps it, (2) every test fixture that constructs that type includes the field, (3) every UI component that could display it actually wires it up.
> - In RTL UIs, "collapsed" state indicators should point LEFT (◂), not right (▸). The ▸ character signals "expand right" which is the wrong direction in Hebrew/Arabic layouts.
> - Mobile viewport height: always use `100dvh` (not `100vh`) in full-screen layouts — `dvh` accounts for mobile browser chrome (URL bar, nav). When a fixed overlay (bottom sheet, tab bar) sits at the bottom, subtract its height from `max-h` calculations: `max-h-[calc(100dvh-120px-2rem)] md:max-h-[calc(100dvh-2rem)]`.
> - Scroll indicators (arrows/fade that show "more content below"): initialize by checking actual scroll state on mount, not by assuming an initial value. Use `useEffect(() => { requestAnimationFrame(checkScroll); }, [expanded])` so the indicator reflects real overflow after layout settles.
> - Footer shadows over a scroll container: a `box-shadow` on a footer sibling needs `position: relative; z-index: N` to paint on top of the adjacent scroll area. Without z-index, the scroll content may render on top and hide the shadow.
> - After a refactor that removes intermediate variable aliases (e.g., `effectiveFoo = foo`), do a replace_all to update all consumers. Dead aliases left behind cause TS errors when the alias is later deleted.
> - Absolute-positioned action buttons (delete/remove) within a repeated list of items must use the same corner (`top-1 right-1` or `top-1 left-1`) across all items. Mixing corners for the same action in the same component is a visual inconsistency bug.
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
> **Mutation testing coverage:**
> - These files are under Stryker mutation testing: `apps/user-web/src/lib/filterPois.ts`, `apps/user-web/src/lib/openingStatus.ts`, `functions/src/auth.ts`
> - When logic in these files changes, flag that `npm run test:mutate` should be run to verify the mutation score hasn't regressed
> - When new pure-logic utility files are added with tests, suggest adding them to the relevant `stryker.config.json` `mutate` array
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

## Step 4 — Run relevant tests

Before committing, run whichever test suite covers the changed code:

```bash
# Cloud Function changes:
cd functions && npm test

# Firestore Security Rules changes:
cd firestore-tests && npm test   # requires: firebase emulators:start --only firestore

# User-web logic changes (filterPois etc.):
cd apps/user-web && npm test
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
