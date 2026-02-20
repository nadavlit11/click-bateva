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
        ├── MapView/
        │   ├── MapView.tsx     APIProvider + Map (center Israel, zoom 8)
        │   └── PoiMarker.tsx   AdvancedMarker with teardrop div + label (Phase 4.2)
        └── BottomSheet/
            └── BottomSheet.tsx   mobile filter panel; collapses to chip row peek
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
  images: string[];       // all images for carousel (Phase 4.4)
  phone: string | null;
  email: string | null;
  website: string | null;
  categoryId: string;
  tags: string[];         // tag IDs
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
| 4.6 | Mobile bottom sheet layout | No new Firebase |

---

## 11. Mobile Layout (Bottom Sheet)

### Overview

The chosen mobile UX pattern is **Design א — bottom sheet**. On screens narrower than the `md` breakpoint (768px), the right-side Sidebar is hidden and replaced by a bottom sheet that peeks from the bottom of the screen. The map fills the full viewport.

### Breakpoint boundary

`md` (768px) is the desktop/mobile boundary:

- `md+` (desktop): RTL flex row — Sidebar on right, MapView fills left remainder.
- `< md` (mobile): MapView fills full screen; BottomSheet and PoiDetailPanel overlay the map as absolutely-positioned layers.

### Root layout structure

```tsx
// App.tsx — root wrapper uses h-dvh instead of h-screen to account for
// mobile browser chrome (address bar) collapsing on scroll.
<div className="h-dvh w-screen flex flex-col overflow-hidden">
  {/* Desktop (md+): RTL flex row — Sidebar on right, Map fills left */}
  {/* Mobile (< md): Map fills full screen, BottomSheet overlaid     */}
</div>
```

### New state in App.tsx

```typescript
const [sheetExpanded, setSheetExpanded] = useState(false)
```

### BottomSheet component

**Location:** `src/components/BottomSheet/BottomSheet.tsx`

**Behaviour:**

| State | Description |
|---|---|
| Collapsed (default) | Peeks 120px from the bottom of the screen; shows a category chip row + result count |
| Expanded | Slides up to ~70% of viewport height; shows full filter UI (SearchBar, CategoryGrid, TagList, SidebarFooter) |

**Interaction:**
- A drag-handle bar sits at the top of the sheet.
- Tapping anywhere on the peeking area expands the sheet.
- A semi-transparent backdrop appears when expanded; tapping it collapses the sheet.

**Animation:** `transition: transform 300ms ease` (CSS transform-based slide).

**Props:** Mirror `SidebarProps` exactly — same filter state, same callbacks — so the two components are interchangeable from App.tsx's perspective.

```typescript
interface BottomSheetProps {
  categories: Category[];
  tags: Tag[];
  selectedCategories: Set<string>;
  selectedTags: Set<string>;
  searchQuery: string;
  filteredCount: number;
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
  onCategoryToggle: (id: string) => void;
  onTagToggle: (id: string) => void;
  onSearchChange: (q: string) => void;
  onClearAll: () => void;
}
```

### POI detail on mobile

`PoiDetailPanel` slides up from the bottom (full-width, ~85% viewport height) instead of the desktop side panel. The same component is used; desktop vs. mobile positioning is controlled via responsive Tailwind classes inside the component.

### Mobile component tree

```
App.tsx
  ├── <Sidebar>  (hidden on mobile via md:flex — desktop only)
  ├── <main className="flex-1 relative">
  │     └── <MapView> (full screen on mobile)
  ├── <BottomSheet expanded={sheetExpanded} onExpandedChange={setSheetExpanded} ...>
  │     │   (absolute, bottom-0, z-20 — mobile only, hidden on md+)
  │     ├── SheetHandle        — drag handle bar
  │     ├── ChipRow            — category chips (always visible when peeking)
  │     ├── ResultCount        — e.g. "12 מקומות"
  │     └── [expanded only]
  │           ├── SearchBar
  │           ├── CategoryGrid
  │           ├── TagList
  │           └── SidebarFooter
  └── {selectedPoi && <PoiDetailPanel>}
        (absolute, bottom-0, z-30 — slides up when selectedPoi != null)
```

### Visibility control

```tsx
{/* Sidebar — desktop only */}
<Sidebar className="hidden md:flex" ... />

{/* BottomSheet — mobile only */}
<BottomSheet className="md:hidden absolute bottom-0 left-0 right-0 z-20" ... />
```
