# User-Web Map App

## Key Files

- `apps/user-web/src/App.tsx` — root component, owns ALL state (filters, selected POI, sheet expand, sidebarOpen), renders Sidebar + MapView + BottomSheet + PoiDetailPanel + FloatingSearch + SubcategoryModal
- `apps/user-web/src/components/MapView/MapView.tsx` — APIProvider + Map wrapper, renders PoiMarker via MarkerClusterer; builds subcategory icon lookup; sorts categories by `order`; tracks zoom level for name pill visibility
- `apps/user-web/src/components/MapView/PoiMarker.tsx` — AdvancedMarker with CSS teardrop pin (28px) + white pill name label (visible only at zoom >= 14); inline styles only; accepts resolved `iconUrl` (poi → subcategory → category fallback chain)
- `apps/user-web/src/components/MapView/PoiDetailPanel.tsx` — slide-up detail panel; image carousel (object-fit: contain); quick-action row (call, navigate, whatsapp via `poi.whatsapp`, website, facebook); restaurant buttons; renders `**bold**` in description via `renderBoldText`; sticky close button; click-outside-to-close
- `apps/user-web/src/components/Sidebar/Sidebar.tsx` — desktop filter panel (collapsible, hidden when `sidebarOpen === false`); children: AppHeader, CategoryGrid, SidebarFooter. Search moved to FloatingSearch.
- `apps/user-web/src/components/Sidebar/CategoryGrid.tsx` — category buttons with filter icon badge; clicking badge opens SubcategoryModal
- `apps/user-web/src/components/SubcategoryModal.tsx` — modal showing subcategories for a specific category, all checked by default, toggle individual subs
- `apps/user-web/src/components/BottomSheet/BottomSheet.tsx` — mobile filter panel; collapsed peek (120px, category chips + count) / expanded (~70vh, category grid with subcategory modal triggers)
- `apps/user-web/src/hooks/useFirestoreData.ts` — `usePois()`, `useCategories()`, `useSubcategories()` — onSnapshot hooks
- `apps/user-web/src/lib/filterPois.ts` — pure filtering logic (category, subcategory AND/OR, search); unit tested + mutation tested
- `apps/user-web/src/lib/openingStatus.ts` — opening hours display logic; unit tested + mutation tested
- `apps/user-web/src/lib/renderBoldText.tsx` — simple `**bold**` parser; handles unmatched delimiters gracefully
- `apps/user-web/src/types/index.ts` — Poi (+ whatsapp, iconUrl), Category (+ order), Subcategory (+ iconUrl) interfaces

## Component / Data Flow

```
App.tsx (owns state: selectedCategories, selectedSubcategories, searchQuery, selectedPoi, sidebarOpen)
  ├─ FloatingSearch (always visible, absolute positioned over map, top-right)
  ├─ Sidebar (desktop md+, collapsible via toggle button; hidden when sidebarOpen=false)
  │    └─ AppHeader, CategoryGrid (with subcategory modal triggers), SidebarFooter
  ├─ MapView
  │    └─ APIProvider > Map > MarkerClusterer > PoiMarker[] (clustered at low zoom, individual at high zoom)
  │    └─ PoiMarker shows name pill only at zoom >= 14
  │    └─ Icon resolution: poi.iconUrl → subcategory.iconUrl → category.iconUrl (first non-null wins)
  ├─ BottomSheet (mobile only, < md)
  │    └─ collapsed: ChipRow + count | expanded: category grid with subcategory modal triggers
  ├─ SubcategoryModal (opened per-category from CategoryGrid badge click)
  └─ PoiDetailPanel (when selectedPoi != null; click outside closes)

Data: Firestore onSnapshot → usePois/useCategories/useSubcategories → filterPois() → filteredPois
Categories sorted by `order` field before rendering.
When category toggled ON: all its subcategories auto-selected.
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
- `toggleCategory` also clears selectedSubcategories for the deselected category; when toggling ON, auto-populates all subcategories
- PoiDetailPanel uses responsive Tailwind classes for desktop (side panel) vs mobile (bottom slide-up)
- MarkerClusterer: uses `@googlemaps/markerclusterer` with `useMap()` inside a child component. Markers are registered/unregistered via ref callbacks.
- WhatsApp action uses `poi.whatsapp` field (not `poi.phone`); includes suggested text parameter
- Image carousel uses `object-fit: contain` (not `cover`) with gray background fill
- `renderBoldText` handles unmatched `**` delimiters by returning raw text
