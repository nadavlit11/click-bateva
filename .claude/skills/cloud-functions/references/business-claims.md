# Business User Custom Claims & Dual Role System

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

## Dual role system

Roles are stored in **two places** that must stay in sync:

| Store | Used by | Set by |
|-------|---------|--------|
| Firestore `users/{uid}.role` | Admin UI display only | `onUserCreated` + `setUserRole` |
| Custom claim `{ role }` on Auth token | Firestore rules + storage rules + callable function auth checks + front-end | `onUserCreated` + `setUserRole` |

`setUserRole` updates both atomically. When testing manually, make sure both are set.

**Important:** Firestore Security Rules use `request.auth.token.role` (custom claims), NOT `get()` on the users collection. This avoids failures when the user document doesn't exist yet (e.g., new users before the trigger fires).
