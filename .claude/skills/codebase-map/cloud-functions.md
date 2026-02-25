# Cloud Functions

## Key Files

- `functions/src/index.ts` — exports all functions; Sentry init; `setGlobalOptions({ maxInstances: 10 })`
- `functions/src/auth.ts` — `onUserCreated` (v1 auth trigger) + `setUserRole` (v2 callable)
- `functions/src/business.ts` — `createBusinessUser` + `deleteBusinessUser` (v2 callables)
- `functions/src/users.ts` — `deleteContentManager` + `blockContentManager` (v2 callables, admin-only)
- `functions/src/__tests__/auth.unit.test.ts` — unit tests for auth functions (no emulator)
- `functions/src/__tests__/users.unit.test.ts` — unit tests for user management functions
- `tests/integration/auth-functions.test.ts` — integration tests (emulator required)
- `functions/stryker.config.json` — mutation testing config for `auth.ts`

## Exported Functions

| Function | API | Trigger | Auth |
|---|---|---|---|
| `onUserCreated` | v1 `auth.user().onCreate` | New Firebase Auth user | N/A (trigger) |
| `setUserRole` | v2 `onCall({ cors: true })` | Admin callable | admin only |
| `createBusinessUser` | v2 `onCall({ cors: true })` | Admin callable | admin only |
| `deleteBusinessUser` | v2 `onCall({ cors: true })` | Admin callable | admin only |
| `deleteContentManager` | v2 `onCall({ cors: true })` | Admin callable | admin only |
| `blockContentManager` | v2 `onCall({ cors: true })` | Admin callable | admin only |

## Data Flow

```
onUserCreated (v1 trigger)
  ├─ Checks if claims.role already set (race guard vs createBusinessUser)
  ├─ If no role → sets standard_user claim + creates users/ doc
  └─ If role exists → skips (logs and returns)

setUserRole (v2 callable)
  ├─ Validates caller is admin
  ├─ Validates role is one of: admin, content_manager, business_user, standard_user
  └─ Updates BOTH users/ doc AND custom claims

createBusinessUser (v2 callable)
  ├─ Validates caller is admin
  ├─ Creates Firebase Auth user
  ├─ Sets claims: { role: "business_user", businessRef: "/databases/(default)/documents/businesses/${uid}" }
  └─ Batch writes: users/ doc + businesses/ doc (with associatedUserIds: [uid])

deleteBusinessUser (v2 callable)
  ├─ Deletes Firebase Auth user (tolerates auth/user-not-found)
  └─ Batch deletes: users/ doc + businesses/ doc

deleteContentManager (v2 callable)
  ├─ Validates caller is admin + target has content_manager role
  ├─ Deletes Firebase Auth user (tolerates auth/user-not-found)
  └─ Deletes users/ doc

blockContentManager (v2 callable)
  ├─ Validates caller is admin + target has content_manager role
  ├─ Sets auth user disabled: true (tolerates already-disabled)
  └─ Updates users/ doc with blocked: true
```

## Patterns & Conventions

- v2 `onCall` MUST include `{ cors: true }` — without it, calls from localhost and non-Firebase-Hosting origins fail with CORS error
- v1 used only for `onUserCreated` (auth triggers not available in v2 at time of writing)
- All callables validate: (1) authenticated, (2) admin role, (3) input types
- Sentry error reporting on unexpected errors via `Sentry.captureException`
- Valid roles: `admin`, `content_manager`, `business_user`, `standard_user`

## Gotchas

- `onUserCreated` fires for ALL new users including those created by `createBusinessUser` — must check if role already set to avoid overwriting business_user claim with standard_user
- `businessRef` claim is a STRING, not a Firestore path — format: `/databases/(default)/documents/businesses/${uid}`
- `createBusinessUser` sets claims BEFORE `onUserCreated` fires, but there's a race — the guard in `onUserCreated` handles it
- Test runner: Jest (NOT Vitest) — `functions/jest.config.unit.js` for unit tests
- Mutation testing score is 69% (infra/logger lines are expected survivors)
- **MUST run `npm run build` before deploying new functions** — `firebase deploy` reads compiled JS, not TS. New exports in `index.ts` are silently skipped if JS is stale.
- `deleteContentManager`/`blockContentManager` validate target user has `content_manager` role before acting
- All 22 function unit tests must pass before deploy: `cd functions && npm test`
