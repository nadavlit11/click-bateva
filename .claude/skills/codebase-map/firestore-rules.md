# Firestore Security Rules

## Key Files

- `firestore.rules` — all security rules (root of monorepo)
- `storage.rules` — Cloud Storage rules (root of monorepo)
- `firestore-tests/src/firestore.rules.test.ts` — 78 integration tests (Jest + emulator)
- `firestore-tests/package.json` — standalone package with `@firebase/rules-unit-testing`
- `firestore-tests/jest.config.js` — test config

## Rules Structure

```
Helper functions: isSignedIn, userRole, isAdmin, isContentManager, isAdminOrContentManager, isBusinessUser, isTravelAgent, isCrmUser, isCrmAuthorized

points_of_interest/{poiId}
  read:   admin/cm OR (travel_agent && maps.agents.active == true) OR (business_user && businessId == uid) OR maps.groups.active == true
  create: admin/cm
  delete: admin ONLY (content managers CANNOT delete)
  update: admin/cm OR (business_user && in associatedUserIds && affectedKeys allowlist)

clicks/{clickId}
  create: anyone EXCEPT admin/content_manager (blocked) and business_user on own POI (get() check on poi.businessId == auth.uid). Validated: poiId, categoryId, timestamp — exact keys, string types, size limits
  read:   admin only
  delete: admin only

categories/{id}     — read: anyone, write: admin/cm
subcategories/{id}  — read: anyone, write: admin/cm
icons/{id}          — read: anyone, write: admin/cm

businesses/{businessId}
  write: admin only
  read:  admin OR (business_user && uid == businessId)

crm_contacts/{contactId}
  read:   admin/crm_user
  create: admin/crm_user (hasOnly field validation + createdBy == auth.uid)
  update: admin/crm_user (affectedKeys hasOnly: name, businessName, phone, email, updatedAt)
  delete: admin only
  └─ activity_log/{logId}
       read:   admin/crm_user
       create: admin/crm_user (hasOnly + createdBy == auth.uid)
       delete: admin only

crm_tasks/{taskId}
  read:   admin/crm_user
  create: admin/crm_user (hasOnly field validation + createdBy == auth.uid)
  update: admin/crm_user (affectedKeys hasOnly — cannot change createdBy/createdByEmail/createdAt)
  delete: admin only

users/{userId}
  read/write: admin
  read: own doc
  read: crm_user (all docs — for assignee picker)
  update: own doc BUT cannot change role or businessRef
```

## Patterns & Conventions

- Role checks use custom claims (`request.auth.token.role`), NOT Firestore reads for the role itself
- Business POI update uses `get()` to read associatedUserIds from the business document
- `affectedKeys().hasOnly(...)` controls which fields business users can modify
- Storage rules use `request.auth.token.role` (custom claims) — NEVER `firestore.get()`

## Gotchas

- Custom claims are STRINGS — comparing to a path literal is always false. Use string concatenation: `'/databases/' + database + '/documents/businesses/' + businessId`
- POIs now have a `maps` nested field: `{ agents: { price, active }, groups: { price, active } }`. The read rule uses per-map active checks instead of a single top-level `active` field.
- `isTravelAgent()` helper checks `request.auth.token.role == 'travel_agent'`
- After adding a new field to `PoiEditableFields`, the `affectedKeys().hasOnly(...)` allowlist MUST also be updated
- After modifying rules, MUST deploy: `firebase deploy --only firestore:rules`
- A rule written in the file but not deployed silently blocks all reads/writes
- clicks documents require EXACTLY `poiId`, `categoryId`, `timestamp` — no extra fields allowed
- POI delete is admin-only (split from create rule). Content managers can create but NOT delete POIs.
- Business user POI update allowlist includes: `whatsapp`, `iconId`, `iconUrl` (added in UI/UX batch)

## Running Tests

```bash
# Start emulator (required):
firebase emulators:start --only firestore

# Run tests (in a separate terminal):
cd firestore-tests && npm test
```
