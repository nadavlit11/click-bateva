# LLD: apps/admin — Admin Dashboard

> **Design doc** — created during initial implementation. For current architecture navigation, see `/codebase-map` (`.claude/skills/codebase-map/admin.md`).

## Context

The admin dashboard is a role-gated single-page app for managing all project content (POIs, categories, subcategories, icons). Access is restricted to `admin` and `content_manager` roles via Firebase Auth custom claims.

Deployed at: https://click-bateva.web.app

---

## 1. Tech Stack

| Concern | Choice |
|---|---|
| Build tool | Vite |
| Framework | React 19 + TypeScript |
| Styling | Tailwind CSS v4 (`@tailwindcss/vite` plugin) |
| Routing | react-router-dom v7 |
| Map picker | react-leaflet + leaflet (OpenStreetMap tiles) |
| Geocoding | Nominatim (openstreetmap.org, no API key) |
| Database | Firebase Firestore (SDK v12+) |
| Storage | Firebase Cloud Storage |
| Auth | Firebase Auth (Email/Password) |
| Font | Rubik (Google Fonts) |
| Language | Hebrew (RTL) |

---

## 2. Directory Structure

```
apps/admin/
├── index.html                  lang="he" dir="rtl"
├── vite.config.ts
├── package.json
├── .env.local                  (gitignored — real values)
├── .env.example                (committed — empty placeholders)
└── src/
    ├── main.tsx
    ├── App.tsx                 BrowserRouter + routes
    ├── index.css               @import "tailwindcss"
    ├── types/
    │   └── index.ts            Poi, Category, Subcategory, Icon
    ├── lib/
    │   └── firebase.ts         initializeApp, db, auth, storage; emulator in DEV
    ├── pages/
    │   ├── LoginPage.tsx           signInWithEmailAndPassword; Hebrew error messages
    │   ├── DashboardPage.tsx       stats overview (POIs, categories, subcategories, businesses)
    │   ├── PoisPage.tsx            list POIs + open PoiDrawer
    │   ├── CategoriesPage.tsx      list + CategoryModal
    │   ├── SubcategoriesPage.tsx   list grouped by category + SubcategoryModal
    │   ├── IconsPage.tsx           upload + list + delete icons
    │   ├── BusinessesPage.tsx      list + edit button + BusinessModal (create + edit modes)
    │   ├── UsersPage.tsx           content manager management (list, delete, block); admin-only
    │   └── AnalyticsPage.tsx       click totals per POI + per category
    ├── hooks/
    │   └── useUserRole.ts          custom hook: extracts role from getIdTokenResult() claims
    ├── lib/
    │   ├── firebase.ts             initializeApp, db, auth, storage, functions
    │   ├── errorReporting.ts       Sentry reportError wrapper
    │   └── passwordStrength.ts     getStrength(), isPasswordValid(), PASSWORD_ERROR, strength maps
    └── components/
        ├── AuthGuard.tsx           onAuthStateChanged + getIdTokenResult(); gate on admin/content_manager
        ├── CategoryModal.tsx       create/edit category; icon picker; color picker; order field
        ├── SubcategoryModal.tsx    create/edit subcategory; category select + group input + icon picker
        ├── MapPicker.tsx           Leaflet map + Nominatim search; click/drag/search to set lat/lng
        ├── PoiDrawer.tsx           slide-in panel; POI CRUD + validation + bold toolbar + icon picker; delete hidden for CM
        ├── BusinessModal.tsx       create (via callable) + edit (via Firestore) modes; password strength indicator
        ├── ChangePasswordModal.tsx change password (reauthenticate + updatePassword); strength indicator
        └── Layout/
            ├── AppLayout.tsx       flex layout: Sidebar + <Outlet />
            └── Sidebar.tsx         nav links (admin-only gating) + change password + signOut
```

---

## 3. Routing

```
/login            → LoginPage (public)
/ (index)         → DashboardPage (auth-gated)
/pois             → PoisPage (auth-gated)
/categories       → CategoriesPage (auth-gated)
/subcategories    → SubcategoriesPage (auth-gated)
/icons            → IconsPage (auth-gated)
/businesses       → BusinessesPage (auth-gated, admin-only nav)
/users            → UsersPage (auth-gated, admin-only nav)
/analytics        → AnalyticsPage (auth-gated)
```

