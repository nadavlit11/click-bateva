# update-docs

Use this skill whenever a feature, schema, or behavior change has been decided. It ensures all project docs stay in sync.

## Checklist

Work through each file and update as needed:

### 1. `docs/atdd.md`
- Add or update acceptance test scenarios for the changed feature
- Each scenario must follow Given/When/Then format
- Add new scenarios for new user-facing behaviors
- Remove or update outdated scenarios

### 2. `docs/hld.md`
- Update the affected collection's schema table (fields, types, notes)
- Update the collections list under Cloud Firestore if a collection was added/removed
- Update the permission matrix table if roles/access changed
- Update the Key Data Flows section if data flow changed
- Update Google Maps Platform, Storage bucket structure, or Auth claims if relevant

### 3. `docs/lld-user-web.md`
- Update directory structure if files were added/removed/renamed
- Update TypeScript types if interfaces changed
- Update state architecture if App.tsx state changed
- Update component props if component APIs changed
- Update data layer hooks if Firestore hooks changed

### 4. `docs/lld-admin-dashboard.md`
- Update directory structure if files were added/removed/renamed
- Update routing if routes were added/removed
- Update TypeScript types if interfaces changed
- Update Firestore collections table if collection usage changed

### 5. `docs/lld-business-dashboard.md`
- Update if any business dashboard behavior or types changed

## Common mistakes to check
- `clicks` is a top-level collection, not a subcollection
- `icons` has `path` (not `url`, not `storagePath`)
- `categories` has `color`, `iconId`, `iconUrl`
- Roles: `admin`, `content_manager`, `business_user`, `standard_user`
- Storage rules use `request.auth.token.role` (custom claims), NOT `firestore.get()`
- Firestore rules use `request.auth.token.role` (custom claims) for role checks — NOT `get()` on the users collection
- Subcategory groups are free-text (not hardcoded enums) — admin uses `<input>` + `<datalist>` autocomplete
