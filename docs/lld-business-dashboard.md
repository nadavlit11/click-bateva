# LLD: apps/business — Business Dashboard

## Context

The business dashboard is a role-gated single-page app for business owners to view and edit the POIs assigned to their business. Access is restricted to `business_user` roles via Firebase Auth custom claims. Business users can edit a limited subset of POI fields (description, images, videos, phone, email, website) and cannot create, delete, or structurally modify POIs.

Deployed at: https://click-bateva-biz.web.app (Firebase Hosting target — TBD, not yet created)

---

## 1. Tech Stack

| Concern | Choice |
|---|---|
| Build tool | Vite |
| Framework | React 18 + TypeScript |
| Styling | Tailwind CSS v4 (`@tailwindcss/vite` plugin) |
| Routing | react-router-dom v7 |
| Database | Firebase Firestore (SDK v12+) |
| Storage | Firebase Cloud Storage |
| Auth | Firebase Auth (Email/Password) |
| Font | Rubik (Google Fonts) |
| Language | Hebrew (RTL) |

No Leaflet/map dependency — business users do not manage location data.

---

## 2. Directory Structure

```
apps/business/
├── index.html                  lang="he" dir="rtl"
├── vite.config.ts
├── package.json
├── .env.local                  (gitignored — real values)
├── .env.example                (committed — empty placeholders)
└── src/
    ├── main.tsx
    ├── App.tsx                 BrowserRouter + routes + BusinessProvider
    ├── index.css               @import "tailwindcss"
    ├── types/
    │   └── index.ts            Poi (business subset), Business
    ├── lib/
    │   └── firebase.ts         initializeApp, db, auth, storage; emulator in DEV
    ├── context/
    │   └── BusinessContext.tsx createContext, BusinessProvider, useBusinessContext
    ├── pages/
    │   ├── LoginPage.tsx       signInWithEmailAndPassword; Hebrew error messages
    │   ├── PoisListPage.tsx    grid of POI cards for the business's assigned POIs
    │   ├── PoiEditPage.tsx     edit allowed fields + image upload for one POI
    │   └── ErrorPage.tsx       shown when no business record is found for the user
    └── components/
        ├── AuthGuard.tsx       onAuthStateChanged + getIdTokenResult(); gate on business_user; loads business from claim
        ├── PoiCard.tsx         card showing POI name, mainImage, description snippet; links to /pois/:poiId
        ├── ImageUploader.tsx   upload images to poi-media/; renders preview list; supports delete
        └── Layout/
            ├── AppLayout.tsx   flex layout: TopBar + <Outlet />
            └── TopBar.tsx      business name + signOut button
```

---

## 3. Routing

```
/login           → LoginPage (public)
/ (index)        → PoisListPage (auth-gated)
/pois/:poiId     → PoiEditPage (auth-gated)
/error           → ErrorPage (public — no business record found)
```

`AuthGuard` wraps all authenticated routes via `<Route element={<AuthGuard />}>`. Unauthenticated users are redirected to `/login`. Authenticated users without a `business_user` role see an inline "אין לך הרשאה" unauthorized message. Authenticated `business_user` with no matching business record are redirected to `/error`.

---

## 4. Auth Flow

```
AuthGuard:
  onAuthStateChanged(auth, async user => {
    if (!user) → redirect to /login

    const { claims } = await user.getIdTokenResult()

    if claims.role !== 'business_user' → show "אין לך הרשאה" (unauthorized screen)

    // businessRef is a Firestore resource path stored in custom claims
    // e.g. "projects/click-bateva/databases/(default)/documents/businesses/abc123"
    const businessRef = claims.businessRef   // full resource path string
    if (!businessRef) → redirect to /error

    // Extract businessId from the resource path (last segment)
    const businessId = businessRef.split('/').pop()

    // Read the business document to get businessName
    const bizSnap = await getDoc(doc(db, 'businesses', businessId))
    if (!bizSnap.exists()) → redirect to /error

    // Provide { businessId, businessName } via BusinessContext
    setBusinessContext({ businessId, businessName: bizSnap.data().name })
    → render <Outlet />
  })
```

**Key rule from Firestore security rules:** Business users may only read their own `businesses` document when `request.auth.token.businessRef` matches the document path. The `businessId` must therefore be derived from the `businessRef` custom claim, not from a `where("ownerUid", "==", user.uid)` query (which would be denied by the rules).

**POI update authorisation** (enforced server-side by Firestore rules): The user's `uid` must appear in `businesses/{businessId}.associatedUserIds`. The business record created by admin must include the business user's UID in the `associatedUserIds` array.

---

## 5. TypeScript Types

