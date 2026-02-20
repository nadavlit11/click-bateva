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

**Minimum bar**: every Cloud Function gets a unit test file. Every rules change gets a rules test.

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

apps/user-web/src/
└── lib/
    └── filterPois.test.ts         ← Vitest unit tests (co-located with source)
```

Integration tests that use the **Firebase client SDK** (`firebase/app`, `firebase/auth`, etc.) live at the **project root** `tests/integration/` — not inside `functions/` — because the client SDK is installed at root.

**React app tests** use **Vitest** (co-located with source as `*.test.ts`). Run with `npm test` from `apps/user-web/`.

---

## How to run tests

| Command | What it runs | Emulator? |
|---|---|---|
| `cd functions && npm test` | Cloud Function unit tests | No |
| `npm run test:integration` | Integration tests (functions + rules) | Yes |
| `cd apps/user-web && npm test` | Vitest unit tests | No |

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

## Running emulators for tests

Emulators must be running before integration or rules tests:

```bash
firebase emulators:start --only auth,functions,firestore
```

Tests use unique email suffixes (`${Date.now()}`) to avoid cross-test email conflicts.
