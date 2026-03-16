# Infrastructure & Deploy

## Key Files

- `firebase.json` — hosting targets (2 active sites), functions source, Firestore/Storage rules, emulator ports
- `.firebaserc` — project aliases
- `firestore.rules` — Firestore Security Rules
- `storage.rules` — Cloud Storage Security Rules
- `firestore.indexes.json` — composite index definitions
- `.github/workflows/ci-cd.yml` — CI/CD pipeline
- `package.json` (root) — test scripts, dev deps, workspace-level commands

## Hosting Target

Two active sites:
- `click-bateva` → https://click-bateva.web.app — serves map (`/`), admin (`/admin/*`), business (`/business/*`). Custom domain: https://clickbateva.co.il
- `click-bateva-crm` → https://click-bateva-crm.web.app — standalone CRM app

Legacy sites `click-bateva-app` and `click-bateva-biz` were deleted from Firebase console (IDs permanently retired, cannot be recreated).

### Custom domain checklist
When adding a new custom domain to Firebase Hosting, update ALL of these:
1. **GCP API Key referrers** — add `newdomain.com/*` to Browser Key HTTP referrers in [GCP Credentials](https://console.cloud.google.com/apis/credentials)
2. **reCAPTCHA v3 domains** — add `newdomain.com` in [reCAPTCHA admin](https://www.google.com/recaptcha/admin)
3. **Firebase Auth authorized domains** — Firebase Console → Authentication → Settings
4. Missing any one causes cascading 403 errors: Installations → App Check → Auth → Firestore all fail

## Deploy Commands

```bash
# Build app first, then deploy:
firebase deploy --only hosting:click-bateva   # unified app

# Cloud Functions (IMPORTANT: rebuild first when adding new functions):
cd functions && npm run build   # compile TS → JS (deploy reads compiled JS)
firebase deploy --only functions

# Security Rules:
firebase deploy --only firestore:rules
firebase deploy --only storage
```

## CI/CD Pipeline (`.github/workflows/ci-cd.yml`)

- `ci-app`: runs in `app/` — npm ci → lint (continue-on-error for feat/fix branches) → test → build → upload `app-dist` artifact
- `ci-functions`: runs in `functions/` — lint → test → build
- `deploy-production` (main branch only): downloads `app-dist` → deploys `hosting:click-bateva`
- `deploy-preview` (develop/feat/fix branches): deploys preview channel to `click-bateva`

## Emulators

| Service | Port |
|---|---|
| Auth | 9099 |
| Functions | 5001 |
| Firestore | 8080 |
| Storage | 9199 |
| Emulator UI | auto |

Start: `firebase emulators:start`
Firestore only: `firebase emulators:start --only firestore`

## Test Commands

```bash
# App (Vitest):
cd app && npm test

# Cloud Functions (Jest, no emulator):
cd functions && npm test

# Firestore Rules (Jest, needs emulator on 8080):
cd firestore-tests && npm test

# Mutation testing:
npm run test:mutate              # all
npm run test:mutate:user-web     # user-web only
npm run test:mutate:functions    # functions only
```

## Patterns & Conventions

- CSP is `Content-Security-Policy-Report-Only` (not enforcement) — violations logged but don't block
- CSP covers: Google Maps, Leaflet tiles (`*.tile.openstreetmap.org`), Nominatim geocoding, Cloud Functions endpoint, Firebase SDKs, Sentry, Google Analytics, YouTube iframe, reCAPTCHA script+connect (App Check), Firebase App Check API
- SPA rewrite: all routes → `/index.html`
- Asset caching: `/assets/**` gets `max-age=31536000, immutable`; HTML gets `no-cache`
- `Permissions-Policy: geolocation=(self)` — map uses browser geolocation

## Error Reporting (Sentry)

- DSN: configured via `VITE_SENTRY_DSN` in `app/.env.local`
- Region: **DE** (API base: `https://de.sentry.io`, org slug: `click-bateva`)
- Auth token in `.mcp.json` (Sentry MCP server config)
- `app/src/lib/errorReporting.ts` — `reportError(error, { source, extra })` wraps `Sentry.captureException`
- Sentry disabled in non-production builds (checked in `main.tsx`)
- Known suppressed errors: `permission-denied` in `usePois` (logged as warning), `already-exists` in `BusinessModal`

## Chunk Loading Resilience

- `lazyRetry()` helper in `app/src/user-web/MapApp.tsx` — auto-reloads page once on stale chunk import failures
- Uses `sessionStorage("chunk-reload")` guard to prevent infinite reload loops
- Needed because assets use `Cache-Control: immutable` — after a deploy, users with cached HTML reference old chunk hashes
- Apply this pattern to any new `React.lazy()` imports

## Gotchas

- Emulator connection in apps is gated on `VITE_USE_EMULATOR === 'true'` (NOT `import.meta.env.DEV`)
- After changing Firestore rules, you MUST deploy them — undeployed rules silently block access
- Cloud Functions use `setGlobalOptions({ maxInstances: 10 })` to limit scaling
- `serviceAccount.json` is gitignored — needed for scripts like `set-admin.mjs`
- Build env var `VITE_GOOGLE_MAPS_API_KEY` is required (admin MapPicker + user-web FloatingSearch)
