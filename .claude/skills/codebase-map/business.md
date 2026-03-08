# Business Dashboard

## Key Files

- `app/src/business/BusinessSection.tsx` — lazy-loaded route definitions (mounted under `/business/*` in root App.tsx)
- `app/src/business/components/AuthGuard.tsx` — gates on `business_user` role; extracts businessId from `businessRef` custom claim; loads business doc; provides BusinessContext
- `app/src/business/context/BusinessContext.tsx` — createContext/Provider/useBusinessContext for `{ businessId, businessName }`
- `app/src/business/pages/PoisListPage.tsx` — grid of PoiCards for business's assigned POIs
- `app/src/business/pages/PoiEditPage.tsx` — edit form for PoiEditableFields + ImageUploader; VAT reminder above price; bold toolbar for description; **live preview panel** (reuses `PoiDetailPanel` from user-web with `preview` prop); two-column layout on desktop (form + sticky preview), mobile floating toggle with overlay
- `app/src/business/components/ChangePasswordModal.tsx` — change password (reauthenticate + updatePassword)
- `app/src/business/components/ImageUploader.tsx` — upload to `poi-media/`, preview list, delete
- `app/src/business/components/Layout/TopBar.tsx` — header with business name + "שנה סיסמה" + "התנתקות" buttons
- `app/src/business/lib/passwordStrength.ts` — shared password validation (same as admin, per-app copy)
- `app/src/business/types/index.ts` — Poi (+ whatsapp), PoiEditableFields (+ whatsapp), Business, BusinessContextValue

## Component / Data Flow

```
App.tsx (BrowserRouter, root)
  └─ BusinessSection (lazy, mounted at /business/*)
      └─ AuthGuard (gates on business_user; unauthenticated → redirect to /)
          ├─ Extracts businessId from claims.businessRef (last path segment)
          ├─ Reads business doc from Firestore
          └─ BusinessProvider({ businessId, businessName })
              └─ AppLayout (TopBar + Outlet)
                  ├─ PoisListPage — query: where("businessId", "==", businessId)
                  └─ PoiEditPage — reads single POI + full Category, saves PoiEditableFields
                       └─ PoiDetailPanel (preview=true) — live preview, updates from form state via useMemo adapter

MapApp: useEffect watches `role` — redirects `business_user` to `/business/` on login
TopBar: "← המפה" link back to map (to="/")
```

## Patterns & Conventions

- BusinessId derived from `businessRef` custom claim path (NOT from a Firestore query)
- `PoiEditableFields`: description, images, videos, phone, whatsapp, email, website — only these fields are editable
- Read-only fields displayed but not editable: name, location, mainImage, categoryId, active, openingHours, price
- VAT reminder note shown above price in read-only view
- Business users CAN see their own inactive POIs (unlike public users)
- No Leaflet/map dependency — business users don't manage location

## Gotchas

- `businessRef` claim format: `/databases/(default)/documents/businesses/${uid}` — string, not path type
- POI update authorization: user's UID must be in `businesses/{businessId}.associatedUserIds` (enforced by Firestore rules)
- Business read rule: `request.auth.uid == businessId` (business doc ID = owner UID)
- When saving optional fields, use `.trim() || null` to avoid empty strings
- When adding new fields to `PoiEditableFields`, update BOTH the TypeScript type AND the Firestore rules `affectedKeys().hasOnly(...)` allowlist
- Password quality validation: min 8 chars, 1 letter + 1 number. Shared via `lib/passwordStrength.ts` (per-app copy, not shared package)
- Bold text: `**bold**` in description. Small toolbar button wraps selection in `**...**`.