```typescript
// src/types/index.ts

// Full POI shape as stored in Firestore (mirrors apps/admin types)
export interface Poi {
  id: string
  name: string
  description: string
  location: { lat: number; lng: number }
  mainImage: string         // '' means no image
  images: string[]          // ordered URLs
  videos: string[]          // video URLs
  phone: string             // '' means no phone
  email: string
  website: string           // '' means no website (domain only)
  categoryId: string
  businessId: string | null
  active: boolean
  openingHours: Record<string, DayHours | null> | string | null
  price: string | null
  createdAt: unknown        // Firestore serverTimestamp
  updatedAt: unknown
}

// The subset of Poi fields that a business user may edit.
// Used to type the edit form state and the Firestore updateDoc payload.
export interface PoiEditableFields {
  description: string
  images: string[]          // ordered URLs after upload
  videos: string[]          // video URLs
  phone: string
  email: string
  website: string
}

// Business record from the `businesses` Firestore collection
export interface Business {
  id: string
  name: string
  ownerUid: string
  associatedUserIds: string[]   // UIDs allowed to edit this business's POIs
  createdAt: unknown
  updatedAt: unknown
}

// Value stored in BusinessContext after successful auth
export interface BusinessContextValue {
  businessId: string
  businessName: string
}
```

**Read-only fields** (displayed in PoiEditPage but not editable by business users): `name`, `location`, `mainImage`, `categoryId`, `active`, `openingHours`, `price`.

---

## 6. Firestore Collections Used

| Collection | Operations | Notes |
|---|---|---|
| `businesses` | read single document by `businessId` | `businessId` extracted from `claims.businessRef`; read is allowed only when claim path matches |
| `points_of_interest` | read list (`where("businessId", "==", businessId)`), read single doc, update (`PoiEditableFields` + `updatedAt`) | Inactive POIs are included in results (business users can see and edit their own inactive POIs) |

**POI query for the list page:**
```typescript
query(
  collection(db, 'points_of_interest'),
  where('businessId', '==', businessId)
)
```

The Firestore rule for `points_of_interest` allows read if `resource.data.active == true` OR the user is an admin/content manager. Business users reading inactive POIs that belong to them will be denied by the current rules unless the rule is updated. **Implementation note:** confirm with admin whether inactive POIs should appear in the business dashboard, and update the Firestore rule to `allow read: if resource.data.active == true || isAdminOrContentManager() || (isBusinessUser() && resource.data.businessId != null && get(...).data.associatedUserIds.hasAny([request.auth.uid]))` if needed.

---

## 7. Storage

POI images are uploaded to Cloud Storage under the shared `poi-media/` prefix (same bucket used by admin):

- **Upload path:** `poi-media/{uuid}.{ext}`
- `getDownloadURL()` is called after upload; the resulting URL is appended to the `images` array in the POI document.
- **Delete:** removing an image removes its URL from the `images` array in Firestore. Storage object deletion is optional (admin can GC orphans).
- `mainImage` is read-only for business users — it is set by admin only. Uploaded images appear in `images[]` only.

---

## 8. BusinessContext

```typescript
// src/context/BusinessContext.tsx

interface BusinessContextValue {
  businessId: string
  businessName: string
}

const BusinessContext = createContext<BusinessContextValue | null>(null)

export function BusinessProvider({
  children,
  value,
}: {
  children: React.ReactNode
  value: BusinessContextValue
}) {
  return (
    <BusinessContext.Provider value={value}>
      {children}
    </BusinessContext.Provider>
  )
}

export function useBusinessContext(): BusinessContextValue {
  const ctx = useContext(BusinessContext)
  if (!ctx) throw new Error('useBusinessContext must be used inside BusinessProvider')
  return ctx
}
```

`BusinessProvider` is rendered by `AuthGuard` (not `App.tsx`) once the business record has been successfully loaded. All auth-gated pages can call `useBusinessContext()` to get `{ businessId, businessName }` without re-fetching from Firestore.

---

## 9. Environment Config

**apps/business/.env.local** (gitignored):
```
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=click-bateva.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=click-bateva
VITE_FIREBASE_STORAGE_BUCKET=click-bateva.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

**apps/business/.env.example** (committed, all values empty):
```
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

Firebase config values come from Firebase Console → Project Settings → General → Your apps (web). Use the same Firebase project (`click-bateva`) as admin and user-web.

---

## 10. Phase Breakdown

| Sub-phase | What gets built |
|---|---|
| 3.1 | Project scaffold — `apps/business`, Vite config, Tailwind, routing skeleton, AppLayout, TopBar |
| 3.2 | Auth — LoginPage, AuthGuard (role check + businessRef claim parsing + business doc read), BusinessContext, ErrorPage |
| 3.3 | POI list — PoisListPage queries `points_of_interest` by `businessId`, renders PoiCard grid |
| 3.4 | POI edit — PoiEditPage loads single POI, shows read-only fields, edit form for `PoiEditableFields`, ImageUploader, save via `updateDoc` |
