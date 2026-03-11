# Admin Dashboard

## Key Files

- `app/src/admin/AdminSection.tsx` — lazy-loaded route definitions (mounted under `/admin/*` in root App.tsx); imports `leaflet/dist/leaflet.css`
- `app/src/admin/components/AuthGuard.tsx` — reads `user`, `role`, `loading` from `useAuth()` context; gates on admin | content_manager; unauthenticated redirects to `/` (map)
- `app/src/admin/pages/PoisPage.tsx` — POI list; clicking a POI navigates to `/pois/:id`
- `app/src/admin/pages/PoiEditPage.tsx` — full-page POI editor; CRUD + MapPicker + per-map price/active. Split into sub-components in `poi-form/`:
  - `poi-form/types.ts` — FormState, INITIAL_FORM, SetField, day/hour constants
  - `poi-form/utils.ts` — shared `uploadFile` (Storage upload helper)
  - `poi-form/MediaSection.tsx` — images + videos
  - `poi-form/OpeningHoursSection.tsx` — day-by-day hours or by-appointment
  - `poi-form/ContactDetailsSection.tsx` — phone, whatsapp, contact name, website, facebook, minPeople/maxPeople (replaced capacity)
  - `poi-form/FoodExtrasSection.tsx` — kashrut cert + menu (food category only)
  - `poi-form/DisplaySettingsSection.tsx` — icon picker, color, borderColor, markerSize, flicker, active toggles, isHomeMap toggle
- `app/src/admin/components/MapPicker.tsx` — Leaflet + Nominatim geocoding; click/drag/search to set lat/lng
- `app/src/admin/components/ColorPickerField.tsx` — shared color picker (type=color + text input + clear button); used by CategoryModal, SubcategoryModal, PoiEditPage
- `app/src/admin/pages/CategoriesPage.tsx` + `CategoryModal.tsx` — category CRUD with icon picker + color + borderColor + markerSize
- `app/src/admin/pages/SubcategoriesPage.tsx` + `SubcategoryModal.tsx` — subcategory CRUD with group datalist; optional color/borderColor/markerSize overrides
- `app/src/admin/pages/IconsPage.tsx` — upload/list/delete icons (Cloud Storage `icons/` prefix); **inline edit per row**: name (guarded against empty), size (px, null = default), flicker (animate-pulse toggle)
- `app/src/admin/pages/UsersPage.tsx` — tabbed user management: מנהלי תוכן (content_manager), מפיקים (travel_agent), and מפרסמים (business_user) tabs; role tabs have list/add/delete/block via callables; business tab queries `businesses` collection with add/edit via `BusinessModal` and delete via `deleteBusinessUser` callable. **Agent tab**: name input field, name column in table. **Business tab**: contactName column. **T&C checkbox** on add forms (fetches `settings/terms` for userTermsUrl).
- `app/src/admin/components/BusinessModal.tsx` — מפרסם (business) create (via `createBusinessUser` callable) + edit (via direct Firestore update) modes; password strength indicator; **contactName** field; **T&C checkbox** (fetches `settings/terms` for businessTermsUrl)
- `app/src/admin/pages/AnalyticsPage.tsx` — click totals per POI + per category
- `app/src/admin/components/ChangePasswordModal.tsx` — change password (reauthenticate + updatePassword)
- `app/src/admin/components/Layout/AppLayout.tsx` + `Sidebar.tsx` — flex layout with nav links (admin-only gating via `useAuth`); includes "← המפה" link back to map (`to="/"`)
- `app/src/hooks/useAuth.tsx` — **context-based** auth hook; `AuthProvider` wraps the entire app at `App.tsx` root, runs ONE `onAuthStateChanged` listener for the whole app; `useAuth()` returns `{ user, role, loading, login, logout }` from context (zero extra listeners). `useAuth.ts` is a thin re-export barrel.
- `app/src/admin/lib/passwordStrength.ts` — shared password validation: `getStrength()`, `isPasswordValid()`, `PASSWORD_ERROR`, strength indicator maps
- `app/src/admin/types/index.ts` — Poi (+ color, borderColor, markerSize, flicker, maps: MapOverrides, contactName, capacity, minPeople, maxPeople, isHomeMap), MapOverrides, Category (+ borderColor, markerSize), Subcategory (+ color, borderColor, markerSize, iconId, iconUrl), Icon (+ size, flicker), Business (+ contactName) types

## Component / Data Flow

```
App.tsx (BrowserRouter, root)
  └─ AdminSection (lazy, mounted at /admin/*)
      └─ AuthGuard (gates on admin | content_manager; unauthenticated → redirect to /)
          └─ AppLayout (Sidebar nav + Outlet)
              ├─ DashboardPage (stats overview + settings: pin size, contact info, terms upload)
              ├─ PoisPage → navigates to /admin/pois/:id
              ├─ PoiEditPage (full-page POI editor; per-map price/active; delete hidden for CM role)
              ├─ CategoriesPage → CategoryModal (+ order field)
              ├─ SubcategoriesPage → SubcategoryModal (+ icon picker)
              ├─ IconsPage (direct upload/delete)
              ├─ MapSettingsPage
              ├─ UsersPage (admin-only via AdminOnlyRoute)
              └─ AnalyticsPage (admin-only via AdminOnlyRoute)

Sidebar: nav links filtered by useAuth().role — /users is adminOnly ("משתמשים")
         "← המפה" link back to map
         "שנה סיסמה" button opens ChangePasswordModal
```

## Patterns & Conventions

- Uses react-router-dom v7 for routing
- Map picker uses Leaflet + OpenStreetMap (NOT Google Maps) — no API key needed
- Admin Poi type uses empty strings for optional fields; user-web uses null
- Storage paths: POI images in `poi-media/{uuid}.{ext}`, icons in `icons/{uuid}.{ext}`
- Role check is via custom claims (`request.auth.token.role`), NOT Firestore reads

## Gotchas

- MapPicker must NOT be wrapped in a `<form>` — it's embedded in PoiEditPage's form, nested forms cause page refresh
- Nominatim geocoding uses `Accept-Language: he` for Hebrew results
- `createBusinessUser` callable sets BOTH `role` AND `businessRef` custom claims
- When adding new editable fields to POIs, also update the Firestore rules `affectedKeys().hasOnly(...)` allowlist
- Icon documents use `path` field (NOT `url` or `storagePath`)
- PoiEditPage form: Enter key is prevented from submitting (onKeyDown handler). POIs have per-map `maps` field with `agents` and `groups` sub-objects (each has `price` and `active`).
- POIs sorted by name ascending (client-side). Search is by name only (not description).
- Required fields: name, phone, whatsapp, description, image (at least 1). Required labels have red asterisk.
- Bold text: `**bold**` in description. Small toolbar button wraps selection in `**...**`.
- Content managers: cannot delete POIs (delete button hidden via useUserRole check), cannot see Users page (admin-only)
- Password quality: min 8 chars, 1 letter + 1 number. Shared via `lib/passwordStrength.ts`.
