# review-rules

Use this skill before deploying `firestore.rules` or `storage.rules`. Validates rules against the permission matrix in `docs/hld.md`.

## Permission Matrix (source of truth)

| Collection         | Public              | Admin       | Content Manager | Business User               |
|--------------------|---------------------|-------------|-----------------|------------------------------|
| points_of_interest | read (active only)  | full        | full            | read + update own POIs only  |
| categories         | read                | full        | full            | read                         |
| icons              | read                | full        | full            | read                         |
| businesses         | none                | full        | none            | read own                     |
| users              | none                | full        | none            | read own                     |
| clicks             | create only         | read+delete | none            | none                         |

## Review Checklist

### firestore.rules
- [ ] Every collection in the matrix has a `match` block
- [ ] `isAdmin()`, `isContentManager()`, `isAdminOrContentManager()`, `isBusinessUser()` helper functions exist
- [ ] `userRole()` uses `request.auth.token.role` (custom claims) — NOT `get()` on the users collection
- [ ] Public read for `points_of_interest` only returns `active == true` docs
- [ ] Business user POI update is limited to: `description`, `images`, `videos`, `phone`, `email`, `website`, `updatedAt`
- [ ] Business user POI update checks `businesses/{businessId}.associatedUserIds` contains their UID
- [ ] `clicks` create validates exactly: `poiId`, `categoryId`, `timestamp` — no extra fields allowed
- [ ] `businesses` and `users` are not publicly readable
- [ ] Users cannot update their own `role` or `businessRef`

### storage.rules
- [ ] Uses `request.auth.token.role` for role checks (NOT `firestore.get()`)
- [ ] `icons/` — public read, admin/content_manager write
- [ ] `poi-media/` — public read, admin/content_manager write, business users write to own path only
- [ ] Default deny rule exists at the bottom (`/{allPaths=**} allow read, write: if false`)

## Deploy command
```bash
firebase deploy --only firestore:rules,firestore:indexes,storage
```
