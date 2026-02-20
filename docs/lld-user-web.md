# LLD: apps/user-web — User-Facing Map App

## Context

The user-facing web app is being built before the admin/business dashboards to get visible features live faster. Phases 1.5, 1.6, and 4.5 (click tracking, security rules tests) are deferred. Design chosen: **design-1-light** — white sidebar (right, RTL), 2-column category grid chips, teardrop POI markers with name labels, Rubik font, Hebrew first.

---

## 1. Tech Stack

| Concern | Choice |
|---|---|
| Build tool | Vite |
| Framework | React 18 + TypeScript |
| Styling | Tailwind CSS v4 (`@tailwindcss/vite` plugin) |
| Map | `@vis.gl/react-google-maps` |
| Database | Firebase Firestore (via Firebase SDK v12+) |
| Font | Rubik (Google Fonts — supports Hebrew) |
| Language | Hebrew (RTL first) |

---

## 2. Directory Structure

```
apps/user-web/
├── index.html                  lang="he" dir="rtl"
├── vite.config.ts
├── tsconfig.json
├── package.json
├── .env.local                  (gitignored — real values)
├── .env.example                (committed — empty placeholders)
└── src/
    ├── main.tsx                ReactDOM.createRoot
    ├── App.tsx                 Root: h-screen flex, lifted filter state
    ├── index.css               @import "tailwindcss"; Rubik font
    ├── types/
    │   └── index.ts            Poi, Category, Tag interfaces
    ├── data/
    │   └── defaults.ts         Hardcoded categories + tags for Phase 4.1
    ├── lib/
    │   └── firebase.ts         initializeApp, getFirestore, emulator in DEV
    ├── hooks/                  (Phase 4.2+)
    │   ├── usePois.ts          onSnapshot active POIs
    │   ├── useCategories.ts    onSnapshot categories
    │   └── useTags.ts          onSnapshot tags
    └── components/
        ├── Sidebar/
        │   ├── Sidebar.tsx     flex-col container (w-80, shadow)
        │   ├── AppHeader.tsx   logo icon + "קליק בטבע" + "גלה את ישראל"
        │   ├── SearchBar.tsx   text input, emits searchQuery
        │   ├── CategoryGrid.tsx 2-col grid of category chips
        │   ├── TagList.tsx     wrapping flex of tag pills
        │   └── SidebarFooter.tsx count text + "נקה הכל" button
        └── MapView/
            ├── MapView.tsx     APIProvider + Map (center Israel, zoom 8)
            └── PoiMarker.tsx   AdvancedMarker with teardrop div + label (Phase 4.2)
```

---

## 3. TypeScript Types

```typescript
// src/types/index.ts

export interface Category {
  id: string;
  name: string;       // Hebrew e.g. "מסעדות"
  color: string;      // hex e.g. "#FF5733" — used for marker gradient
  iconUrl: string | null;
}

export interface Tag {
  id: string;
  name: string;       // Hebrew e.g. "מתאים למשפחות"
}

export interface Poi {
  id: string;
  name: string;
  description: string;
  location: { lat: number; lng: number };  // converted from Firestore GeoPoint
  mainImage: string | null;
  categoryId: string;
  tags: string[];     // tag IDs
  // Note: `active` is NOT in the frontend type — the Firestore query filters
  // where("active", "==", true), so inactive POIs never reach the frontend.
}
```

---

## 4. State Architecture

All filter state lives in `App.tsx` (lifted state — no Redux/Zustand needed for MVP).

```
App.tsx
  ├── pois: Poi[]                       ← Phase 4.1: []; Phase 4.2+: from usePois()
  ├── categories: Category[]            ← Phase 4.1: DEFAULT_CATEGORIES; Phase 4.2+: useCategories()
  ├── tags: Tag[]                       ← Phase 4.1: DEFAULT_TAGS; Phase 4.3+: useTags()
  ├── selectedCategories: Set<string>   ← filter: category IDs
  ├── selectedTags: Set<string>         ← filter: tag IDs
  ├── searchQuery: string               ← filter: text search
  ├── selectedPoi: Poi | null           ← for POI detail popup (Phase 4.4)
  └── filteredPois: Poi[]               ← derived: useMemo over pois + all filters
```

