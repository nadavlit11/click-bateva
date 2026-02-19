# cloud-functions

Reference for writing, configuring, and testing Firebase Cloud Functions in this project.

---

## firebase.json required config

Every time a new capability is added, make sure `firebase.json` has the relevant block:

```json
{
  "functions": [{ "source": "functions", "codebase": "default" }],
  "firestore": { "rules": "firestore.rules", "indexes": "firestore.indexes.json" },
  "storage": { "rules": "storage.rules" },
  "emulators": {
    "auth":      { "port": 9099 },
    "functions": { "port": 5001 },
    "firestore": { "port": 8081 },
    "ui":        { "enabled": true }
  }
}
```

> ⚠️ Port 8080 is taken by Tomcat on this machine — Firestore emulator uses **8081**.

---

## firebase-admin v13 — use modular imports

**Never** use the legacy namespace pattern — it crashes at runtime:
```ts
// ❌ WRONG — admin.firestore is undefined as a namespace
import * as admin from "firebase-admin";
admin.firestore.FieldValue.serverTimestamp();
```

**Always** use modular imports:
```ts
// ✅ CORRECT
import { initializeApp, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

if (getApps().length === 0) initializeApp();
const db = getFirestore();
const adminAuth = getAuth();
```

---

## v1 vs v2 triggers

- Auth triggers (`auth.user().onCreate`) are **v1 only** — import from `firebase-functions/v1`
- Callable functions use **v2** — import from `firebase-functions/v2/https`

```ts
import { auth } from "firebase-functions/v1";           // Auth trigger (v1)
import { onCall, HttpsError } from "firebase-functions/v2/https"; // Callable (v2)
```

---

## Emulator prerequisites

- Requires **Java 21+** — Firebase Emulator will refuse to start on Java 17 or below
- Install: `brew install --cask temurin@21`
- Start: `firebase emulators:start --only auth,functions,firestore`
- UI: http://127.0.0.1:4000

---

## Testing Auth triggers

**Creating users via the Emulator Suite UI does NOT trigger `onUserCreated`.**
You must use the Firebase client SDK:

```js
import { createUserWithEmailAndPassword } from "firebase/app";
await createUserWithEmailAndPassword(auth, email, password); // ← triggers onUserCreated
```

---

## onUserCreated race condition when testing

`onUserCreated` runs async after user creation. If you set a custom claim immediately after `createUserWithEmailAndPassword`, the trigger may fire later and overwrite it.

**Fix:** wait for the trigger to complete before overriding claims:

```js
await createUserWithEmailAndPassword(auth, email, password);
await new Promise((r) => setTimeout(r, 3000)); // wait for trigger
await setCustomClaimViaEmulator(uid, { role: "admin" }); // now safe to override
```

---

## Setting custom claims in emulator tests

The Firebase client SDK can't set custom claims — use the Auth emulator's REST bypass:

```js
await fetch(
  `http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/projects/${PROJECT_ID}/accounts:update`,
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer owner", // emulator bypass
    },
    body: JSON.stringify({
      localId: uid,
      customAttributes: JSON.stringify({ role: "admin" }),
    }),
  }
);
// Then force-refresh the token to pick up the new claim:
await signInWithEmailAndPassword(auth, email, password);
await user.getIdToken(true);
```

---

## Dual role system

Roles are stored in **two places** that must stay in sync:

| Store | Used by | Set by |
|-------|---------|--------|
| Firestore `users/{uid}.role` | Security rules (`isAdmin()`, etc.) | `onUserCreated` + `setUserRole` |
| Custom claim `{ role }` on Auth token | Front-end + callable function auth checks | `onUserCreated` + `setUserRole` |

`setUserRole` updates both atomically. When testing manually, make sure both are set.
