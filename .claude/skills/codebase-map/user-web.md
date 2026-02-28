# User-Web Map App

## Key Files

- `apps/user-web/src/App.tsx` — root component, owns ALL state (filters, selected POI, sheet expand, sidebarOpen), renders Sidebar + MapView + BottomSheet + PoiDetailPanel + FloatingSearch + SubcategoryModal
- `apps/user-web/src/components/MapView/MapView.tsx` — APIProvider + Map wrapper, renders PoiMarker via MarkerClusterer; builds subcategory icon lookup; sorts categories by `order`; tracks zoom level for name pill visibility
- `apps/user-web/src/components/MapView/PoiMarker.tsx` — AdvancedMarker with **white circle bubble** (36px, icon inside 22px); name label pill visible at zoom >= 8; inline styles only; accepts resolved `iconUrl` (poi → subcategory → category fallback chain); fallback = 📍 emoji in white circle
- `apps/user-web/src/components/MapView/PoiDetailPanel.tsx` — slide-up detail panel; **infinite-looping image carousel** (tripled array + silent jump on wrap, direction:ltr on track); quick-action row (call, navigate, whatsapp, website, facebook); **phone icon on desktop opens modal** (not tel: link — detected via `!('ontouchstart' in window)`); restaurant buttons; renders `**bold**` in description via `renderBoldText`; sticky close button; click-outside-to-close
- `apps/user-web/src/components/FloatingSearch.tsx` — **search dropdown** (NEW): debounced input, dropdown shows POI name matches (local) + location results (Google Geocoding REST API); clicking a POI opens detail panel; clicking a location calls `onLocationSelect` to pan map; map is NEVER filtered by text
- `apps/user-web/src/components/Sidebar/Sidebar.tsx` — desktop filter panel (collapsible, hidden when `sidebarOpen === false`); children: AppHeader, CategoryGrid, SidebarFooter. Search moved to FloatingSearch.
- `apps/user-web/src/components/Sidebar/CategoryGrid.tsx` — category buttons with filter icon badge; clicking badge opens SubcategoryModal
- `apps/user-web/src/components/SubcategoryModal.tsx` — modal showing subcategories for a specific category, all checked by default, toggle individual subs
- `apps/user-web/src/components/BottomSheet/BottomSheet.tsx` — mobile filter panel; collapsed peek (120px, category chips + count) / expanded (~70vh, category grid with subcategory modal triggers)
- `apps/user-web/src/hooks/useFirestoreData.ts` — `usePois()`, `useCategories()`, `useSubcategories()` — onSnapshot hooks
- `apps/user-web/src/lib/filterPois.ts` — pure filtering logic (category, subcategory AND/OR); **search removed** — no longer filters by text; unit tested + mutation tested
- `apps/user-web/src/lib/openingStatus.ts` — opening hours display logic; unit tested + mutation tested
- `apps/user-web/src/lib/renderBoldText.tsx` — simple `**bold**` parser; handles unmatched delimiters gracefully
- `apps/user-web/src/types/index.ts` — Poi (+ whatsapp, iconUrl), Category (+ order), Subcategory (+ iconUrl) interfaces

## Component / Data Flow

```
App.tsx (owns state: selectedCategories, selectedSubcategories, focusLocation, selectedPoi, sidebarOpen)
  ├─ FloatingSearch (always visible, absolute positioned over map, top-right)
  │    └─ dropdown: POI name matches (local) + Geocoding API location results
  │    └─ POI click → handlePoiClick; location click → setFocusLocation → MapView pans
  ├─ Sidebar (desktop md+, collapsible; hidden when sidebarOpen=false)
  │    └─ AppHeader, CategoryGrid (with subcategory modal triggers), SidebarFooter
  ├─ MapView (accepts focusLocation prop → ClusteredPoiMarkers → map.moveCamera())
  │    └─ APIProvider > Map > MarkerClusterer > PoiMarker[] (clustered at low zoom, individual at high zoom)
  │    └─ PoiMarker shows name pill at zoom >= 8 (always for unclustered markers)
  │    └─ Icon resolution: poi.iconUrl → subcategory.iconUrl → category.iconUrl (first non-null wins)
  ├─ BottomSheet (mobile only, < md)
  │    └─ collapsed: ChipRow + count | expanded: category grid with subcategory modal triggers
  ├─ SubcategoryModal (opened per-category from CategoryGrid badge click)
  └─ PoiDetailPanel (when selectedPoi != null; click outside closes)

Data: Firestore onSnapshot → usePois/useCategories/useSubcategories → filterPois() → filteredPois
filterPois: category + subcategory filters ONLY — no text search
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
- Image carousel is **infinite-looping**: tripled array + `virtualSlide` state + `skipTransition` ref + `onTransitionEnd` silent-jump. Track has `direction: ltr` (required for correct RTL translateX direction).
- Phone action: desktop (`!('ontouchstart' in window)`) shows modal with number; mobile navigates `tel:`
- FloatingSearch uses Google Geocoding REST API (`maps.googleapis.com/maps/api/geocode/json`) with `VITE_GOOGLE_MAPS_API_KEY` — no extra SDK setup needed
- `focusLocation` prop on MapView → inner ClusteredPoiMarkers uses `map.moveCamera({ center, zoom })` (NOT `panTo+setZoom` — those race)
- `renderBoldText` handles unmatched `**` delimiters by returning raw text
