# Subagent D — Test Coverage

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
> - Stryker mutation testing uses **glob patterns** — all files in `app/src/lib/` (except tests, firebase.ts, constants.ts, errorReporting.ts) and `functions/src/` (except tests, index.ts) are auto-included
> - When logic in these files changes, flag that `npm run test:mutate` should be run to verify the mutation score hasn't regressed
> - New pure-logic utility files are auto-included by the glob — no manual config update needed
> - **New exports from mutation-tested files need their own direct tests**: if a new function is exported from a file under Stryker mutation testing (e.g., `openingStatus.ts`), its mutations will NOT be killed by tests that only exercise the existing functions — even if both functions share similar logic. Every new exported function in a mutated file needs at least one test that directly imports and calls it, covering key branches (open/closed, null/string inputs, boundary times).
>
> For each piece of logic that requires a test, check if a corresponding test file exists in the diff (or already exists in the repo if you can verify). Output PASS if all required tests are present or if nothing testable was added. Output FAIL with a specific list of missing tests otherwise.
>
> Output: PASS or FAIL, followed by a numbered list of findings (empty list if PASS).
>
> Diff:
> [paste diff]
