# User-Web Map App

## Key Files

- `apps/user-web/src/App.tsx` — root component, owns ALL state (filters, selected POI, sheet expand), renders Sidebar + MapView + BottomSheet + PoiDetailPanel
- `apps/user-web/src/components/MapView/MapView.tsx` — APIProvider + Map wrapper, renders PoiMarker for each filtered POI
- `apps/user-web/src/components/MapView/PoiMarker.tsx` — AdvancedMarker with CSS teardrop pin (28px) + white pill name label; inline styles only
- `apps/user-web/src/components/MapView/PoiDetailPanel.tsx` — slide-up detail panel; image carousel; quick-action row (call, navigate, whatsapp, website, facebook); restaurant buttons (kashrut cert, menu)
- `apps/user-web/src/components/Sidebar/Sidebar.tsx` — desktop filter panel (hidden on mobile); children: AppHeader, SearchBar, CategoryGrid, SubcategoryFilter, SidebarFooter
- `apps/user-web/src/components/BottomSheet/BottomSheet.tsx` — mobile filter panel; collapsed peek (120px, category chips + count) / expanded (~70vh, full filters)
- `apps/user-web/src/hooks/useFirestoreData.ts` — `usePois()`, `useCategories()`, `useSubcategories()` — onSnapshot hooks
- `apps/user-web/src/lib/filterPois.ts` — pure filtering logic (category, subcategory AND/OR, search); unit tested + mutation tested
- `apps/user-web/src/lib/openingStatus.ts` — opening hours display logic; unit tested + mutation tested
- `apps/user-web/src/types/index.ts` — Poi, Category, Subcategory interfaces

## Component / Data Flow

```
App.tsx (owns state: selectedCategories, selectedSubcategories, searchQuery, selectedPoi)
  ├─ Sidebar (desktop, md+, hidden on mobile)
  │    └─ SearchBar, CategoryGrid, SubcategoryFilter, SidebarFooter
  ├─ MapView
  │    └─ APIProvider > Map > PoiMarker[] (one per filtered POI)
  ├─ BottomSheet (mobile only, < md)
  │    └─ collapsed: ChipRow + count | expanded: full filter UI
  └─ PoiDetailPanel (when selectedPoi != null)

Data: Firestore onSnapshot → usePois/useCategories/useSubcategories → filterPois() → filteredPois
Clicks: PoiMarker.onClick → App.handlePoiClick → sets selectedPoi + writes to clicks collection
```

## Patterns & Conventions

- All filter state lifted to App.tsx — no Redux/Zustand
- Map library: `@vis.gl/react-google-maps` with `AdvancedMarker` (NOT deprecated BasicMarker)
- All marker styling is **inline CSS** in PoiMarker.tsx — no external CSS classes
- `useMap()` hook must be called inside a child of `<Map>`, not a sibling
- Emulator connection gated on `VITE_USE_EMULATOR === 'true'` (NOT `import.meta.env.DEV`)
- POI query filters `where("active", "==", true)` — inactive POIs never reach frontend
- Mobile uses `100dvh` (not `100vh`) for full-screen layouts
- RTL: first flex child renders on RIGHT; collapsed indicators point LEFT (◂)

## Gotchas

- `useMap()` requires being inside `<Map>` children — if you need map instance access, extract an inner component
- Map default zoom is 8 (whole country), min zoom 8, restricted to ISRAEL_BOUNDS
- `mapId="DEMO_MAP_ID"` enables AdvancedMarker without a real Cloud Map ID
- Subcategory filter logic: AND-across-groups, OR-within-group, scoped per category
- `toggleCategory` also clears selectedSubcategories for the deselected category
- PoiDetailPanel uses responsive Tailwind classes for desktop (side panel) vs mobile (bottom slide-up)
