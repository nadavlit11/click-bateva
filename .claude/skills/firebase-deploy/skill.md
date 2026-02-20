# firebase-deploy

Cheatsheet for deploying this project's Firebase services.

---

## Deploy targets

| Command | What it deploys |
|---------|----------------|
| `firebase deploy --only hosting:click-bateva` | Admin app (apps/admin/dist) |
| `firebase deploy --only hosting:click-bateva-app` | User-web app (apps/user-web/dist) |
| `firebase deploy --only hosting` | Both hosting sites |
| `firebase deploy --only firestore:rules,firestore:indexes,storage` | Rules only |
| `firebase deploy --only functions` | Cloud Functions only |
| `firebase deploy` | Everything |

**Always build before deploying hosting:**
```bash
cd apps/admin && npm run build
cd apps/user-web && npm run build
```

---

## Multi-site hosting setup

This project has two Firebase Hosting sites:

| Site ID | URL | App |
|---------|-----|-----|
| `click-bateva` | https://click-bateva.web.app | Admin dashboard |
| `click-bateva-app` | https://click-bateva-app.web.app | User-facing map app |

**firebase.json structure** for multiple sites (use an array, not an object):
```json
"hosting": [
  {
    "site": "click-bateva",
    "public": "apps/admin/dist",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "rewrites": [{ "source": "**", "destination": "/index.html" }]
  },
  {
    "site": "click-bateva-app",
    "public": "apps/user-web/dist",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "rewrites": [{ "source": "**", "destination": "/index.html" }]
  }
]
```

**To add a new site:**
```bash
firebase hosting:sites:create <site-id>
```

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

- Admin: https://click-bateva.web.app
- User app: https://click-bateva-app.web.app
- Firebase Console: https://console.firebase.google.com/project/click-bateva
