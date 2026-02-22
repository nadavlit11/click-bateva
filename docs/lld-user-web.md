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
    │   └── index.ts            Poi, Category, Subcategory interfaces
    ├── lib/
    │   ├── firebase.ts         initializeApp, getFirestore, emulator gated on VITE_USE_EMULATOR
    │   ├── filterPois.ts       filterPois() + PoiFilter interface
    │   ├── openingStatus.ts    getOpeningStatusText(), DAY_KEYS, DAY_NAMES_HE
    │   └── colorUtils.ts       lighten(), lightenBorder()
    ├── hooks/
    │   └── useFirestoreData.ts  usePois, useCategories, useSubcategories (onSnapshot hooks)
    └── components/
        ├── Sidebar/
        │   ├── Sidebar.tsx         flex-col container (w-80, shadow)
        │   ├── AppHeader.tsx       logo icon + "קליק בטבע" + "גלה את ישראל"
        │   ├── SearchBar.tsx       text input, emits searchQuery
        │   ├── CategoryGrid.tsx    2-col grid of category chips
        │   ├── SubcategoryFilter.tsx  per-category subcategory pills, grouped by group
        │   └── SidebarFooter.tsx   count text + "נקה הכל" button; upward shadow via z-index
        ├── MapView/
        │   ├── MapView.tsx     APIProvider + Map (center Israel, zoom 8); bounds south=28.5
        │   ├── PoiMarker.tsx   AdvancedMarker with teardrop div + label
        │   └── PoiDetailPanel.tsx  slide-up detail panel; image carousel; quick-action icon row (call, navigate, whatsapp, website, facebook); restaurant buttons; max-h uses 100dvh
        └── BottomSheet/
            └── BottomSheet.tsx   mobile filter panel; collapses to chip row peek; scroll fade indicator
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

export interface Subcategory {
  id: string;
  categoryId: string;     // which category this refines
  name: string;           // Hebrew e.g. "כשר", "זול"
  group: string | null;   // free-text group name for AND-across-groups logic e.g. "כשרות", "מחיר"; null = ungrouped
}

export interface Poi {
  id: string;
  name: string;
  description: string;
  location: { lat: number; lng: number };  // converted from Firestore GeoPoint
  mainImage: string | null;
  images: string[];       // all images for carousel
  videos: string[];       // video URLs (YouTube embeds or external links)
  phone: string | null;
  email: string | null;
  website: string | null;
  openingHours: Record<string, DayHours | null> | string | null; // structured, 'by_appointment', or legacy string
  price: string | null;
  kashrutCertUrl: string | null;  // kashrut certificate image (restaurants only)
  menuUrl: string | null;         // menu image (restaurants only)
  facebook: string | null;        // Facebook page URL
  categoryId: string;
  subcategoryIds: string[]; // subcategory IDs for per-category filtering
  // Note: `active` is NOT in the frontend type — the Firestore query filters
  // where("active", "==", true), so inactive POIs never reach the frontend.
}
```

---

## 4. State Architecture

All filter state lives in `App.tsx` (lifted state — no Redux/Zustand needed for MVP).

```
App.tsx
  ├── pois: Poi[]                           ← from usePois()
  ├── categories: Category[]                ← useCategories()
  ├── subcategories: Subcategory[]          ← useSubcategories()
  ├── selectedCategories: Set<string>       ← filter: category IDs (required — no POIs shown when empty)
  ├── selectedSubcategories: Set<string>    ← filter: subcategory IDs (per-category)
  ├── searchQuery: string                   ← filter: text search
  ├── selectedPoi: Poi | null               ← for POI detail popup
  └── filteredPois: Poi[]                   ← derived: filterPois(pois, { ... }) via useMemo
```

**Filtering logic** (in `lib/filterPois.ts`):
```typescript
export interface PoiFilter {
  selectedCategories: Set<string>;     // required — empty Set means no POIs shown
  selectedSubcategories: Set<string>;
  searchQuery: string;
  subcategories: Subcategory[];        // for categoryId + group lookup
}

