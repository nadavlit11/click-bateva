# Admin Dashboard

## Key Files

- `apps/admin/src/App.tsx` — BrowserRouter + route definitions
- `apps/admin/src/components/AuthGuard.tsx` — onAuthStateChanged + custom claims gate (admin | content_manager)
- `apps/admin/src/pages/PoisPage.tsx` — POI list + opens PoiDrawer
- `apps/admin/src/components/PoiDrawer.tsx` — slide-in panel; full POI CRUD + image upload + MapPicker + subcategory checkboxes
- `apps/admin/src/components/MapPicker.tsx` — Leaflet + Nominatim geocoding; click/drag/search to set lat/lng
- `apps/admin/src/pages/CategoriesPage.tsx` + `CategoryModal.tsx` — category CRUD with icon picker + color picker
- `apps/admin/src/pages/SubcategoriesPage.tsx` + `SubcategoryModal.tsx` — subcategory CRUD with group datalist autocomplete
- `apps/admin/src/pages/IconsPage.tsx` — upload/list/delete icons (Cloud Storage `icons/` prefix)
- `apps/admin/src/pages/BusinessesPage.tsx` + `BusinessModal.tsx` — business CRUD (create via `createBusinessUser` callable, edit via direct Firestore update)
- `apps/admin/src/pages/UsersPage.tsx` — content manager management (list, delete, block) via `deleteContentManager`/`blockContentManager` callables
- `apps/admin/src/pages/AnalyticsPage.tsx` — click totals per POI + per category
- `apps/admin/src/components/ChangePasswordModal.tsx` — change password (reauthenticate + updatePassword)
- `apps/admin/src/components/Layout/AppLayout.tsx` + `Sidebar.tsx` — flex layout with nav links (admin-only gating via `useUserRole`)
- `apps/admin/src/hooks/useUserRole.ts` — custom hook: listens to `onAuthStateChanged`, extracts `role` from `getIdTokenResult()` claims
- `apps/admin/src/lib/passwordStrength.ts` — shared password validation: `getStrength()`, `isPasswordValid()`, `PASSWORD_ERROR`, strength indicator maps
- `apps/admin/src/types/index.ts` — Poi (+ whatsapp, iconId, iconUrl), Category (+ order), Subcategory (+ iconId, iconUrl), Icon types

## Component / Data Flow

```
App.tsx (BrowserRouter)
  └─ AuthGuard (gates on admin | content_manager role via custom claims)
      └─ AppLayout (Sidebar nav + Outlet)
          ├─ DashboardPage (stats overview)
          ├─ PoisPage → PoiDrawer (slide-in CRUD panel; delete hidden for CM role)
          ├─ CategoriesPage → CategoryModal (+ order field)
          ├─ SubcategoriesPage → SubcategoryModal (+ icon picker)
          ├─ IconsPage (direct upload/delete)
          ├─ BusinessesPage → BusinessModal (create via callable, edit via Firestore)
          ├─ UsersPage (admin-only; list/delete/block content managers)
          └─ AnalyticsPage (reads clicks collection)

Sidebar: nav links filtered by useUserRole() — /businesses and /users are adminOnly
         "שנה סיסמה" button opens ChangePasswordModal
```

## Patterns & Conventions

- Uses react-router-dom v7 for routing
- Map picker uses Leaflet + OpenStreetMap (NOT Google Maps) — no API key needed
- Admin Poi type uses empty strings for optional fields; user-web uses null
- Storage paths: POI images in `poi-media/{uuid}.{ext}`, icons in `icons/{uuid}.{ext}`
- Role check is via custom claims (`request.auth.token.role`), NOT Firestore reads

## Gotchas

- MapPicker must NOT be wrapped in a `<form>` — it's embedded in PoiDrawer's form, nested forms cause page refresh
- Nominatim geocoding uses `Accept-Language: he` for Hebrew results
- `createBusinessUser` callable sets BOTH `role` AND `businessRef` custom claims
- When adding new editable fields to POIs, also update the Firestore rules `affectedKeys().hasOnly(...)` allowlist
- Icon documents use `path` field (NOT `url` or `storagePath`)
- PoiDrawer form: Enter key is prevented from submitting (onKeyDown handler). Save button is inside the scroll area (not sticky).
- POIs sorted by name ascending (client-side). Search is by name only (not description).
- Required fields: name, phone, whatsapp, description, image (at least 1). Required labels have red asterisk.
- Bold text: `**bold**` in description. Small toolbar button wraps selection in `**...**`.
- Content managers: cannot delete POIs (delete button hidden via useUserRole check), cannot see Businesses or Users pages
- Password quality: min 8 chars, 1 letter + 1 number. Shared via `lib/passwordStrength.ts`.