`AuthGuard` wraps all authenticated routes via `<Route element={<AuthGuard />}>`.

---

## 4. Auth Flow

```
AuthGuard:
  onAuthStateChanged(auth, async user => {
    if (!user) → redirect to /login
    const { claims } = await user.getIdTokenResult()
    if claims.role === 'admin' || 'content_manager' → render <Outlet />
    else → show "אין לך הרשאה" (unauthorized screen)
  })
```

Role is read from **custom claims** (`request.auth.token.role`), NOT from Firestore. This means:
- The user document in Firestore may not exist yet and auth still works
- Claims are set by `onUserCreated` trigger (→ `standard_user`) and `setUserRole` callable

---

## 5. TypeScript Types

```typescript
// src/types/index.ts

export interface Poi {
  id: string
  name: string
  description: string        // supports **bold** markdown syntax
  location: { lat: number; lng: number }
  mainImage: string         // '' means no image
  images: string[]          // ordered URLs
  videos: string[]
  phone: string             // '' means no phone
  whatsapp: string          // '' means no whatsapp
  email: string
  website: string           // '' means no website (domain only)
  categoryId: string
  subcategoryIds: string[]  // subcategory IDs for per-category filter
  iconId: string            // POI-level icon override ('' = use subcategory/category default)
  iconUrl: string           // resolved icon URL for override
  businessId: string | null
  active: boolean
  openingHours: Record<string, DayHours | null> | 'by_appointment' | null
  price: string | null
  createdAt: unknown        // Firestore serverTimestamp
  updatedAt: unknown
}

export interface Category {
  id: string
  name: string
  order: number             // presentation order (sorted ascending in user-web)
  color: string             // hex e.g. "#FF5733"
  iconId: string | null     // Firestore icon doc ID
  iconUrl: string | null    // denormalized icon URL for display
  createdAt: unknown
  updatedAt: unknown
}

export interface Subcategory {
  id: string
  categoryId: string      // which category this refines
  name: string            // e.g. "כשר", "זול"
  group: string | null    // free-text group name (AND-across, OR-within); null = ungrouped
  createdAt: unknown
  updatedAt: unknown
}

export interface Icon {
  id: string
  name: string
  path: string              // Storage path e.g. 'icons/{uuid}.png'
  createdAt: unknown
}
```

**Note:** Admin `Poi` type uses empty strings for optional fields; user-web `Poi` type uses `null`. Convert on read in the user-web Firestore hook.

---

## 6. Firestore Collections Used

| Collection | Operations |
|---|---|
| `points_of_interest` | read all (admin), create, update, delete |
| `categories` | read all, create, update, delete |
| `subcategories` | read all, create, update, delete |
| `icons` | read all, create, delete |
| `businesses` | read all, create |
| `clicks` | read all (analytics aggregation) |

---

## 7. Storage

Images are uploaded to Cloud Storage:
- POI images: `poi-media/{uuid}.{ext}`
- Icons: `icons/{uuid}.{ext}`

`getDownloadURL()` is called after upload and stored in Firestore.

---

## 8. MapPicker Component

`MapPicker` (`src/components/MapPicker.tsx`) is a self-contained location picker:

- **Props:** `lat: string`, `lng: string`, `onChange: (lat, lng) => void`
- **Map:** Leaflet + OpenStreetMap tiles (no API key)
- **Search:** Nominatim geocoding — `Accept-Language: he` for Hebrew results
- **Interactions:** click anywhere → set pin; drag marker → update; search + Enter → fly to result
- **Default center:** Israel (31.5, 34.75), zoom 8; existing pin → zoom 14
- **Error feedback:** red border on input + Hebrew error message on failed search
- **Gotcha:** use `<div>` + `type="button"` for search, NOT `<form>` — MapPicker is embedded in PoiDrawer's form, and nested forms cause page refresh

---

## 9. Environment Config

**apps/admin/.env.local** (gitignored):
```
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=click-bateva.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=click-bateva
VITE_FIREBASE_STORAGE_BUCKET=click-bateva.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

---

## 10. First Admin Bootstrap

Since `onUserCreated` sets all new users to `standard_user`, use the bootstrap script to set the first admin:

```bash
GOOGLE_APPLICATION_CREDENTIALS=./serviceAccount.json node scripts/set-admin.mjs <uid>
```

Get the UID from Firebase Console → Authentication.
