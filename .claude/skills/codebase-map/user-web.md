# User-Web Map App

## Key Files

- `app/src/user-web/MapApp.tsx` — root map component (mounted at `/*` in root App.tsx); owns ALL state (filters, selected POI, sheet expand, sidebarOpen, hasVisited, mapKey), renders Sidebar + MapView + BottomSheet + PoiDetailPanel + FloatingSearch + SubcategoryModal + MapIndicator + EmptyMapOverlay
- `app/src/user-web/components/MapView/MapView.tsx` — APIProvider + Map wrapper, renders PoiMarker via MarkerClusterer; builds subcategory icon lookup; sorts categories by `order`; tracks zoom level for name pill visibility. **`useIcons()` called here (at MapView level), NOT inside ClusteredPoiMarkers** — `iconMetaMap` passed as prop to avoid listener churn.
- `app/src/user-web/components/MapView/PoiMarker.tsx` — AdvancedMarker with **white circle bubble** (36px, icon inside 22px); name label pill visible at zoom >= 8; inline styles only; accepts resolved `iconUrl` (poi → subcategory → category fallback chain); fallback = 📍 emoji in white circle. Props: `iconFlicker` (adds `animate-pulse`), `iconSize` (overrides pinSize for img), `isDimmed` (reserved for future trip dimming, never passed currently).
- `app/src/user-web/components/WhatsAppShareButton.tsx` — shared WhatsApp share `<a>` with inline SVG + site URL. Props: `showLabel` (bool, default true), `className`.
- `app/src/user-web/components/MapView/PoiDetailPanel.tsx` — slide-up detail panel; **infinite-looping image carousel** (tripled array + silent jump on wrap, direction:ltr on track); quick-action row (call, navigate, whatsapp, website, facebook); **phone icon on desktop opens modal** (not tel: link — detected via `!('ontouchstart' in window)`); restaurant buttons; renders `**bold**` in description via `renderBoldText`; sticky close button; click-outside-to-close
- `app/src/user-web/components/FloatingSearch.tsx` — **search dropdown** (NEW): debounced input, dropdown shows POI name matches (local) + location results (Google Geocoding REST API); clicking a POI opens detail panel; clicking a location calls `onLocationSelect` to pan map; map is NEVER filtered by text
- `app/src/user-web/components/Sidebar/Sidebar.tsx` — desktop filter panel (collapsible, hidden when `sidebarOpen === false`); children: AppHeader, CategoryGrid, SidebarFooter. Search moved to FloatingSearch. Shows "לוח ניהול ←" link for admin/content_manager and "פורטל עסקים ←" for business_user.
- `app/src/user-web/components/Sidebar/CategoryGrid.tsx` — category buttons with filter icon badge; clicking badge opens SubcategoryModal
- `app/src/user-web/components/SubcategoryModal.tsx` — modal showing subcategories for a specific category, all checked by default, toggle individual subs
- `app/src/user-web/components/BottomSheet/BottomSheet.tsx` — mobile panel (filters + trip + auth); **fully hidden when collapsed** (`translateY(100%)`); opened via hamburger button next to search bar; expanded = ~70vh with category grid + trip tab + auth buttons
- `app/src/user-web/hooks/useFirestoreData.ts` — `usePois(mapKey)`, `useCategories()`, `useSubcategories()`, `useIcons()` — onSnapshot hooks; `usePois` accepts a `MapKey` ('agents' | 'groups') to filter by `maps.<mapKey>.active == true`. `useIcons()` returns `IconMeta[]` (`{ id, size, flicker }`) from the `icons` collection.
- `app/src/user-web/hooks/useTrip.ts` — `useTrip(uid)` hook: dual storage — Firestore for logged-in users, localStorage for anonymous. Auto-migrates localStorage trip to Firestore on login. Returns `{ trip, addPoi, removePoi, movePoi, addDay, setClientName, clearTrip, shareTrip, newTrip }`
- `app/src/user-web/hooks/useAuth.ts` — `useAuth()` hook: listens to `onAuthStateChanged`, extracts role from custom claims, returns `{ user, role, loading }`
- `app/src/user-web/components/LoginModal.tsx` — modal dialog for email/password login; used by Sidebar and BottomSheet
- `app/src/user-web/components/ChangePasswordModal.tsx` — modal for logged-in users to change password; reauthenticates with current password then calls `updatePassword`; includes password strength meter; auto-closes after 2s on success
- `app/src/user-web/lib/passwordStrength.ts` — password validation (`isPasswordValid`: 8+ chars, letter, number) + strength meter utilities (weak/medium/strong labels, colors, widths); copy of admin's version
- `app/src/user-web/components/ContactUsModal.tsx` — "Contact Us" modal with WhatsApp, Call (desktop: show number, mobile: tel:), Email actions; contact info fetched from `settings/contact`
- `app/src/user-web/hooks/useContactInfo.ts` — `useContactInfo()` hook: one-time fetch of `settings/contact` doc, returns `{ phone, email }` or null
- `app/src/user-web/lib/firebase.ts` — initializeApp, getFirestore, getAuth; emulator gated on `VITE_USE_EMULATOR`; exports `auth` for login/logout
- `app/src/user-web/lib/filterPois.ts` — pure filtering logic (category, subcategory AND/OR); **search removed** — no longer filters by text; unit tested + mutation tested
- `app/src/user-web/lib/openingStatus.ts` — opening hours display logic; exports `getOpeningStatusText()` (string) and `isCurrentlyOpen()` (boolean predicate); unit tested (52 tests) + mutation tested
- `app/src/user-web/lib/renderBoldText.tsx` — simple `**bold**` parser; handles unmatched delimiters gracefully
- `app/src/user-web/lib/constants.ts` — shared constants: `MAP_LABELS` (Hebrew labels for map keys)
- `app/src/user-web/components/MapIndicator.tsx` — mobile-only map label (non-agent) or map switcher (agent); positioned bottom-left above bottom sheet
- `app/src/user-web/components/MapView/EmptyMapOverlay.tsx` — first-visit onboarding overlay; shown via `showOnboarding` bool in App.tsx (`!poisLoading && selectedCategories.size === 0 && tripPoiIdSet.size === 0 && !hasVisited`). Desktop: animated right-pointing arrow. Mobile: card only — arrow is rendered in App.tsx co-located with the menu button (flex-col child, bounces upward)
- `app/src/user-web/types/index.ts` — Poi (+ whatsapp, iconUrl, iconId, capacity), Category (+ order), Subcategory (+ iconUrl) interfaces

