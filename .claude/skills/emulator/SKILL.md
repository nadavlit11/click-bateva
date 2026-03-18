---
name: emulator
description: >
  TRIGGER when: user needs to start Firebase emulators, seed emulator data, debug emulator
  issues, says "start emulators", "seed data", "emulator not working", or is running
  integration/rules tests that require the emulator.
---

# emulator

Consolidated reference for Firebase Emulator setup, seeding, and troubleshooting.

---

## Quick start

```bash
# All emulators (auth + functions + firestore + storage):
firebase emulators:start

# Firestore only (for rules tests):
firebase emulators:start --only firestore

# Auth + Functions + Firestore (for integration tests):
firebase emulators:start --only auth,functions,firestore
```

Emulator UI: http://127.0.0.1:4000

---

## Port table

| Service | Port |
|---------|------|
| Auth | 9099 |
| Functions | 5001 |
| Firestore | 8080 |
| Storage | 9199 |
| Emulator UI | 4000 |

---

## Seeding data

```bash
# Main app seed (POIs, categories, subcategories, icons, users):
node scripts/seed-emulator.mjs

# CRM seed (contacts, tasks, CRM users):
node scripts/seed-crm-emulator.mjs
```

Emulators must be running before seeding.

---

## Seed data gotchas

- **`location` must be `{lat, lng}`** — plain object, NOT a Firestore `GeoPoint`. The app expects `poi.location.lat` / `poi.location.lng` directly.
- **`subcategoryIds` must contain valid IDs** — `filterPois` auto-selects subcategories per category, so POIs with empty `subcategoryIds` get filtered out and become invisible.
- **`maps` field structure** — POIs need `maps: { agents: { active: true }, groups: { active: true } }` to appear in the default map queries.
- **`mapType: "default"`** for POIs that should be visible on the main map. `mapType: "families"` only shows in the families query.
- **`active: true`** — POIs with `active: false` are filtered out by security rules for non-admin users.

---

## App connection gating

```ts
// ✅ CORRECT — explicit opt-in
if (import.meta.env.VITE_USE_EMULATOR === 'true') {
  connectFirestoreEmulator(db, "127.0.0.1", 8080);
}

// ❌ WRONG — connects ALL dev servers to emulator, even when QA-ing against prod
if (import.meta.env.DEV) { ... }
```

Start the dev server with emulators: `VITE_USE_EMULATOR=true npm run dev`

---

## Prerequisites

- **Java 21+** required — Firebase Emulator refuses to start on Java 17 or below
- Install: `brew install --cask temurin@21`
- Verify: `java -version`

---

## Auth emulator: setting custom claims

The Firebase client SDK can't set custom claims. Use the Auth emulator's REST bypass:

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
// Then force-refresh the token:
await signInWithEmailAndPassword(auth, email, password);
await user.getIdToken(true);
```

---

## Testing with emulators

- **Auth trigger (`onUserCreated`):** Creating users via Emulator UI does NOT trigger it. Use `createUserWithEmailAndPassword` from the client SDK.
- **`onUserCreated` race:** Wait 3s after user creation before overriding claims — the trigger fires async and may overwrite your claims.
- **Unique app names:** Use `initializeApp({...}, \`test-\${Date.now()}\`)` to prevent "app already exists" errors across test files.
