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

### 3. `docs/work-plan.md`
- Update or add the relevant phase step
- If a new sub-task was discovered, add it
- Mark completed items with ✅ if appropriate

### 4. `docs/progress.md`
- Mark any newly completed steps as ✅ Done
- Update status of in-progress steps
- Add notes for deviations from the original work plan
- Add to "Known Deviations" section if something changed from the plan

## Common mistakes to check
- `clicks` is a top-level collection, not a subcollection
- `icons` has `path` (not `url`, not `storagePath`)
- `categories` has `color`, `iconId`, `iconUrl`
- Roles: `admin`, `content_manager`, `business_user`, `standard_user`
- Storage rules use `request.auth.token.role` (custom claims), NOT `firestore.get()`
- Firestore rules use `request.auth.token.role` (custom claims) for role checks — NOT `get()` on the users collection
