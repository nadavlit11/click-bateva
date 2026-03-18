---
name: firebase-deploy
description: >
  TRIGGER when: user needs emergency manual deploy commands, asks about hosting targets,
  deploy syntax, or Firebase deploy gotchas. CLI cheatsheet — normal deployments go
  through CI/CD (GitHub Actions), not manual CLI.
---

# firebase-deploy

Cheatsheet for deploying this project's Firebase services.

---

## Deploy targets

| Command | What it deploys |
|---------|----------------|
| `firebase deploy --only hosting:click-bateva` | Unified app (app/dist) — map + admin + business |
| `firebase deploy --only firestore:rules,firestore:indexes,storage` | Rules only |
| `firebase deploy --only functions` | Cloud Functions only |
| `firebase deploy` | Everything |

**CRITICAL: Build before deploying hosting.** Deploying without building pushes stale artifacts.
```bash
cd app && npm run build
```
Then deploy:
```bash
firebase deploy --only hosting:click-bateva
```

**NOTE: All deployments normally go through CI/CD (GitHub Actions).** Only use manual deploys for emergencies.

---

## Single-site hosting setup

This project has one Firebase Hosting site:

| Site ID | URL | Contents |
|---------|-----|----------|
| `click-bateva` | https://click-bateva.web.app | Unified app (map `/`, admin `/admin/*`, business `/business/*`) |

Source: `app/dist` (built by `cd app && npm run build`)

---

## Gotchas

### Interrupted deploy leaves hosting unfinalized
If `firebase deploy` is interrupted mid-way (e.g., functions error), the hosting upload may complete but the release won't finalize. Site stays on old version.
**Fix:** run `firebase deploy --only hosting` separately after the other services succeed.

### Cannot change Cloud Function trigger type
Once deployed, Firebase blocks changing a function's trigger type (e.g., `auth.user().onCreate` → `beforeUserCreated`). Error:
> "Changing from a background triggered function to ... is not allowed. Please delete your function and create a new one instead."
**Fix:** delete the function from [Firebase Console → Functions](https://console.firebase.google.com), then redeploy.

### Gen1 functions: max Node 22
`auth.user().onCreate` (Gen1) does not support Node 24. Set `"node": "22"` in `functions/package.json`.

### First admin bootstrap
The `scripts/set-admin.mjs` script sets the `admin` custom claim directly via Admin SDK. Run it once to bootstrap the first admin user (no circular dependency):
```bash
GOOGLE_APPLICATION_CREDENTIALS=./serviceAccount.json node scripts/set-admin.mjs <uid>
```
The user must sign out and back in for the token to refresh.

---

## Firebase Hosting URLs

- Unified app: https://click-bateva.web.app (map + admin + business)
- Firebase Console: https://console.firebase.google.com/project/click-bateva