## Component / Data Flow

```
App.tsx (owns state: selectedCategories, selectedSubcategories, focusLocation, selectedPoi, sidebarOpen, hasVisited, mapKey)
  ├─ useAuth() → { user, role, loading } — determines initial map key (travel_agent → 'agents', else → 'groups')
  ├─ usePois(mapKey) — filters POIs by maps.<mapKey>.active == true
  ├─ Filter persistence: selectedCategories/selectedSubcategories saved to localStorage on change, restored on mount
  ├─ First-visit: hasVisited flag (localStorage). EmptyMapOverlay shown only when !hasVisited && no categories selected
  ├─ FloatingSearch (always visible, absolute positioned over map, top-right)
  │    └─ dropdown: POI name matches (local) + Geocoding API location results
  │    └─ POI click → handlePoiClick; location click → setFocusLocation → MapView pans
  ├─ Sidebar (desktop md+, collapsible; hidden when sidebarOpen=false; receives auth props for login/logout buttons)
  │    └─ AppHeader, CategoryGrid (with subcategory modal triggers), LoginModal trigger, SidebarFooter
  ├─ MapView (accepts focusLocation prop → ClusteredPoiMarkers → map.moveCamera())
  │    └─ APIProvider > Map > MarkerClusterer > PoiMarker[] (clustered at low zoom, individual at high zoom)
  │    └─ PoiMarker shows name pill at zoom >= 8 (always for unclustered markers)
  │    └─ Icon resolution: poi.iconUrl → subcategory.iconUrl → category.iconUrl (first non-null wins)
  ├─ BottomSheet (mobile only, < md; receives auth props for login/logout buttons)
  │    └─ collapsed: ChipRow + count | expanded: category grid with subcategory modal triggers + LoginModal trigger
  ├─ SubcategoryModal (opened per-category from CategoryGrid badge click)
  └─ PoiDetailPanel (when selectedPoi != null; click outside closes)

Data: Firestore onSnapshot → usePois(mapKey)/useCategories/useSubcategories → filterPois() → filteredPois
Map switching: travel_agent role → 'agents' map, everyone else → 'groups' map. usePois queries where maps.<mapKey>.active == true.
filterPois: category + subcategory filters ONLY — no text search
Categories sorted by `order` field before rendering.
When category toggled ON: all its subcategories auto-selected.
Clicks: PoiMarker.onClick → App.handlePoiClick → sets selectedPoi + writes to clicks collection (suppressed for admin/cm, and for business_user on own POI)
```

## Patterns & Conventions

- All filter state lifted to App.tsx — no Redux/Zustand
- Map library: `@vis.gl/react-google-maps` with `AdvancedMarker` (NOT deprecated BasicMarker)
- All marker styling is **inline CSS** in PoiMarker.tsx — no external CSS classes
- `useMap()` hook must be called inside a child of `<Map>`, not a sibling
- Emulator connection gated on `VITE_USE_EMULATOR === 'true'` (NOT `import.meta.env.DEV`)
- POI query filters `where("maps.<mapKey>.active", "==", true)` — inactive POIs for the current map never reach frontend
- Auth: `useAuth()` hook provides `{ user, role, loading }`. `firebase.ts` exports `auth` (Firebase Auth instance). LoginModal handles general email/password sign-in (all roles). ChangePasswordModal handles password change for logged-in users (reauthenticate + updatePassword). Map key derived from role: `travel_agent` → `'agents'`, all others → `'groups'`. Click analytics suppressed for admin/content_manager (all clicks) and business_user (own POI only) — enforced both client-side (`App.tsx`) and server-side (`firestore.rules`).
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
- **RTL + `flex-row-reverse` double-flip:** In an RTL document, flex already reverses item order. Adding `flex-row-reverse` reverses it back to LTR physical order. To force specific physical ordering in RTL, use `style={{ direction: "ltr" }}` on the flex container and `style={{ direction: "rtl" }}` on text children.
- **Filter persistence:** `selectedCategories` and `selectedSubcategories` are persisted to localStorage (`click-bateva:selectedCategories`, `click-bateva:selectedSubcategories`). On auth change (login/logout), filters are reset to empty. `hasVisited` flag (`click-bateva:hasVisited`) controls first-visit overlay — set in `handleCategoryToggle` and search `onInputCapture`, NOT in a useEffect (lint rule blocks setState in effects).
