# codebase-map

Read this before launching an Explore agent or reading code to understand an area of the codebase.

After reading the relevant sub-page, go directly to the source files listed there. Only launch an Explore agent if the sub-page doesn't cover what you need. **After exploring, update the relevant sub-page with what was discovered** so the next conversation doesn't need to re-explore.

---

## Monorepo Overview

```
app/               Unified React + Vite app — all three sections in one
  src/
    user-web/      Map section (Google Maps + POI browsing, default route /)
    admin/         Admin section (POI/category/subcategory/icon CRUD, route /admin/*)
    business/      Business section (business owners edit their POIs, route /business/*)
    lib/           Shared: firebase.ts, passwordStrength.ts, filterPois.ts, etc.
    hooks/         Shared: useAuth.ts, useFirestoreData.ts, useTrip.ts, etc.
    types/         Shared base types (Category, Subcategory, Poi variants)
    App.tsx        Root BrowserRouter + lazy-loaded section routes
    main.tsx       Entry point + Sentry init
functions/         Firebase Cloud Functions (Node.js + TypeScript) — auth triggers + callables
firestore-tests/   Standalone Firestore Security Rules tests (Jest + emulator)
docs/              Design docs (LLDs, HLD, ATDD) — point-in-time, not live references
scripts/           Utility scripts (data import, admin bootstrap)
apps/              Legacy per-app directories (no longer built by CI; kept for reference)
```

All sections share: Vite, React, TypeScript, Tailwind CSS v4, Rubik font, Hebrew RTL.
Single auth session at click-bateva.web.app — no re-login when switching sections.

## Firestore Collections

| Collection | Purpose |
|---|---|
| `points_of_interest` | POIs managed via admin/business dashboards |
| `categories` | POI categories (Hebrew names, with color + order fields) |
| `subcategories` | Groups within categories, `group` field for AND-across/OR-within logic |
| `icons` | Icon assets, `path` field (NOT `url`) |
| `users` | User profiles, `role` field mirrors custom claim |
| `businesses` | Business records, `associatedUserIds` for POI edit authorization |
| `clicks` | Analytics events (top-level collection, NOT subcollection) |

### Key Relationships

- **icons → categories, subcategories, points_of_interest**: All three collections have `iconId` (references `icons` doc ID) and `iconUrl` (cached download URL, resolved at save time). When deleting icons, null out both fields in all three collections.
- **categories → subcategories → points_of_interest**: POIs reference `categoryId` and `subcategoryIds[]`. Subcategories reference `categoryId`.
- **businesses → points_of_interest**: POIs reference `businessId`. Business docs have `associatedUserIds` for edit authorization.
- **categories → points_of_interest**: POIs reference `categoryId` directly.

## Sub-Pages

| Area | File | When to read |
|---|---|---|
| User map app | `user-web.md` | Modifying map, markers, filters, POI detail, bottom sheet |
| Admin dashboard | `admin.md` | Modifying POI/category CRUD, admin auth, analytics |
| Business dashboard | `business.md` | Modifying business POI editing, business auth flow |
| Cloud Functions | `cloud-functions.md` | Modifying auth triggers, callables, custom claims |
| Security rules | `firestore-rules.md` | Modifying Firestore/Storage rules or their tests |
| Infrastructure | `infra.md` | Firebase config, hosting, deploy, emulators, CI/CD |
