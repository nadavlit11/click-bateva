# Infrastructure & Deploy

## Key Files

- `firebase.json` — hosting target (1 active site), functions source, Firestore/Storage rules, emulator ports
- `.firebaserc` — project aliases
- `firestore.rules` — Firestore Security Rules
- `storage.rules` — Cloud Storage Security Rules
- `firestore.indexes.json` — composite index definitions
- `.github/workflows/ci-cd.yml` — CI/CD pipeline
- `package.json` (root) — test scripts, dev deps, workspace-level commands

## Hosting Target

Single active site: `click-bateva` → https://click-bateva.web.app — serves map (`/`), admin (`/admin/*`), business (`/business/*`).

(`click-bateva-app` and `click-bateva-biz` Firebase Hosting sites still exist in the Firebase console but are not in `firebase.json` and are not deployed by CI.)

## Deploy Commands

```bash
# Build app first, then deploy:
firebase deploy --only hosting:click-bateva   # unified app

# Cloud Functions:
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
- CSP covers: Google Maps, Leaflet tiles (`*.tile.openstreetmap.org`), Nominatim geocoding, Cloud Functions endpoint, Firebase SDKs, Sentry, Google Analytics, YouTube iframe
- SPA rewrite: all routes → `/index.html`
- Asset caching: `/assets/**` gets `max-age=31536000, immutable`; HTML gets `no-cache`
- `Permissions-Policy: geolocation=(self)` — map uses browser geolocation

## Gotchas

- Emulator connection in apps is gated on `VITE_USE_EMULATOR === 'true'` (NOT `import.meta.env.DEV`)
- After changing Firestore rules, you MUST deploy them — undeployed rules silently block access
- Cloud Functions use `setGlobalOptions({ maxInstances: 10 })` to limit scaling
- `serviceAccount.json` is gitignored — needed for scripts like `set-admin.mjs`
- Build env var `VITE_GOOGLE_MAPS_API_KEY` is required (admin MapPicker + user-web FloatingSearch)
