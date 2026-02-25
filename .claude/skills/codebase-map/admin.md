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
- `apps/admin/src/pages/BusinessesPage.tsx` + `BusinessModal.tsx` — business CRUD via `createBusinessUser` callable
- `apps/admin/src/pages/AnalyticsPage.tsx` — click totals per POI + per category
- `apps/admin/src/components/Layout/AppLayout.tsx` + `Sidebar.tsx` — flex layout with nav links
- `apps/admin/src/types/index.ts` — Poi, Category, Subcategory, Icon types (uses empty strings for optional fields, not null)

## Component / Data Flow

```
App.tsx (BrowserRouter)
  └─ AuthGuard (gates on admin | content_manager role via custom claims)
      └─ AppLayout (Sidebar nav + Outlet)
          ├─ DashboardPage (stats overview)
          ├─ PoisPage → PoiDrawer (slide-in CRUD panel)
          ├─ CategoriesPage → CategoryModal
          ├─ SubcategoriesPage → SubcategoryModal
          ├─ IconsPage (direct upload/delete)
          ├─ BusinessesPage → BusinessModal (calls createBusinessUser Cloud Function)
          └─ AnalyticsPage (reads clicks collection)
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
