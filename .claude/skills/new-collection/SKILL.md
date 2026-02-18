# new-collection

Use this skill when adding a new Firestore collection to the project. Ensures all required files are updated consistently.

## Steps

### 1. Design the schema
- Define all fields, types, and notes
- Decide if any fields should be denormalized from other collections
- Decide if any indexes are needed for common queries

### 2. Update `docs/hld.md`
- Add the collection to the collections list under Cloud Firestore
- Add a schema table under section 4 (High-Level Data Model)
- Add a row to the permission matrix for the new collection

### 3. Update `firestore.rules`
- Add a `match /{collectionName}/{docId}` block
- Implement permissions per the matrix
- Add any necessary helper functions if new role logic is needed

### 4. Update `firestore.indexes.json`
- Add composite indexes for any queries that filter/order on multiple fields
- Common patterns:
  - `(foreignKeyField ASC, timestamp DESC)` for filtered lists sorted by time
  - `(active ASC, categoryId ASC)` for filtered POI-like queries

### 5. Update `docs/atdd.md`
- Add acceptance test scenarios for admin CRUD if the collection is admin-managed
- Add scenarios for any user-facing behavior

### 6. Update `docs/work-plan.md`
- Add the new collection work to the appropriate phase step

## Key patterns to remember
- Storage rules use `request.auth.token.role` (custom claims)
- Firestore rules use `get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role`
- Denormalize fields (copy from related doc) when needed for fast reads without extra lookups
- `clicks` pattern: store `poiId` + `categoryId` on the click document itself for analytics
