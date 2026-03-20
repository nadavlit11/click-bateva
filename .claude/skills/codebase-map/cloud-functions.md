# Cloud Functions

## Key Files

- `functions/src/index.ts` — exports all functions; Sentry init; `setGlobalOptions({ maxInstances: 10, region: "me-west1" })`
- `functions/src/auth.ts` — `onUserCreated` (v1 auth trigger) + `setUserRole` (v2 callable)
- `functions/src/business.ts` — `createBusinessUser` + `deleteBusinessUser` (v2 callables)
- `functions/src/agent.ts` — `createTravelAgent` + `deleteTravelAgent` (v2 callables, admin-only)
- `functions/src/crm.ts` — `createCrmUser` + `deleteCrmUser` (v2 callables, admin-only)
- `functions/src/email.ts` — `sendContactEmail` (v2 callable, CRM-authorized, nodemailer Gmail SMTP)
- `functions/src/users.ts` — `deleteContentManager` + `blockContentManager` (v2 callables, admin-only)
- `functions/src/backup.ts` — `dailyFirestoreExport` (REMOVED — replaced by native Firestore scheduled backups)
- `functions/src/audit.ts` — `auditPoiChanges` (v2 Firestore trigger on `points_of_interest`)
- `functions/src/enrichment/` — POI enrichment pipeline (ported from scripts/lib/):
  - `types.ts` — DayHours, ScrapedPage, EnrichmentResult interfaces
  - `extractor.ts` — programmatic regex extraction (phones, emails, images, etc.)
  - `scraper.ts` — Firecrawl API web scraping + sub-page discovery
  - `llm-extractor.ts` — Claude extraction, verification, Vision image ranking
  - `image-processor.ts` — download, validate, upload images to Storage
  - `index.ts` — `enrichPoiFromWebsite` + `updateEnrichmentInstructions` Cloud Functions
  - `analysis.ts` — `analyzeEnrichmentFeedback` Cloud Function (feedback aggregation by provenance source)
- `functions/src/__tests__/auth.unit.test.ts` — unit tests for auth functions (no emulator)
- `functions/src/__tests__/crm.unit.test.ts` — unit tests for CRM user management functions
- `functions/src/__tests__/users.unit.test.ts` — unit tests for user management functions
- `functions/src/__tests__/backup.unit.test.ts` — unit tests for daily export
- `functions/src/__tests__/audit.unit.test.ts` — unit tests for POI audit trigger
- `tests/integration/auth-functions.test.ts` — integration tests (emulator required)
- `functions/stryker.config.json` — mutation testing config for `auth.ts`

## Exported Functions

| Function | API | Trigger | Auth |
|---|---|---|---|
| `onUserCreated` | v1 `auth.user().onCreate` | New Firebase Auth user | N/A (trigger) |
| `setUserRole` | v2 `onCall({ cors: true })` | Admin callable | admin only |
| `createBusinessUser` | v2 `onCall({ cors: true })` | Admin callable | admin only |
| `deleteBusinessUser` | v2 `onCall({ cors: true })` | Admin callable | admin only |
| `deleteContentManager` | v2 `onCall({ cors: true })` | Admin callable | admin only |
| `blockContentManager` | v2 `onCall({ cors: true })` | Admin callable | admin only |
| `createTravelAgent` | v2 `onCall({ cors: true })` | Admin callable | admin only |
| `deleteTravelAgent` | v2 `onCall({ cors: true })` | Admin callable | admin only |
| `createCrmUser` | v2 `onCall({ cors: true })` | Admin callable | admin only |
| `deleteCrmUser` | v2 `onCall({ cors: true })` | Admin callable | admin only |
| `sendContactEmail` | v2 `onCall({ cors: true, enforceAppCheck: true })` | CRM callable | admin or crm_user |
| `auditPoiChanges` | v2 `onDocumentWritten` | POI create/update/delete | N/A (trigger) |
| `enrichPoiFromWebsite` | v2 `onCall({ cors: true, enforceAppCheck: true })` | Admin callable | admin only |
| `updateEnrichmentInstructions` | v2 `onCall({ cors: true, enforceAppCheck: true })` | Admin callable | admin only |
| `analyzeEnrichmentFeedback` | v2 `onCall({ cors: true, enforceAppCheck: true })` | Admin callable | admin only |

## Data Flow