**Filtering logic** (client-side, Phase 4.3+):
```typescript
const filteredPois = useMemo(() => pois.filter(poi => {
  const matchesCategory = selectedCategories.size === 0
    || selectedCategories.has(poi.categoryId);
  const matchesTags = selectedTags.size === 0
    || poi.tags.some(t => selectedTags.has(t));
  const matchesSearch = !searchQuery
    || poi.name.includes(searchQuery);
  return matchesCategory && matchesTags && matchesSearch;
}), [pois, selectedCategories, selectedTags, searchQuery]);
```

**When to consider Zustand:** If the app grows to multiple routes that need to share filter state across navigation, or the `selectedPoi` popup triggers complex cross-component behavior.

---

## 5. Component API (Props)

### App.tsx
No props. Owns all state. Renders `<Sidebar>` + `<MapView>` in RTL flex layout.

### Sidebar.tsx
```typescript
interface SidebarProps {
  categories: Category[];
  tags: Tag[];
  selectedCategories: Set<string>;
  selectedTags: Set<string>;
  searchQuery: string;
  filteredCount: number;
  onCategoryToggle: (id: string) => void;
  onTagToggle: (id: string) => void;
  onSearchChange: (q: string) => void;
  onClearAll: () => void;
}
```

### CategoryGrid.tsx
```typescript
interface CategoryGridProps {
  categories: Category[];
  selectedCategories: Set<string>;
  onToggle: (id: string) => void;
}
```
Each chip background derived from `category.color` (rgba with low opacity). Active state: colored border + `outline` ring.

### TagList.tsx
```typescript
interface TagListProps {
  tags: Tag[];
  selectedTags: Set<string>;
  onToggle: (id: string) => void;
}
```
Active state: `bg-green-500 text-white`.

### MapView.tsx
```typescript
interface MapViewProps {
  pois: Poi[];
  categories: Category[];  // for marker color lookup
  onPoiClick: (poi: Poi) => void;
}
```

### PoiMarker.tsx (Phase 4.2)
```typescript
interface PoiMarkerProps {
  poi: Poi;
  color: string;   // hex from matching category
  onClick: () => void;
}
```
Renders inside `<AdvancedMarker position={poi.location}>`. Custom div: CSS-only teardrop shape + white pill label below.

---

## 6. Data Layer

### lib/firebase.ts
```typescript
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const db = getFirestore(app);

if (import.meta.env.DEV) {
  connectFirestoreEmulator(db, "127.0.0.1", 8080);
}
```

### hooks/usePois.ts (Phase 4.2)
```typescript
export function usePois(): Poi[] {
  // onSnapshot("points_of_interest", where("active", "==", true))
  // doc.data().location is a Firestore GeoPoint → convert to { lat, lng }
}
```

### hooks/useCategories.ts (Phase 4.2)
```typescript
export function useCategories(): Category[] {
  // onSnapshot("categories")
}
```

### hooks/useTags.ts (Phase 4.3)
```typescript
export function useTags(): Tag[] {
  // onSnapshot("tags")
}
```

---

## 7. Environment Config

**apps/user-web/.env.local** (gitignored):
```
VITE_GOOGLE_MAPS_API_KEY=<Maps API key>
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=click-bateva.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=click-bateva
VITE_FIREBASE_STORAGE_BUCKET=click-bateva.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```
Firebase config comes from Firebase Console → Project Settings → General → Your apps (web).

---

## 8. Map Configuration

- Default center: `{ lat: 31.5, lng: 34.8 }` (center of Israel)
- Default zoom: `8` (whole country view)
- `mapId="DEMO_MAP_ID"` for local dev (enables AdvancedMarker without creating a real Map ID)
- `gestureHandling="greedy"` — single-finger scroll on touch devices

---

## 9. RTL Layout

```tsx
// In RTL flex, first child renders on the RIGHT.
// Sidebar is the first child → renders on right. Map fills the rest.
<div className="h-screen w-screen flex overflow-hidden">
  <Sidebar ... />   {/* right side */}
  <main className="flex-1 h-full">
    <MapView ... />
  </main>
</div>
```
No explicit `dir="rtl"` on the div — it inherits from `<html dir="rtl">`.

---

## 10. Phase Breakdown

| Phase | What gets built | Firebase needed? |
|---|---|---|
| 4.1 ✅ | Map of Israel (no markers) + full Sidebar shell (hardcoded data) | No |
| 4.2 | Real POI markers from Firestore, colored by category | Yes — usePois, useCategories |
| 4.3 | Category + tag + search filtering fully wired up | Yes — useTags |
| 4.4 | POI detail popup (info panel or modal) | No new queries |
