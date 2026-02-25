# codebase-map

Read this before launching an Explore agent or reading code to understand an area of the codebase.

After reading the relevant sub-page, go directly to the source files listed there. Only launch an Explore agent if the sub-page doesn't cover what you need. **After exploring, update the relevant sub-page with what was discovered** so the next conversation doesn't need to re-explore.

---

## Monorepo Overview

```
apps/admin/        Admin dashboard (React + Vite) — POI/category/subcategory/icon CRUD
apps/user-web/     User-facing map app (React + Vite) — Google Maps + POI browsing
apps/business/     Business dashboard (React + Vite) — business owners edit their POIs
functions/         Firebase Cloud Functions (Node.js + TypeScript) — auth triggers + callables
firestore-tests/   Standalone Firestore Security Rules tests (Jest + emulator)
docs/              Design docs (LLDs, HLD, ATDD) — point-in-time, not live references
scripts/           Utility scripts (data import, admin bootstrap)
```

All apps share: Vite, React, TypeScript, Tailwind CSS v4, Rubik font, Hebrew RTL.

## Firestore Collections

| Collection | Purpose |
|---|---|
| `points_of_interest` | 1025 POIs (imported from WordPress), doc IDs: `wp-{markerId}` |
| `categories` | 9 categories: accommodation, food, offroad, attractions, wineries, water, venues, shows, hiking |
| `subcategories` | Groups within categories, `group` field for AND-across/OR-within logic |
| `icons` | Icon assets, `path` field (NOT `url`) |
| `users` | User profiles, `role` field mirrors custom claim |
| `businesses` | Business records, `associatedUserIds` for POI edit authorization |
| `clicks` | Analytics events (top-level collection, NOT subcollection) |

## Sub-Pages

| Area | File | When to read |
|---|---|---|
| User map app | `user-web.md` | Modifying map, markers, filters, POI detail, bottom sheet |
| Admin dashboard | `admin.md` | Modifying POI/category CRUD, admin auth, analytics |
| Business dashboard | `business.md` | Modifying business POI editing, business auth flow |
| Cloud Functions | `cloud-functions.md` | Modifying auth triggers, callables, custom claims |
| Security rules | `firestore-rules.md` | Modifying Firestore/Storage rules or their tests |
| Infrastructure | `infra.md` | Firebase config, hosting, deploy, emulators, CI/CD |
