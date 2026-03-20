# analyze-enrichment

TRIGGER when: user says "analyze enrichment", "check extractor quality", "enrichment feedback analysis", or wants to identify failing extractors in the POI enrichment pipeline.

---

## What It Does

Analyzes accumulated enrichment feedback to identify which extraction functions (programmatic regex vs LLM) are failing and produces specific code fix recommendations.

## Prerequisites

- Feedback must exist in `enrichment_feedback` collection (with `fieldProvenance` data)
- Analysis results in `settings/enrichment_analysis` (from `analyzeEnrichmentFeedback` Cloud Function)
- If no analysis exists yet, trigger it first: call `analyzeEnrichmentFeedback` with `{force: true}`

## Steps

### 1. Load analysis data

Read `settings/enrichment_analysis` from Firestore. If the admin dashboard is running, the Cloud Function can be triggered from the browser console:

```js
const fn = firebase.functions().httpsCallable('analyzeEnrichmentFeedback');
await fn({ force: true });
```

Alternatively, read the raw feedback docs directly via Firebase Admin CLI or emulator.

### 2. Identify top issues

From the analysis, focus on entries where:
- `byField[field].bySource[source].badRate > 0.15` (high severity)
- `byField[field].bySource[source].total >= 5` (statistically meaningful)
- Source is `"programmatic"` (these require code changes, not prompt updates)

LLM-source issues are already handled by the self-improving instructions loop (`updateEnrichmentInstructions`). Focus this skill on **programmatic** failures.

### 3. Read extractor source code

Key files to analyze:
- `functions/src/enrichment/extractor.ts` — programmatic regex extraction (phones, emails, images, YouTube, Facebook, JSON-LD, Google Maps)
- `functions/src/enrichment/scraper.ts` — sub-page discovery regex
- `functions/src/enrichment/llm-extractor.ts` — `fixNightTimeErrors()`, verification logic

### 4. Cross-reference with enrichment_runs

For each flagged issue, read 2-3 example `enrichment_runs` docs where the field was rated "bad". Compare:
- What `programmaticValue` was extracted (or null = missed)
- What the website actually contains (check `scrapedUrls`)
- Whether the failure is a regex gap, a filtering false positive, or a structural parsing issue

### 5. Generate recommendations

For each issue, output:

```
ISSUE: [field] extraction — [description] (bad rate: X%, N samples)
SOURCE: [file:line] — [function name]
ROOT CAUSE: [specific regex/logic gap]
FIX: [code change description]
TEST: [ready-to-add test case]
```

### 6. Prioritize

Order recommendations by:
1. High severity (>15% bad rate) before medium (>10%)
2. Programmatic-only before shared (programmatic+LLM)
3. Higher sample count before lower

## Output Format

Terminal-friendly report with:
- Summary: total feedback count, issues found, top 3 extractors by bad rate
- Per-issue: file path, line number, root cause, fix, test case
- Optional: if the issue is in the LLM layer, note that it should be addressed via `settings/enrichment_instructions` instead

## Key Files

```
functions/src/enrichment/types.ts       # ExtractionSource, ExtractionProvenance types
functions/src/enrichment/extractor.ts   # Programmatic extraction (main target)
functions/src/enrichment/analysis.ts    # aggregateFeedback() pure function + Cloud Function
functions/src/enrichment/scraper.ts     # Sub-page discovery
functions/src/enrichment/llm-extractor.ts # LLM extraction + verification
```
