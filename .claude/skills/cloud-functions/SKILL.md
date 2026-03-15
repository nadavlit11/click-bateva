# cloud-functions

Reference for writing, configuring, and testing Firebase Cloud Functions in this project.

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

- Requires **Java 21+** — Firebase Emulator will refuse to start on Java 17 or below
- Install: `brew install --cask temurin@21`
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

---

## Jest test setup

### Config files

```
functions/
├── jest.config.unit.js         # no emulator, runs *.unit.test.ts
├── jest.config.integration.js  # emulator required, runs *.integration.test.ts
└── tsconfig.test.json          # overrides NodeNext → CommonJS for Jest
```

### ts-jest — use `transform`, NOT `globals`

`globals: { 'ts-jest': { ... } }` is **deprecated** in ts-jest v29+. Always use:

```js
module.exports = {
  testEnvironment: "node",
  transform: { "^.+\\.tsx?$": ["ts-jest", { tsconfig: "tsconfig.test.json" }] },
  moduleNameMapper: { "^(\\.{1,2}/.*)\\.js$": "$1" }, // strips .js from NodeNext imports
};
```

### tsconfig.test.json — required to fix NodeNext/Jest incompatibility

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": { "module": "CommonJS", "moduleResolution": "node" },
  "include": ["src"]
}
```

### Unit test boilerplate — mocking Admin SDK

`auth.ts` calls `getFirestore()` and `getAuth()` at **module load time**. Key rules:

1. Use `jest.mock()` (auto-hoisted) for all three modules: `firebase-admin/firestore`, `firebase-admin/auth`, `firebase-admin/app`
2. `import` the module under test AFTER the `jest.mock()` calls
3. `getApps` mock must return a non-empty array to skip `initializeApp()`

See `functions/src/__tests__/auth.unit.test.ts` for the full working pattern.

### Calling v2 callables in unit tests

```ts
// ✅ Use .run() directly — do NOT use testEnv.wrapV2()
const result = await setUserRole.run(makeRequest({}));
```

### Integration test — unique Firebase app names

Prevents "app already exists" errors when multiple test files run:

```ts
const app = initializeApp({ projectId: "click-bateva", apiKey: "test-key" }, `test-${Date.now()}`);
```

---

## Business user custom claims

Business users require TWO custom claims, not just `role`:

```ts
const businessRef = `/databases/(default)/documents/businesses/${uid}`;
await adminAuth.setCustomUserClaims(uid, { role: "business_user", businessRef });
```

The `businessRef` claim is set for auditability and mirrored in the `users/{uid}` doc. The actual `businesses` read rule uses UID comparison:
```
allow read: if isAdmin() || (isBusinessUser() && request.auth.uid == businessId)
```

**Gotcha:** Setting only `{ role: "business_user" }` without `businessRef` will break the business dashboard — `AuthGuard` expects `businessRef` to resolve the business document path.

The `businesses/{uid}` document must also include `associatedUserIds: [uid]` — checked by the POI update rule:
```
get(...businesses/...).data.associatedUserIds.hasAny([request.auth.uid])
```

Mirror `businessRef` in the `users/{uid}` Firestore doc for auditability.

---

## Dual role system

Roles are stored in **two places** that must stay in sync:

| Store | Used by | Set by |
|-------|---------|--------|
| Firestore `users/{uid}.role` | Admin UI display only | `onUserCreated` + `setUserRole` |
| Custom claim `{ role }` on Auth token | Firestore rules + storage rules + callable function auth checks + front-end | `onUserCreated` + `setUserRole` |

`setUserRole` updates both atomically. When testing manually, make sure both are set.

**Important:** Firestore Security Rules use `request.auth.token.role` (custom claims), NOT `get()` on the users collection. This avoids failures when the user document doesn't exist yet (e.g., new users before the trigger fires).
