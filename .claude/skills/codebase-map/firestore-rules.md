# Firestore Security Rules

## Key Files

- `firestore.rules` — all security rules (root of monorepo)
- `storage.rules` — Cloud Storage rules (root of monorepo)
- `firestore-tests/src/firestore.rules.test.ts` — 40+ integration tests (Jest + emulator)
- `firestore-tests/package.json` — standalone package with `@firebase/rules-unit-testing`
- `firestore-tests/jest.config.js` — test config

## Rules Structure

```
Helper functions: isSignedIn, userRole, isAdmin, isContentManager, isAdminOrContentManager, isBusinessUser

points_of_interest/{poiId}
  read:   active == true OR admin/cm OR (business_user && businessId == uid)
  create: admin/cm
  delete: admin/cm
  update: admin/cm OR (business_user && in associatedUserIds && affectedKeys allowlist)

clicks/{clickId}
  create: anyone (validated: poiId, categoryId, timestamp — exact keys, string types, size limits)
  read:   admin only
  delete: admin only

categories/{id}     — read: anyone, write: admin/cm
subcategories/{id}  — read: anyone, write: admin/cm
icons/{id}          — read: anyone, write: admin/cm

businesses/{businessId}
  write: admin only
  read:  admin OR (business_user && uid == businessId)

users/{userId}
  read/write: admin
  read: own doc
  update: own doc BUT cannot change role or businessRef
```

## Patterns & Conventions

- Role checks use custom claims (`request.auth.token.role`), NOT Firestore reads for the role itself
- Business POI update uses `get()` to read associatedUserIds from the business document
- `affectedKeys().hasOnly(...)` controls which fields business users can modify
- Storage rules use `request.auth.token.role` (custom claims) — NEVER `firestore.get()`

## Gotchas

- Custom claims are STRINGS — comparing to a path literal is always false. Use string concatenation: `'/databases/' + database + '/documents/businesses/' + businessId`
- After adding a new field to `PoiEditableFields`, the `affectedKeys().hasOnly(...)` allowlist MUST also be updated
- After modifying rules, MUST deploy: `firebase deploy --only firestore:rules`
- A rule written in the file but not deployed silently blocks all reads/writes
- clicks documents require EXACTLY `poiId`, `categoryId`, `timestamp` — no extra fields allowed

## Running Tests

```bash
# Start emulator (required):
firebase emulators:start --only firestore

# Run tests (in a separate terminal):
cd firestore-tests && npm test
```
