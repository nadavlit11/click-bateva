# enrich-pois

TRIGGER when: user says "enrich", "scrape POIs", "data collection", "enrich-pois", or wants to run/modify the POI data enrichment pipeline.

---

## What It Does

Scrapes POI websites to extract structured data and enrich Firestore `points_of_interest` documents. Uses Firecrawl for scraping, Claude Haiku for text extraction/verification, and Claude Vision for image ranking.

## Pipeline (5 stages per POI)

1. **Scrape** — Firecrawl API on homepage + auto-discovered sub-pages (contact/gallery/about, max 3 pages)
2. **Programmatic extraction** — zero-hallucination regex: Israeli phones, emails, YouTube, images (`<img>`, CSS `background-image`, `data-src`), Facebook, JSON-LD schema.org, Google Maps embeds
3. **LLM extraction** — Claude Haiku for opening hours (Hebrew day parsing, "בלילה" = AM fix), price (with context), WhatsApp
4. **Verification** — Layer A: programmatic (times in source, phone in source). Layer B: LLM grounding check (quote exact source text)
5. **Image ranking** — Claude Vision ranks candidates, filters logos/UI, picks best 5 content photos (downloads as base64 first since many sites block direct URL access)

## Key Files

```
scripts/enrich-pois.mjs          # Entry point — CLI args, CSV parsing, orchestration
scripts/lib/scraper.mjs           # Firecrawl API wrapper + sub-page discovery
scripts/lib/extractor.mjs         # Programmatic regex extraction
scripts/lib/llm-extractor.mjs     # Claude API extraction + verification + Vision ranking
scripts/lib/image-processor.mjs   # Download, validate, upload to Firebase Storage
scripts/lib/progress.mjs          # Resume state management
scripts/lib/report.mjs            # JSON + markdown report generation
scripts/input/                    # gitignored — CSV input files
scripts/output/                   # gitignored — reports, progress state
```

## Usage

```bash
# Dry run from CSV (id,link columns)
GOOGLE_APPLICATION_CREDENTIALS=./serviceAccount.json \
FIRECRAWL_API_KEY=fc-xxx \
ANTHROPIC_API_KEY=sk-ant-xxx \
node scripts/enrich-pois.mjs --dry-run --input scripts/input/test-pois.csv

# Apply approved report to Firestore
node scripts/enrich-pois.mjs --apply scripts/output/enrichment-report.json

# Full batch (all POIs with websites)
node scripts/enrich-pois.mjs --dry-run --all

# Resume interrupted run
node scripts/enrich-pois.mjs --dry-run --all --resume
```

## Data Safety

- **Fill-only-empty**: only updates fields that are currently null/empty in Firestore
- **Dry-run first**: generates JSON report + markdown summary for human review
- **Three-phase**: scrape → review report → apply
- **Resume support**: progress.json tracks completed/failed POIs

## Known Limitations & Gotchas

- **"בלילה" (nighttime) hours**: LLMs often convert "1 בלילה" (1 AM) to 23:00. `fixNightTimeErrors()` post-processes based on source text. Works for hours < 6; "12 בלילה" (midnight) needs manual correction.
- **Conflicting website data**: Some sites show different hours in different sections (menu vs contact page). The LLM picks one; manual review catches conflicts.
- **Hash-based SPAs**: Sites with `#gallery` navigation return the same HTML for all "pages". CSS `background-image` extraction helps but dynamic JS-loaded content may still be missed.
- **node-fetch v2**: Used as transitive dependency (CJS from ESM). Not in root package.json. Works on Node 17+ but ideally upgrade to Node 18+ with built-in fetch.
- **Images re-uploaded**: External image URLs are downloaded and re-uploaded to Firebase Storage `poi-media/` with token-based download URLs (matching existing `getDownloadURL` pattern).
- **CSV parser is naive**: Splits on commas, doesn't handle quoted fields. URLs with commas will break.

## Admin Dashboard Integration (COMPLETE)

**Architecture:**
- Cloud Function `enrichPoiFromWebsite` runs pipeline server-side (API keys as Firebase secrets)
- Admin clicks "העשרה מהאתר" button on PoiEditPage → modal shows results → cherry-pick fields → merge into form
- Feedback stored in `enrichment_feedback` collection (per-field thumbs up/down + free-text)
- Instructions stored in `settings/enrichment_instructions` doc (per-field rules)
- `updateEnrichmentInstructions` Cloud Function auto-updates rules after each feedback

**Key files (Cloud Functions):**
```
functions/src/enrichment/types.ts           # DayHours, ScrapedPage, EnrichmentResult
functions/src/enrichment/extractor.ts       # Programmatic extraction (22 unit tests)
functions/src/enrichment/scraper.ts         # Firecrawl web scraping
functions/src/enrichment/llm-extractor.ts   # Claude extraction + verification + Vision ranking (11 tests)
functions/src/enrichment/image-processor.ts # Download + validate + upload to Storage
functions/src/enrichment/index.ts           # Cloud Function orchestrator (13 tests)
```

**Key files (Admin UI):**
```
app/src/admin/components/EnrichModal.tsx    # Cherry-pick modal with feedback UI
```

**Secrets required:**
```bash
firebase functions:secrets:set FIRECRAWL_API_KEY
firebase functions:secrets:set ANTHROPIC_API_KEY
```
