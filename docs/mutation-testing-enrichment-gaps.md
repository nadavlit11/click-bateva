# Enrichment — Mutation Testing Gaps

## Context

Stryker mutation testing runs daily in CI (`mutation-testing.yml`).
The enrichment pipeline files are included in scope (`src/**/*.ts`) but
have very low mutation scores, dragging the overall score below the 65%
threshold.

The 4 original Cloud Function files (agent, crm, users, business) were
fixed and now score 83–87%. The enrichment files are the remaining gap.

## Files needing tests

| File | Mutation score | Covered | Survived | No coverage |
|------|---------------|---------|----------|-------------|
| `enrichment/image-processor.ts` | 0.00% | 0.00% | 11 | 39 |
| `enrichment/scraper.ts` | 0.00% | 0.00% | 11 | 105 |
| `enrichment/llm-extractor.ts` | 10.38% | 47.37% | 30 | 203 |
| `enrichment/index.ts` | 34.54% | 78.82% | 18 | 109 |
| `enrichment/analysis.ts` | 60.71% | 64.15% | 38 | 6 |
| `enrichment/extractor.ts` | 62.28% | 66.77% | 106 | 23 |
| `enrichment/types.ts` | 0.00% | 0.00% | 0 | 1 |
| `email.ts` | 0.00% | 0.00% | 0 | 67 |

## What to do

For each file above, create unit tests in `functions/src/__tests__/` that
kill surviving mutants. The patterns that kill the most mutants:

1. **Assert error messages** — not just error codes. Stryker mutates
   string literals; if your test only checks the code, the string mutation
   survives.
2. **Assert Sentry.captureException calls** — verify the error object and
   tags are passed correctly.
3. **Assert logger.info/error calls** — verify the log message string and
   the structured data object.
4. **Test `.trim()` / `.toLowerCase()`** — pass inputs with leading/trailing
   whitespace or mixed case and assert the output is normalized.
5. **Test generic error catch blocks** — don't only test known error codes
   (e.g. `auth/email-already-exists`). Also test with an unknown error to
   cover the else/fallback branch.
6. **Test conditional branches** — for every `if`, test both the truthy and
   falsy path.

## Test infrastructure

- Test config: `functions/jest.config.unit.js`
- Stryker config: `functions/stryker.config.json`
- Run tests: `cd functions && npx jest --config jest.config.unit.js`
- Run mutation tests: `cd functions && npx stryker run`
- Existing enrichment tests to reference:
  - `functions/src/__tests__/enrichment-index.unit.test.ts`
  - `functions/src/__tests__/extractor.unit.test.ts`
  - `functions/src/__tests__/llm-extractor.unit.test.ts`
  - `functions/src/__tests__/analysis.unit.test.ts`
- All mocks follow the same pattern: declare mock fns before imports,
  `jest.mock(...)` the firebase-admin modules, then import the source.

## Target

Overall mutation score must be ≥ 65% (the `thresholds.break` in
`stryker.config.json`). Currently at 46.88%.
