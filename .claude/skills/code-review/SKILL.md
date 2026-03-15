# code-review

Run before every code commit. Acts as a gate — do not commit if any subagent returns FAIL.

**Skip for:** pure doc updates, config-only changes, chore commits with no logic changes.

---

## Step 1 — Get the diff

```bash
git status          # check for untracked files that should be staged
git diff --staged   # review what's already staged
```

Stage any missing files before reviewing. **Always check `git status` first** — untracked files won't appear in the diff and are easy to miss before committing. Pass the staged diff output to all subagents.

---

## Step 2 — Spawn subagents in parallel

Launch all four at the same time with the Task tool:

### Subagent A — Security Review

Prompt:
> Review the following git diff for security issues. Check for:
> - Hardcoded secrets, API keys, or credentials
> - Command injection, XSS, SQL/NoSQL injection risks
> - Firebase Security Rule gaps: missing auth checks, overly permissive rules, missing field validation on writes
> - Any logic that lets unauthenticated users read or write data they shouldn't
> - Exposed internal data structures in API responses
> - Firestore Security Rules comparing a custom claim to a path literal (e.g. `request.auth.token.someRef == /databases/$(database)/documents/...`): custom claims are always **strings**, so this comparison is always false. Use string concatenation instead: `request.auth.token.someRef == '/databases/' + database + '/documents/...'`
> - **Data protection regressions:** (1) Firestore/Storage rules must NEVER use `allow read: if true` on collections containing POI data, categories, subcategories, icons, or settings — all reads require `isSignedIn()`. (2) New `onCall` Cloud Functions must include `enforceAppCheck: true`. (3) New Firestore data hooks must gate behind the `authReady` promise from `firebase.ts`. (4) The `_hp` honeypot filter in `snapshotToPois` must not be removed.
>
> Output: PASS or FAIL, followed by a numbered list of findings (empty list if PASS).
>
> Diff:
> [paste diff]

### Subagent B — Project Pattern Consistency

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
> - When adding a new Firebase SDK (Analytics, Performance, etc.) to any app, you MUST also: (1) add all domains that SDK contacts to the CSP header in `firebase.json` (`script-src` for script loads like `www.googletagmanager.com`, `connect-src` for API calls like `firebase.googleapis.com`, `firebaselogging-pa.googleapis.com`), and (2) verify the API key in GCP Console → Credentials has the required APIs in its "API restrictions" allowlist (e.g., Firebase Management API for Analytics, Firebase Remote Config API for Performance).
> - Admin section role-based UI gating uses `useAuth().role` from `app/src/hooks/useAuth.tsx`. When adding admin-only UI (nav links, buttons, pages), check that `useAuth().role` gates visibility rather than relying solely on route-level auth.
> - Firestore security rules: `allow create` and `allow delete` should be SEPARATE rules when they have different permission levels (e.g., create: admin/CM, delete: admin only). Never combine them in a single `allow create, delete` if the permissions differ.
>
> Output: PASS or FAIL, followed by a numbered list of findings (empty list if PASS).
>
> Diff:
> [paste diff]

### Subagent C — Code Quality