// Per-category subcategory logic:
// Build: category → group → selected subcategory IDs
const subsByCategory = new Map<string, Map<string | null, Set<string>>>();
for (const subId of selectedSubcategories) {
  const sub = subcategories.find(s => s.id === subId);
  // ... populate subsByCategory
}
// In pois.filter():
// AND-across-subcategory-groups, OR-within-group, scoped to POI's category
const catGroups = subsByCategory.get(poi.categoryId);
const matchesSubcategory = !catGroups ||
  Array.from(catGroups.values()).every(
    groupSet => (poi.subcategoryIds ?? []).some(s => groupSet.has(s))
  );
// POIs in unselected categories always pass the subcategory check
```

**toggleCategory** also clears `selectedSubcategories` for the deselected category.
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
  subcategories: Subcategory[];
  selectedCategories: Set<string>;
  selectedSubcategories: Set<string>;
  searchQuery: string;
  filteredCount: number;
  onCategoryToggle: (id: string) => void;
  onSubcategoryToggle: (id: string) => void;
  onSearchChange: (q: string) => void;
  onClearAll: () => void;
}
```
Order of children: SearchBar → CategoryGrid → SubcategoryFilter → SidebarFooter.

### CategoryGrid.tsx
```typescript
interface CategoryGridProps {
  categories: Category[];
  selectedCategories: Set<string>;
  onToggle: (id: string) => void;
}
```
Each chip background derived from `category.color` (rgba with low opacity). Active state: colored border + `outline` ring.

### SubcategoryFilter.tsx
```typescript
interface SubcategoryFilterProps {
  categories: Category[];
  subcategories: Subcategory[];
  selectedCategories: Set<string>;
  selectedSubcategories: Set<string>;
  onToggle: (id: string) => void;
}
```
- Shows hint text ("בחר קטגוריה לסינון מפורט") when no category with subcategories is selected.
- Auto-expands when exactly 1 category with subcategories is selected; collapsed by default for multiple.
- Each category section is toggled with a header button (◂ collapsed, ▾ expanded — RTL-correct).
- Subcategory pills grouped by `group` field, with null-group last.

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

// Emulator only when VITE_USE_EMULATOR=true — NOT import.meta.env.DEV,
// which would connect every local dev server to the emulator even against prod data.
if (import.meta.env.VITE_USE_EMULATOR === 'true') {
  connectFirestoreEmulator(db, "127.0.0.1", 8080);
}
```

### hooks/useFirestoreData.ts

All Firestore data hooks are co-located in a single file:

```typescript
export function usePois(): Poi[] {
  // onSnapshot("points_of_interest", where("active", "==", true))
  // doc.data().location is a Firestore GeoPoint → convert to { lat, lng }
  // maps subcategoryIds: doc.data().subcategoryIds ?? []
}

export function useCategories(): Category[] {
  // onSnapshot("categories")
}

export function useSubcategories(): Subcategory[] {
  // onSnapshot("subcategories")
  // maps group: doc.data().group ?? null
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
| 4.3 | Category + subcategory + search filtering fully wired up | Yes |
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
| Expanded | Slides up to ~70% of viewport height; shows full filter UI (SearchBar, CategoryGrid, SubcategoryFilter, SidebarFooter) |

**Interaction:**
- A drag-handle bar sits at the top of the sheet.
- Tapping anywhere on the peeking area expands the sheet.
- A semi-transparent backdrop appears when expanded; tapping it collapses the sheet.

**Animation:** `transition: transform 300ms ease` (CSS transform-based slide).

**Props:** Mirror `SidebarProps` — same filter state, same callbacks — plus `expanded`/`onExpandedChange`.

```typescript
interface BottomSheetProps {
  categories: Category[];
  subcategories: Subcategory[];
  selectedCategories: Set<string>;
  selectedSubcategories: Set<string>;
  searchQuery: string;
  filteredCount: number;
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
  onCategoryToggle: (id: string) => void;
  onSubcategoryToggle: (id: string) => void;
  onSearchChange: (q: string) => void;
  onClearAll: () => void;
}
```

**Scroll fade indicator:** An absolutely-positioned fade gradient + ⌄ arrow appears at the bottom of the scroll area when content overflows. State initialized on mount via `requestAnimationFrame(checkScroll)` in a `useEffect` that depends on `[expanded, selectedCategories, selectedSubcategories]` (Sets have new identity on each toggle, so this fires on every selection change — intended).
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
  │           ├── SubcategoryFilter
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
