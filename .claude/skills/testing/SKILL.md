---
name: testing
description: >
  TRIGGER when: user asks "what tests to write", "how to test this", "run tests", or is adding
  Cloud Functions, Firestore rules, or lib/ utilities. Decision matrix for test type, locations,
  and run commands. Covers unit tests, integration tests, Stryker mutation testing, and CRAP analysis.
---

# testing

Every feature must ship with tests. Tests are written **alongside the feature**, not deferred to Phase 5.

---

## Rule: what tests to write per feature type

| Feature type | Unit tests | Integration tests | Rules tests |
|---|---|---|---|
| Cloud Function (callable / trigger) | ✅ validation logic, error cases | ✅ end-to-end against emulator | — |
| Firestore Security Rules change | — | — | ✅ all affected collections × roles |
| New Firestore collection | — | — | ✅ add to `tests/rules/*.rules.test.ts` |
| React component | ✅ pure logic extracted to functions, rendering | — | — |
| Pure utility / filter function | ✅ all filter combinations | — | — |

**Minimum bar**: every Cloud Function gets a unit test file. Every rules change gets a rules test. Every new `lib/` utility gets a co-located `.test.ts` file — no exceptions for "small helpers."

---

## Test locations

```
functions/
└── src/__tests__/
    ├── auth.unit.test.ts          ← Cloud Function unit tests (no emulator)
    └── auth.integration.test.ts   ← Cloud Function integration tests (emulator) [OPTIONAL — prefer root]

tests/
├── integration/
│   └── auth-functions.test.ts     ← Integration tests using Firebase client SDK
└── rules/
    ├── setup.ts                   ← shared initializeTestEnvironment
    └── *.rules.test.ts            ← Firestore security rules tests

app/src/
└── **/*.test.ts                   ← Vitest unit tests (co-located with source)
```

Integration tests that use the **Firebase client SDK** (`firebase/app`, `firebase/auth`, etc.) live at the **project root** `tests/integration/` — not inside `functions/` — because the client SDK is installed at root.

**React app tests** use **Vitest** (co-located with source as `*.test.ts`). Run with `npm test` from `app/`.

---

## How to run tests

| Command | What it runs | Emulator? |
|---|---|---|
| `cd functions && npm test` | Cloud Function unit tests | No |
| `npm run test:integration` | Integration tests (functions + rules) | Yes |
| `cd app && npm test` | Vitest unit tests | No |

Start emulators: `firebase emulators:start --only auth,functions,firestore`

---

## Checklist when adding a Cloud Function

- [ ] `functions/src/__tests__/<name>.unit.test.ts` — unit tests for all validation/error paths
- [ ] `tests/integration/<name>.test.ts` — integration tests for the happy path + key error cases
- [ ] Both test files committed in the same PR as the function

## Checklist when changing Firestore rules

- [ ] `tests/rules/<collection>.rules.test.ts` exists and covers the changed collection
- [ ] All 4 roles tested: `admin`, `content_manager`, `business_user`, `standard_user` / unauthenticated
- [ ] `withSecurityRulesDisabled` used for seeding test data (so rules don't block setup)
- [ ] Tests committed in the same PR as the rules change

---

## Checklist when adding a new lib/ utility

- [ ] Co-located `.test.ts` file with tests covering all branches
- [ ] Stryker glob auto-includes it (verify file isn't in the exclude list in `app/stryker.config.json`)
- [ ] Run `npm run crap` — no function scores above 30

---

## CRAP (Change Risk Anti-Patterns) analysis

Run `npm run crap` from monorepo root. Analyzes all exported functions in `app/src/lib/` and computes:

- **Cyclomatic complexity** via ts-morph AST analysis
- **Branch coverage** from Vitest coverage JSON
- **CRAP score**: `comp² × (1 - cov/100)³ + comp`

Threshold: **30**. Functions above 30 are too complex for their coverage level — either simplify the code or add more tests.

---

## Mutation testing (Stryker)

Stryker configs use **glob patterns** — new files in `app/src/lib/` and `functions/src/` are auto-included. No need to manually update the `mutate` array.

Run: `npm run test:mutate` (both packages) or `:user-web` / `:functions` suffix for one package.

---

## Running emulators for tests

Emulators must be running before integration or rules tests:

```bash
firebase emulators:start --only auth,functions,firestore
```

Tests use unique email suffixes (`${Date.now()}`) to avoid cross-test email conflicts.