Prompt:
> Review the following git diff for code quality issues. Flag both over-engineering AND under-engineering.
>
> **Over-engineering (too much complexity):**
> - Abstractions, helpers, or utilities created for a single use
> - Dead code: unused variables, functions, imports
> - Premature generalization: designing for hypothetical future requirements not in the work plan
> - Unnecessary backwards-compatibility shims or feature flags
> - Validation in the wrong place: only validate at system boundaries (user input, external APIs) — don't re-validate internal data
>
> **Under-engineering (missing structure that should be there):**
> - Repeated logic (3+ similar lines) that should be extracted into a shared function
> - Shared utilities, types, or Firebase config that should live in `shared/` but were duplicated
> - React patterns that should be used but weren't: custom hooks for reusable stateful logic, component decomposition for reused UI, context for app-wide state
> - Firebase SDK patterns skipped in favor of raw fetch or manual workarounds
> - TypeScript types missing where they'd prevent bugs (any used where a proper type exists or is obvious)
> - **Inline SVG icons copy-pasted across 2+ components**: identical SVG markup (especially icon paths + companion URLs/strings) should be extracted into a shared component immediately. If you see the same `<svg>` appearing in multiple files, flag it.
> - **Firestore hooks placed in frequently-mounted child components**: `onSnapshot` listeners opened in components that mount/unmount often (e.g., inner components inside Google Maps `<Map>`) cause listener churn. Firestore data hooks should be called at the highest reasonable component level and passed down as props — consistent with how `pois`, `categories`, and `subcategories` are fetched in the parent and passed in.
> - **Custom hooks that call Firebase listeners must be context-based when shared across multiple components**: every `useHook()` call that contains `onAuthStateChanged` or `onSnapshot` opens a NEW Firebase connection. If the hook is consumed in more than one component in the same React tree, the listener logic MUST live in a `Context` + `Provider` at the app root so a single listener is shared. A plain hook that calls `onAuthStateChanged` inside a `useEffect` will open N simultaneous connections when used in N components — this is a resource/performance bug. Check: does the hook appear in multiple component files? If yes, it must be context-based.
> - **Converting a conditionally-rendered modal to an `isOpen` prop changes state-reset semantics**: `{open && <Modal />}` unmounts when `open=false`, clearing all internal state for free. `<Modal isOpen={open} />` with an early return (`if (!isOpen) return null`) keeps the component mounted — state persists while hidden. Any time a modal is converted to the `isOpen` prop pattern, verify it has `useEffect(() => { if (!isOpen) { /* reset all state */ } }, [isOpen])` to restore the implicit state-reset. Without this, stale passwords/errors/form values appear the next time the modal opens.
>
> **Missing error handling:**
> - Uncaught Firebase errors at system boundaries
>
> **RTL / layout correctness:**
> - Carousels, sliders, or any component using `translateX` to scroll through flex children must have `direction: ltr` on the track element. In a `dir="rtl"` document, RTL flex reverses physical item order, making `translateX(-N%)` navigate the wrong direction.
> - When a new field is added to a TypeScript type that maps to Firestore, check that: (1) the Firestore data hook (`snapshotToPois` in `useFirestoreData.ts`) maps it, (2) every test fixture that constructs that type includes the field (e.g., `mkPoi` in `filterPois.test.ts`), (3) every manual object literal that builds that type includes it (e.g., `previewPoi` in business `PoiEditPage.tsx`), (4) every UI component that could display it actually wires it up. **All four must be checked** — missing any one causes a TypeScript build failure in CI even if local IDE doesn't flag it.
> - In RTL UIs, "collapsed" state indicators should point LEFT (◂), not right (▸). The ▸ character signals "expand right" which is the wrong direction in Hebrew/Arabic layouts.
> - Mobile viewport height: always use `100dvh` (not `100vh`) in full-screen layouts — `dvh` accounts for mobile browser chrome (URL bar, nav). When a fixed overlay (bottom sheet, tab bar) sits at the bottom, subtract its height from `max-h` calculations: `max-h-[calc(100dvh-120px-2rem)] md:max-h-[calc(100dvh-2rem)]`.
> - After a refactor that removes intermediate variable aliases (e.g., `effectiveFoo = foo`), do a replace_all to update all consumers. Dead aliases left behind cause TS errors when the alias is later deleted.
> - Absolute-positioned action buttons (delete/remove) within a repeated list of items must use the same corner (`top-1 right-1` or `top-1 left-1`) across all items. Mixing corners for the same action in the same component is a visual inconsistency bug.
> - **Tailwind v4 positioning in RTL:** `left-*`/`right-*` map to LOGICAL properties (`inset-inline-start`/`inset-inline-end`), NOT physical. In an RTL document, `right-3` = physical LEFT and `left-3` = physical RIGHT — the opposite of what the class name suggests. Always use `start-*`/`end-*` for clarity: `start-3` = inline-start (physical right in RTL), `end-3` = inline-end (physical left in RTL). **Exception — carousel/slider arrows:** When arrow characters (`‹`/`›`) must match a physical screen direction regardless of document direction, use inline `style={{ right: "4px" }}` / `style={{ left: "4px" }}` to guarantee physical placement. Logical properties can produce confusing arrow behavior when the character direction conflicts with the logical position.
> - **Global `body { overflow: hidden }` blocks page scroll:** The map app sets `body { overflow: hidden }` in `index.css`. Any standalone full-page route (e.g., ServicesPage) must override this — use `position: fixed; inset: 0; overflow-y: auto` on the page root element.
> - **Seed data `mapType` must match query expectations:** POIs with `mapType: "default"` appear in agents/groups queries; POIs with `mapType: "families"` only appear in the families query. When seeding locationless POIs that should be visible on ServicesPage (which uses agents/groups mapKey), set `mapType: "default"` with `maps.agents.active: true` and `maps.groups.active: true`.
> - **Google Maps `panTo` + `setZoom` race:** Never call `map.panTo(center)` and `map.setZoom(zoom)` together — `panTo` animates asynchronously while `setZoom` fires immediately at the old center, causing the map to end up at the wrong location. Use `map.moveCamera({ center, zoom })` for atomic center+zoom changes. Also: `MarkerClusterer` cleanup must use `setMap(null)` (not `clearMarkers()`) to remove its internal `idle` listener — otherwise React StrictMode double-mount leaves a ghost listener.
> - When the same pure utility (validation, formatting, constants) is used by 2+ components in the same app, extract it to `lib/` immediately. Don't duplicate `getStrength`/`isPasswordValid`-style functions across multiple component files within one app — the copies drift. Cross-app duplication (admin vs business) is acceptable since they're independent deployments.
> - **State-reset effect completeness:** When a component has an existing `useEffect` that resets local state on entity change (e.g., `useEffect(() => { setX(0); setY(false); }, [poi.id])`), any new UI state variable (modal visibility, expanded flags, etc.) MUST also be reset in that same effect. Omitting it leaves stale UI state — e.g. a phone modal stays open when the user navigates to a different POI.
> - **Silent `catch` blocks on external API calls:** Every `fetch` to an external API (Google Places, geocoding, etc.) must check `res.ok` and log/report non-2xx responses — do NOT silently swallow errors with an empty `catch` or by ignoring the status code. Silent failures make bugs invisible (e.g., a 400 from an invalid parameter looks identical to "no results found").
> - **Derived variables in useEffect deps:** When a `useEffect` uses a derived variable (e.g., `const isBusinessTab = activeTab === 'business_user'`), ESLint `exhaustive-deps` warns if the derived variable is in the body but not in the deps array. Fix: inline the condition (`activeTab === 'business_user'`) inside the effect instead of referencing the derived variable — the linter then sees the actual dependency.
> - **External API parameter validation before commit:** When adding a new external API integration (`fetch` to Google, Stripe, etc.), verify the exact request parameters work by testing with `curl` or browser dev tools BEFORE committing. API constraints (max radius, required fields, rate limits) are not always obvious from docs and silently break when violated.
> - **Dead form state fields:** When porting a form from one component to another (e.g., drawer → full page), check for fields in `FormState` that are loaded from the data source but never rendered in the JSX and hardcoded to a default on save. These are dead state — remove them to avoid confusion.
> - **Dropped fields when replacing a component:** When a component is replaced by a new one (e.g., `PoiDrawer` → `PoiEditPage`), compare the old component's form fields and data fetches against the new one. Every field the old component read, rendered, and saved must be accounted for in the replacement — either carried over or explicitly removed with justification. Missing fields silently regress features.
> - **Firestore rule public fallback vs per-role restriction:** When a Firestore read rule has a final unguarded condition (e.g., `resource.data.active == true && resource.data.maps.groups.active == true` with no auth check), it applies to ALL users including authenticated ones with other roles. This is intentional for public data but tests must not assert denial for authenticated users against that public path.
> - **Cloud Function callable pattern consistency:** New callable functions (e.g., `createTravelAgent`) must follow the same pattern as existing ones (`createContentManager`, `createBusinessUser`): admin-only guard, input validation with `HttpsError`, `{ cors: true }` option, custom claims + Firestore user doc write.
> - **Test/seed data must match the full data contract:** When creating seed data or test fixtures for Firestore, every field must match the exact shape the app code expects — including: (1) `location` must be a plain `{lat, lng}` object (NOT a Firestore `GeoPoint`), (2) array fields like `subcategoryIds` must contain valid IDs when the app's filtering logic requires them (e.g., `filterPois` auto-selects subcategories per category, so POIs with empty `subcategoryIds` get filtered out). Check the TypeScript type AND the consuming code (hooks, filters, renderers) to understand what values are actually required at runtime.
> - **Modal scroll constraints:** Every modal with a form (especially those with color pickers, icon pickers, or many fields) must have `max-h-[90vh] flex flex-col` on the modal container and `overflow-y-auto` on the scrollable body/form. Without this, the modal overflows the viewport with no way to scroll on smaller screens. When adding a new modal, apply this pattern from the start. When adding fields to an existing modal, verify the scroll constraint is present.
> - **React Router `<Link>` paths in nested routes must be relative:** In components rendered under a nested route (e.g., `/business/*`), `<Link to="/pois/123">` navigates to the root `/pois/123` (caught by the `/*` catch-all), NOT to `/business/pois/123`. Use relative paths (`to="pois/123"` without leading slash) so they resolve against the current route. Always check Link `to` props in components mounted under nested `Route path="prefix/*"` wrappers.
> - **Admin save handlers must preserve `iconUrl` when `iconId` is unchanged:** Category/Subcategory/POI save handlers resolve `iconId` → `iconUrl` via Firebase Storage. When saving, start with the entity's existing `iconId`/`iconUrl`, only call `getDownloadURL` if the user picked a *different* icon, and only clear both to `null` if the user actively removed a previously-set icon (`!form.iconId && entity?.iconId`). Initializing both to `null` and only resolving when `form.iconId` is truthy silently wipes `iconUrl` on entities that have a direct URL but no `iconId` (e.g., imported/seeded data).
> - **Icon `<img>` tags must have `onError` fallback:** Every `<img>` that loads an icon URL from Firestore (`cat.iconUrl`, `sub.iconUrl`, `poi.iconUrl`) must include `onError={e => { e.currentTarget.hidden = true }}` to gracefully handle deleted/missing storage objects. The parent element should already render an emoji fallback when `iconUrl` is falsy, and hiding the broken `<img>` reveals the parent container.
> - **New `React.lazy()` imports must use `lazyRetry()`:** The `lazyRetry` helper in `app/src/user-web/MapApp.tsx` auto-reloads the page once on stale chunk failures (common after deploys). Any new lazy import should wrap the `import()` call with `lazyRetry()` to prevent chunk-load errors for users with cached HTML.
> - **URL validation must use `safeHttpUrl()` from `app/src/lib/urlUtils.ts`:** Any code that validates a URL string for http/https protocol and returns `href` or `null` should use the shared `safeHttpUrl(raw)` utility — do NOT inline the `new URL()` + protocol check pattern. For URLs that may lack a protocol prefix (e.g., user-entered website), prepend `https://` before calling `safeHttpUrl`.
> - **Firestore subcollection cascade delete:** When a `deleteDoc` call targets a document that has subcollections, the subcollection docs are NOT automatically deleted. Any delete handler must first `getDocs` the subcollection(s) and batch-delete them. Check UI delete confirmation messages — if they promise subcollection data will be deleted, the code must actually do it.
> - **Composite indexes must match actual queries:** When adding Firestore queries with multiple `where()` clauses, verify that `firestore.indexes.json` has a composite index for that exact field combination. A common mistake: planning index `(fieldA, fieldB)` but the actual query uses `(fieldA, fieldC)`.
>
> Output: PASS or FAIL, followed by a numbered list of findings (empty list if PASS).
>
> Diff:
> [paste diff]

