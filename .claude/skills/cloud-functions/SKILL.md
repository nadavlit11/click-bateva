---
name: cloud-functions
description: >
  TRIGGER when: writing or modifying Firebase Cloud Functions, user mentions onCall, auth triggers,
  custom claims, business user setup, or Cloud Function tests. Reference for v1/v2 triggers,
  Admin SDK patterns, Jest test setup, and business user claims.
---

# cloud-functions

Reference for writing, configuring, and testing Firebase Cloud Functions in this project.

For detailed sub-topics, read the relevant reference file:

| Topic | File |
|-------|------|
| Jest test setup, mocking, ts-jest config | `references/jest-setup.md` |
| Business user claims, dual role system | `references/business-claims.md` |

---

## firebase.json required config

Verify `firebase.json` has `functions`, `firestore`, `storage`, `hosting`, and `emulators` blocks. See the existing file for full config.

---

## firebase-admin v13 — use modular imports

**Never** use `import * as admin from "firebase-admin"` — it crashes at runtime (`admin.firestore` is undefined).

**Always** use modular imports: `firebase-admin/app`, `firebase-admin/auth`, `firebase-admin/firestore`. See `functions/src/auth.ts` for the canonical pattern.

---

## v1 vs v2 triggers

- Auth triggers (`auth.user().onCreate`) are **v1 only** — import from `firebase-functions/v1`
- Callable functions use **v2** — import from `firebase-functions/v2/https`

```ts
import { auth } from "firebase-functions/v1";           // Auth trigger (v1)
import { onCall, HttpsError } from "firebase-functions/v2/https"; // Callable (v2)
```

**CRITICAL:** When changing a function's trigger type, delete the old function from Firebase Console first — redeploy won't update the trigger type.

Gen1 auth triggers max Node 22 (not 24). Check `engines.node` in `functions/package.json`.

---

## Emulator prerequisites

See the `/emulator` skill for full emulator setup, seeding, and troubleshooting.

Quick reference:
- Requires **Java 21+**
- Start: `firebase emulators:start --only auth,functions,firestore`
- UI: http://127.0.0.1:4000

---

## Testing Auth triggers

Creating users via the Emulator Suite UI does NOT trigger `onUserCreated`. Use the Firebase client SDK's `createUserWithEmailAndPassword` from `firebase/auth` instead.

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
