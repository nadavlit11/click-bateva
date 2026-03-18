# Subagent A — Security Review

Prompt:
> Review the following git diff for security issues. Check for:
> - Hardcoded secrets, API keys, or credentials
> - Command injection, XSS, SQL/NoSQL injection risks
> - Firebase Security Rule gaps: missing auth checks, overly permissive rules, missing field validation on writes
> - Any logic that lets unauthenticated users read or write data they shouldn't
> - Exposed internal data structures in API responses
> - Firestore Security Rules comparing a custom claim to a path literal (e.g. `request.auth.token.someRef == /databases/$(database)/documents/...`): custom claims are always **strings**, so this comparison is always false. Use string concatenation instead: `request.auth.token.someRef == '/databases/' + database + '/documents/...'`
> - **Data protection regressions:** (1) Firestore/Storage rules must NEVER use `allow read: if true` on collections containing POI data, categories, subcategories, icons, or settings — all reads require `isSignedIn()`. (2) New `onCall` Cloud Functions must include `enforceAppCheck: true`. (3) New Firestore data hooks must gate behind the `authReady` promise from `firebase.ts`. (4) The `_hp` honeypot filter in `snapshotToPois` must not be removed.
> - **Firestore rules accessing optional fields:** `resource.data.someField` on a doc missing that field throws `Property is undefined on object` and silently denies. Use `resource.data.get('someField', default)` for fields that may not exist on all docs.
>
> Output: PASS or FAIL, followed by a numbered list of findings (empty list if PASS).
>
> Diff:
> [paste diff]