### Subagent D — Test Coverage

Prompt:
> Review the following git diff and determine whether the new logic has adequate test coverage.
>
> **What must be tested:**
> - Cloud Functions (callable + triggers): every exported function needs a unit test covering the happy path and key error cases
> - `filterPois` and other pure utility functions: unit tests for each logical branch
> - Firestore Security Rules changes: integration test using the emulator for each new rule or rule change (allow + deny case)
>
> **What does NOT need tests (acceptable to skip):**
> - React UI components (no component tests in this project)
> - Firebase config / boilerplate files (`firebase.ts`, `main.tsx`, etc.)
> - Type-only files (`types/index.ts`)
> - Simple CRUD pages that only wire existing SDK calls (Firestore `getDocs`/`onSnapshot`/`updateDoc` with no business logic)
> - Routing and layout scaffolding
>
> **Mutation testing coverage:**
> - Stryker mutation testing uses **glob patterns** — all files in `app/src/lib/` (except tests, firebase.ts, constants.ts, errorReporting.ts) and `functions/src/` (except tests, index.ts) are auto-included
> - When logic in these files changes, flag that `npm run test:mutate` should be run to verify the mutation score hasn't regressed
> - New pure-logic utility files are auto-included by the glob — no manual config update needed
> - **New exports from mutation-tested files need their own direct tests**: if a new function is exported from a file under Stryker mutation testing (e.g., `openingStatus.ts`), its mutations will NOT be killed by tests that only exercise the existing functions — even if both functions share similar logic. Every new exported function in a mutated file needs at least one test that directly imports and calls it, covering key branches (open/closed, null/string inputs, boundary times).
>
> For each piece of logic that requires a test, check if a corresponding test file exists in the diff (or already exists in the repo if you can verify). Output PASS if all required tests are present or if nothing testable was added. Output FAIL with a specific list of missing tests otherwise.
>
> Output: PASS or FAIL, followed by a numbered list of findings (empty list if PASS).
>
> Diff:
> [paste diff]

