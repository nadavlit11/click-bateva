# Subagent B — Project Pattern Consistency

Prompt:
> Review the following git diff for consistency with this project's patterns.
>
> Key patterns to enforce:
> - Firestore collection names: `points_of_interest`, `categories`, `subcategories`, `icons`, `users`, `businesses`, `clicks`
> - `clicks` is a TOP-LEVEL collection (never a subcollection)
> - `icons` documents have `path` field (NOT `url`, NOT `storagePath`)
> - `categories` documents have `color`, `iconId`, `iconUrl` fields
> - Roles: `admin`, `content_manager`, `business_user`, `standard_user`, `travel_agent`, `crm_user`
> - Storage rules use `request.auth.token.role` (custom claims) — NEVER `firestore.get()`
> - Firestore rules use `get(/databases/$(database)/documents/users/$(request.auth.uid))` for role checks
> - Denormalize fields (e.g. `iconUrl` on categories) rather than doing extra reads at query time
> - `clicks` documents must have exactly: `poiId`, `categoryId`, `timestamp`
> - `businesses` documents must have `associatedUserIds: string[]` (checked by POI update rule)
> - `createBusinessUser` Cloud Function must set BOTH `role` AND `businessRef` custom claims; `businessRef` format: `/databases/(default)/documents/businesses/${uid}`
> - Firebase emulator connection must be gated on `VITE_USE_EMULATOR === 'true'` (NOT `import.meta.env.DEV`). Using `DEV` connects every local dev server to the emulator even when QA-ing against production data.
> - Firebase Functions v2 `onCall` does NOT add CORS headers for arbitrary origins by default (unlike v1). Every `onCall` from `firebase-functions/v2/https` must include `{ cors: true, enforceAppCheck: true }`: `onCall({ cors: true, enforceAppCheck: true }, async (request) => { ... })`. Without this, calls from localhost fail with CORS error, and without `enforceAppCheck` the function accepts requests from scripts without a valid App Check token.
> - The `onUserCreated` Auth trigger fires for ALL new users, including those created by admin callable functions (e.g. `createBusinessUser`). Any `setCustomUserClaims` call in `onUserCreated` must first check `adminAuth.getUser(uid).customClaims?.role` and skip if a role is already set — otherwise it races with and overwrites claims set by the callable.
> - After adding a new Firestore collection, always deploy the updated security rules: `firebase deploy --only firestore:rules`. A rule written in the file but not deployed silently blocks all reads/writes.
> - When removing a concept/entity from the codebase (e.g., deleting a collection, removing a feature), search `.claude/skills/` for references too — skill files encode collection names, field lists, and permission matrices that become stale if not updated.
> - When adding a new field to `PoiEditableFields` (business-editable fields), the `firestore.rules` `affectedKeys().hasOnly(...)` allowlist for `points_of_interest` updates MUST also be updated to include the new field. Without this, business-user saves silently fail with permission-denied.
> - When saving new optional fields to Firestore, use `.trim() || null` (not just `.trim()`) to avoid writing empty strings. Follow the same pattern used by `price`.
> - After adding new Cloud Functions exports to `functions/src/index.ts`, you MUST run `cd functions && npm run build` before `firebase deploy --only functions` — otherwise the deploy silently skips new functions (only sees the stale compiled JS).
> - When adding a new Firebase SDK (Analytics, Performance, App Check, etc.) to any app, you MUST also: (1) add all domains that SDK contacts to the CSP header in `firebase.json` (`script-src` for script loads like `www.googletagmanager.com`, `connect-src` for API calls like `firebase.googleapis.com`, `firebaselogging-pa.googleapis.com`), and (2) verify the API key in GCP Console → Credentials has the required APIs in its "API restrictions" allowlist. **App Check specifically** requires: `script-src` for `www.google.com/recaptcha/` and `www.gstatic.com/recaptcha/`, `connect-src` for `content-firebaseappcheck.googleapis.com` AND `www.google.com/recaptcha/`, `frame-src` for `www.google.com`, AND the "Firebase App Check API" must be in the API key's allowed APIs list — without it, the `exchangeRecaptchaV3Token` call returns 403 and ALL Firestore reads fail silently with "permission-denied" when App Check enforcement is enabled.
> - Admin section role-based UI gating uses `useAuth().role` from `app/src/hooks/useAuth.tsx`. When adding admin-only UI (nav links, buttons, pages), check that `useAuth().role` gates visibility rather than relying solely on route-level auth.
> - Firestore security rules: `allow create` and `allow delete` should be SEPARATE rules when they have different permission levels (e.g., create: admin/CM, delete: admin only). Never combine them in a single `allow create, delete` if the permissions differ.
>
> Output: PASS or FAIL, followed by a numbered list of findings (empty list if PASS).
>
> Diff:
> [paste diff]
