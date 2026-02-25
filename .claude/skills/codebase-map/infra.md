# Infrastructure & Deploy

## Key Files

- `firebase.json` — hosting targets (3 sites), functions source, Firestore/Storage rules, emulator ports
- `.firebaserc` — project aliases
- `firestore.rules` — Firestore Security Rules
- `storage.rules` — Cloud Storage Security Rules
- `firestore.indexes.json` — composite index definitions
- `.github/workflows/` — CI/CD (mutation testing)
- `package.json` (root) — test scripts, dev deps, workspace-level commands

## Hosting Targets

| Site ID | App | URL | Build output |
|---|---|---|---|
| `click-bateva` | Admin dashboard | https://click-bateva.web.app | `apps/admin/dist` |
| `click-bateva-app` | User web app | https://click-bateva-app.web.app | `apps/user-web/dist` |
| `click-bateva-biz` | Business dashboard | https://click-bateva-biz.web.app | `apps/business/dist` |

## Deploy Commands

```bash
# Apps (build first, then deploy):
firebase deploy --only hosting:click-bateva       # admin
firebase deploy --only hosting:click-bateva-app   # user web
firebase deploy --only hosting:click-bateva-biz   # business

# Cloud Functions:
firebase deploy --only functions

# Security Rules:
firebase deploy --only firestore:rules
firebase deploy --only storage
```

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
# User-web (Vitest):
cd apps/user-web && npm test

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

- All hosting targets include security headers (X-Frame-Options, CSP-Report-Only, HSTS, etc.)
- SPA rewrites: all routes → `/index.html`
- Asset caching: `/assets/**` gets `max-age=31536000, immutable`; HTML gets `no-cache`
- Sentry error reporting on both frontend (user-web) and backend (functions)

## Gotchas

- Emulator connection in apps is gated on `VITE_USE_EMULATOR === 'true'` (NOT `import.meta.env.DEV`)
- After changing Firestore rules, you MUST deploy them — undeployed rules silently block access
- Cloud Functions use `setGlobalOptions({ maxInstances: 10 })` to limit scaling
- `serviceAccount.json` is gitignored — needed for scripts like `set-admin.mjs`