---

## Step 3 — Aggregate results

| Subagent | Result |
|----------|--------|
| A — Security | PASS / FAIL |
| B — Patterns | PASS / FAIL |
| C — Code Quality | PASS / FAIL |
| D — Test Coverage | PASS / FAIL |

**If all PASS** → proceed to commit.

**If any FAIL** → fix all findings (or write the missing tests), re-stage, and re-run this skill before committing.

---

## Step 4 — Run relevant tests

Before committing, run whichever test suite covers the changed code:

```bash
# Cloud Function changes:
cd functions && npm test

# Firestore Security Rules changes:
cd firestore-tests && npm test   # requires: firebase emulators:start --only firestore

# User-web logic changes (filterPois etc.):
cd app && npm test
```

All tests must pass. If any fail, fix them before proceeding.

---

## Step 4.5 — Update docs (if behavior changed)

If the code changes affect any documented behavior — data model, UI flows, component APIs, routing, filtering logic, or admin features — run the `/update-docs` skill before committing. Skip this step for pure refactors, test-only changes, or config tweaks that don't change documented behavior.

**Codebase map check:** If this change modifies component structure, data flow, key file paths, or introduces new patterns/gotchas, update the relevant `/codebase-map` sub-page (`.claude/skills/codebase-map/*.md`) before committing.

---

## Step 5 — Commit and push

Once all subagents pass AND tests pass:

```bash
git commit -m "<type>: <description>"
git push
```

Always push immediately after committing.