```
onUserCreated (v1 trigger)
  ├─ Checks if claims.role already set (race guard vs createBusinessUser)
  ├─ If no role → sets standard_user claim + creates users/ doc
  └─ If role exists → skips (logs and returns)

setUserRole (v2 callable)
  ├─ Validates caller is admin
  ├─ Validates role is one of: admin, content_manager, business_user, standard_user
  └─ Updates BOTH users/ doc AND custom claims

createBusinessUser (v2 callable)
  ├─ Validates caller is admin
  ├─ Accepts email (real email, validated format) + password + business name
  ├─ Creates Firebase Auth user with the provided email
  ├─ Sets claims: { role: "business_user", businessRef: "/databases/(default)/documents/businesses/${uid}" }
  └─ Batch writes: users/ doc + businesses/ doc (with associatedUserIds: [uid])

deleteBusinessUser (v2 callable)
  ├─ Deletes Firebase Auth user (tolerates auth/user-not-found)
  └─ Batch deletes: users/ doc + businesses/ doc

deleteContentManager (v2 callable)
  ├─ Validates caller is admin + target has content_manager role
  ├─ Deletes Firebase Auth user (tolerates auth/user-not-found)
  └─ Deletes users/ doc

blockContentManager (v2 callable)
  ├─ Validates caller is admin + target has content_manager role
  ├─ Sets auth user disabled: true (tolerates already-disabled)
  └─ Updates users/ doc with blocked: true

createTravelAgent (v2 callable)
  ├─ Validates caller is admin
  ├─ Accepts email + password + optional name
  ├─ Creates Firebase Auth user (with displayName if name provided)
  ├─ Sets claims: { role: "travel_agent" }
  └─ Creates users/ doc (includes name: string | null)

deleteTravelAgent (v2 callable)
  ├─ Validates caller is admin + target has travel_agent role
  ├─ Deletes Firebase Auth user (tolerates auth/user-not-found)
  └─ Deletes users/ doc

createCrmUser (v2 callable)
  ├─ Validates caller is admin
  ├─ Accepts email + password + name (all required)
  ├─ Creates Firebase Auth user (with displayName)
  ├─ Sets claims: { role: "crm_user" }
  └─ Creates users/ doc (includes name)

deleteCrmUser (v2 callable)
  ├─ Validates caller is admin
  ├─ Deletes Firebase Auth user (tolerates auth/user-not-found)
  └─ Deletes users/ doc
```

## Infra Prerequisites

When a function depends on external infrastructure (GCS buckets, IAM roles, secrets), verify they exist before marking the feature done. Trigger the function once and check logs.

**Backups:** Native Firestore scheduled backups (daily, 7-day retention). No Cloud Function needed. The `dailyFirestoreExport` function was removed — use `gcloud firestore backups schedules list` to manage.
- Gen2 functions run on the **Compute Engine SA** (`576857518417-compute@developer.gserviceaccount.com`), not the App Engine SA — always check with `gcloud functions describe <name> --format="value(serviceConfig.serviceAccountEmail)"`

---

## Patterns & Conventions

- v2 `onCall` MUST include `{ cors: true }` — without it, calls from localhost and non-Firebase-Hosting origins fail with CORS error
- v1 used only for `onUserCreated` (auth triggers not available in v2 at time of writing)
- All callables validate: (1) authenticated, (2) admin role, (3) input types
- Sentry error reporting on unexpected errors via `Sentry.captureException`
- Valid roles: `admin`, `content_manager`, `business_user`, `travel_agent`, `standard_user`, `crm_user`
- Firestore triggers (`onDocumentWritten`) and scheduled functions (`onSchedule`) do NOT need `enforceAppCheck` or `cors` — those are `onCall`-only options

## Gotchas

- `onUserCreated` fires for ALL new users including those created by `createBusinessUser` — must check if role already set to avoid overwriting business_user claim with standard_user
- `businessRef` claim is a STRING, not a Firestore path — format: `/databases/(default)/documents/businesses/${uid}`
- `createBusinessUser` sets claims BEFORE `onUserCreated` fires, but there's a race — the guard in `onUserCreated` handles it
- Test runner: Jest (NOT Vitest) — `functions/jest.config.unit.js` for unit tests
- Mutation testing score is 69% (infra/logger lines are expected survivors)
- **MUST run `npm run build` before deploying new functions** — `firebase deploy` reads compiled JS, not TS. New exports in `index.ts` are silently skipped if JS is stale.
- `deleteContentManager`/`blockContentManager` validate target user has `content_manager` role before acting
- All function unit tests (173 total) must pass before deploy: `cd functions && npm test`
- **`JSON.stringify` does NOT handle Firestore `Timestamp` objects** — they serialize to `{}` (no enumerable properties). When comparing Firestore field values, use `.toMillis()` for Timestamps and check `latitude`/`longitude` for GeoPoints.
- **Module-level `process.env` reads break tests** — env vars set in `beforeEach` run after module load. Read `process.env` inside the handler function, not at module scope.
