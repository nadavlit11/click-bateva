# Business Dashboard

## Key Files

- `apps/business/src/App.tsx` — BrowserRouter + routes + BusinessProvider
- `apps/business/src/components/AuthGuard.tsx` — gates on `business_user` role; extracts businessId from `businessRef` custom claim; loads business doc; provides BusinessContext
- `apps/business/src/context/BusinessContext.tsx` — createContext/Provider/useBusinessContext for `{ businessId, businessName }`
- `apps/business/src/pages/PoisListPage.tsx` — grid of PoiCards for business's assigned POIs
- `apps/business/src/pages/PoiEditPage.tsx` — edit form for PoiEditableFields + ImageUploader
- `apps/business/src/components/ImageUploader.tsx` — upload to `poi-media/`, preview list, delete
- `apps/business/src/types/index.ts` — Poi, PoiEditableFields, Business, BusinessContextValue

## Component / Data Flow

```
App.tsx (BrowserRouter)
  └─ AuthGuard
      ├─ Extracts businessId from claims.businessRef (last path segment)
      ├─ Reads business doc from Firestore
      └─ BusinessProvider({ businessId, businessName })
          └─ AppLayout (TopBar + Outlet)
              ├─ PoisListPage — query: where("businessId", "==", businessId)
              └─ PoiEditPage — reads single POI, saves PoiEditableFields
```

## Patterns & Conventions

- BusinessId derived from `businessRef` custom claim path (NOT from a Firestore query)
- `PoiEditableFields`: description, images, videos, phone, email, website — only these fields are editable
- Read-only fields displayed but not editable: name, location, mainImage, categoryId, active, openingHours, price
- Business users CAN see their own inactive POIs (unlike public users)
- No Leaflet/map dependency — business users don't manage location

## Gotchas

- `businessRef` claim format: `/databases/(default)/documents/businesses/${uid}` — string, not path type
- POI update authorization: user's UID must be in `businesses/{businessId}.associatedUserIds` (enforced by Firestore rules)
- Business read rule: `request.auth.uid == businessId` (business doc ID = owner UID)
- When saving optional fields, use `.trim() || null` to avoid empty strings
- When adding new fields to `PoiEditableFields`, update BOTH the TypeScript type AND the Firestore rules `affectedKeys().hasOnly(...)` allowlist
