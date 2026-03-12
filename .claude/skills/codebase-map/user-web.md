# User-Web Map App

## Key Files

- `app/src/user-web/MapApp.tsx` — root map component (mounted at `/*` in root App.tsx); owns ALL state (filters, selected POI, sheet expand, sidebarOpen, hasVisited, mapKey), renders Sidebar + MapView + BottomSheet + PoiDetailPanel + FloatingSearch + SubcategoryModal + MapIndicator + EmptyMapOverlay
- `app/src/user-web/components/MapView/MapView.tsx` — APIProvider + Map wrapper, renders PoiMarker via MarkerClusterer; builds consolidated `catMaps` and `subMaps` lookup objects (single-pass memoized); **cascade resolution** per POI: `poi > subcategory > category` for color, borderColor, markerSize, iconUrl. `useIcons()` called here (at MapView level), `iconMetaMap` passed as prop. Helper: `firstSubMatch(sids, map)` (module-level function).
- `app/src/user-web/components/MapView/PoiMarker.tsx` — AdvancedMarker with icon image or 📍 emoji fallback; name label pill visible at zoom >= 8; inline styles only. Props: `color` (glow), `borderColor` (ring via `box-shadow: 0 0 0 2.5px`), `markerSize` (cascade-resolved), `iconFlicker` (adds `animate-pulse`), `iconSize` (icon-level override), `isDimmed`. Size priority: `iconSize > markerSize > pinSize (24)`. **Selected state**: white ring + colored glow (`boxShadow: 0 0 0 4px white, 0 0 12px 4px ${color}88`) + `poi-pulse` CSS animation (keyframes in `index.css`, NOT inline `<style>`).
- `app/src/user-web/components/WhatsAppShareButton.tsx` — shared WhatsApp share `<a>` with inline SVG + site URL. Props: `showLabel` (bool, default true), `className`.
- `app/src/user-web/components/MapView/PoiDetailPanel.tsx` — slide-up detail panel (**w-[340px]** on desktop); **infinite-looping image carousel** (tripled array + silent jump on wrap, direction:ltr on track); quick-action row (call, navigate, whatsapp, website, facebook); **phone icon on desktop opens modal** (not tel: link — detected via `!('ontouchstart' in window)`); restaurant buttons; **hike category app links** (Google Play + App Store for TravelAya, via `HIKE_CATEGORY_ID`); renders `**bold**` in description via `renderBoldText`; capacity/people shown as "משתתפים" (not "אנשים"); sticky close button; click-outside-to-close. **`preview` prop** (optional): static positioning, hides close button, skips ESC handler, uses tel: link instead of phone modal — used by business dashboard PoiEditPage for live preview.
- `app/src/user-web/components/FloatingSearch.tsx` — **search dropdown** (NEW): debounced input, dropdown shows POI name matches (local) + location results (Google Geocoding REST API); clicking a POI opens detail panel; clicking a location calls `onLocationSelect` to pan map; map is NEVER filtered by text
- `app/src/user-web/components/Sidebar/Sidebar.tsx` — desktop filter panel (collapsible, hidden when `sidebarOpen === false`); children: AppHeader, CategoryGrid, SidebarFooter. Search moved to FloatingSearch. Shows "לוח ניהול ←" link for admin/content_manager and "פורטל עסקים ←" for business_user. **Footer order**: Dashboard links → Share (WhatsApp) + Contact row → Login/Register (gray) or Logout/Change password → Terms link.
- `app/src/user-web/components/Sidebar/CategoryGrid.tsx` — category buttons in 2-col grid; each cell is a fixed-height wrapper (`min-h-[84px]`, `flex flex-col justify-end`) that reserves space for a "סינון תוצאות" filter header button above selected categories (appears when `isSelected && hasSubs`). Cards are `h-[56px]` fixed. Filter header has `rounded-t-2xl` + `border-b-0`, card has conditional `rounded-b-2xl` when header shown — visually continuous. Clicking filter header opens SubcategoryModal.
- `app/src/user-web/components/SubcategoryModal.tsx` — modal showing subcategories for a specific category, all checked by default, toggle individual subs
- `app/src/user-web/components/BottomSheet/BottomSheet.tsx` — mobile panel (filters + auth); **fully hidden when collapsed** (`translateY(100%)`); opened via hamburger button next to search bar; expanded = ~70vh with category grid + auth buttons. Trip tab hidden when trip props not provided.
- `app/src/user-web/components/BottomSheet/BottomSheetFooter.tsx` — mobile auth footer; **button order**: Share (WhatsApp) + Contact row → Login/Register (gray `text-gray-500`) or Logout/Change password → Terms link.
- `app/src/user-web/hooks/useFirestoreData.ts` — `usePois(mapKey)`, `useCategories()`, `useSubcategories()`, `useIcons()` — onSnapshot hooks; `usePois` accepts a `MapKey` ('agents' | 'groups') to filter by `maps.<mapKey>.active == true`. `useIcons()` returns `IconMeta[]` (`{ id, size, flicker }`) from the `icons` collection. **`snapshotToPois` mapper** must include ALL `Poi` fields (including `isHomeMap`) — missing fields cause silent bugs where filters always return empty.
- `app/src/user-web/hooks/useTrip.ts` — `useTrip(uid)` hook: dual storage — Firestore for logged-in users, localStorage for anonymous. Auto-migrates localStorage trip to Firestore on login. Returns `{ trip, addPoi, removePoi, movePoi, addDay, setClientName, clearTrip, shareTrip, newTrip }`. **Currently disabled in production** — hook call commented out in MapApp.tsx, trip props not passed to Sidebar/BottomSheet/PoiDetailPanel. Shared trip view (`/trip/:id`) still works via its own render path.
- `app/src/hooks/useAuth.tsx` — **context-based** auth hook (shared by all 3 sections); `AuthProvider` at App.tsx root runs one `onAuthStateChanged` listener; returns `{ user, role, loading, login, logout }`. Re-exported via `app/src/hooks/useAuth.ts` barrel.
- `app/src/user-web/components/RegisterModal.tsx` — registration request modal (sends via Cloud Function `sendRegistrationRequest`); business/agent toggle; **T&C checkboxes**: contact consent + terms acceptance (loads `settings/terms` doc for URL); submit disabled until both checked
- `app/src/user-web/components/LoginModal.tsx` — modal dialog for email/password login; used by Sidebar and BottomSheet
- `app/src/user-web/components/ChangePasswordModal.tsx` — modal for logged-in users to change password; reauthenticates with current password then calls `updatePassword`; includes password strength meter; auto-closes after 2s on success
- `app/src/user-web/lib/passwordStrength.ts` — password validation (`isPasswordValid`: 8+ chars, letter, number) + strength meter utilities (weak/medium/strong labels, colors, widths); copy of admin's version
- `app/src/user-web/components/ContactUsModal.tsx` — "Contact Us" modal with WhatsApp, Call (desktop: show number, mobile: tel:), Email actions; contact info fetched from `settings/contact`
- `app/src/user-web/hooks/useContactInfo.ts` — `useContactInfo()` hook: one-time fetch of `settings/contact` doc, returns `{ phone, email }` or null
- `app/src/lib/firebase.ts` — shared Firebase init (all 3 sections); emulator gated on `VITE_USE_EMULATOR === 'true'`; exports `auth`, `db`
- `app/src/user-web/lib/filterPois.ts` — pure filtering logic (category, subcategory AND/OR); **search removed** — no longer filters by text; unit tested + mutation tested
- `app/src/user-web/lib/openingStatus.ts` — opening hours display logic; exports `getOpeningStatusText()` (string) and `isCurrentlyOpen()` (boolean predicate); unit tested (52 tests) + mutation tested
- `app/src/user-web/lib/renderBoldText.tsx` — simple `**bold**` parser; handles unmatched delimiters gracefully
- `app/src/user-web/lib/constants.ts` — shared constants: `MAP_LABELS` (Hebrew: "מפת מפיקים", "מפת קבוצות", "מפת משפחות"), `FOOD_CATEGORY_ID`, `HIKE_CATEGORY_ID`
- `app/src/user-web/components/MapIndicator.tsx` — mobile-only map switcher (visible to travel_agent/admin/content_manager with agents tab, otherwise groups+families only); positioned bottom-left above bottom sheet
- `app/src/user-web/components/MapView/EmptyMapOverlay.tsx` — first-visit onboarding overlay; shown via `showOnboarding` bool in App.tsx (`!poisLoading && selectedCategories.size === 0 && tripPoiIdSet.size === 0 && !hasVisited`). Desktop: animated right-pointing arrow. Mobile: card only — arrow is rendered in App.tsx co-located with the menu button (flex-col child, bounces upward). **Has `onClose` prop**: X button + click-outside-to-close (card divs stop propagation); closing sets `hasVisited=true` in localStorage + state.
- `app/src/user-web/types/index.ts` — Poi (+ whatsapp, iconUrl, iconId, capacity, minPeople, maxPeople, location nullable, isHomeMap), Category (+ order, locationless?), Subcategory (+ iconUrl) interfaces
- `app/src/user-web/components/OpeningHoursDisplay.tsx` — **shared expandable opening hours component**: collapsible with arrow toggle, day-by-day breakdown, today highlighted with green/red status dot, "by appointment" mode. Props: `openingHours: Record<string, DayHours | null> | string | null`. Used by ServicesPage ServiceCards.
- `app/src/user-web/pages/ServicesPage.tsx` — **locationless POIs page** (route `/services`): **grouped by subcategory** (section headers, not flat grid); uses usePois/useCategories/useSubcategories; inline ServiceCard with contact actions; **search bar** (filters by name across all groups), **ABC sort** (Hebrew locale), **image carousel** (ImageCarousel component), **facebook button**, **desktop phone modal** (isDesktop detection), **expandable opening hours** (via `<OpeningHoursDisplay>`), **video player** (first video), **min/max people** display as "משתתפים" (not "אנשים"), **xl:grid-cols-4** for 4-col laptop layout. Lazy-loaded from App.tsx.
- `app/src/lib/urlUtils.ts` — shared `safeHttpUrl(raw)`: validates URL uses http(s) protocol, returns href or null. Used by ServicesPage and PoiDetailPanel.

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
  │    └─ Cascade resolution (POI > subcategory > category): iconUrl, color, borderColor, markerSize
  ├─ BottomSheet (mobile only, < md; receives auth props for login/logout buttons; trip tab hidden — props not passed)
  │    └─ collapsed: ChipRow + count | expanded: category grid with subcategory modal triggers + LoginModal trigger
  ├─ SubcategoryModal (opened per-category from CategoryGrid badge click)
  └─ PoiDetailPanel (when selectedPoi != null; click outside closes)

Data: Firestore onSnapshot → usePois(mapKey)/useCategories/useSubcategories → mapPois (location !== null) → filteredPois (isHomeMap POIs when no category selected + hasVisited, else filterPois())
Map switching: travel_agent/admin/content_manager can see agents map (tab order: agents | groups | families in RTL); travel_agent defaults to 'agents', others default to 'groups'. **mapKey persisted to localStorage** (`click-bateva:mapKey`) — restored on refresh via `resolveMapKey(role)` helper (validates saved value + guards "agents" for non-privileged users). usePois queries where maps.<mapKey>.active == true.
filterPois: category + subcategory filters ONLY — no text search
Categories sorted by `order` field before rendering.
When category toggled ON: all its subcategories auto-selected.
Locationless category: `cat.locationless === true` → clicking navigates to `/services` instead of toggling map filter. POIs with `location: null` excluded from map/search via `mapPois` memo.
ServicesPage: standalone route at `/services`, uses `position: fixed; inset: 0; overflow-y-auto` to override global `body { overflow: hidden }`. Features: image carousel (inline style physical positioning for RTL arrows), YouTube embed via `getYouTubeId()`, subcategory chips, ABC sort, search, phone modal (desktop), WhatsApp/Facebook/website buttons.
Clicks: PoiMarker.onClick → App.handlePoiClick → sets selectedPoi + writes to clicks collection (suppressed for admin/cm, and for business_user on own POI)
```

## Patterns & Conventions

- All filter state lifted to App.tsx — no Redux/Zustand
- Map library: `@vis.gl/react-google-maps` with `AdvancedMarker` (NOT deprecated BasicMarker)
- All marker styling is **inline CSS** in PoiMarker.tsx — no external CSS classes
- `useMap()` hook must be called inside a child of `<Map>`, not a sibling
- Emulator connection gated on `VITE_USE_EMULATOR === 'true'` (NOT `import.meta.env.DEV`)
- POI query filters `where("maps.<mapKey>.active", "==", true)` — inactive POIs for the current map never reach frontend
- Auth: `useAuth()` context hook (AuthProvider at App.tsx root) provides `{ user, role, loading }`. **Single `onAuthStateChanged` listener for the whole app** — do NOT add new listeners in components. `firebase.ts` exports `auth` (Firebase Auth instance). LoginModal handles general email/password sign-in (all roles). ChangePasswordModal (`app/src/components/ChangePasswordModal.tsx`) handles password change for logged-in users (reauthenticate + updatePassword); user-web imports via `app/src/user-web/components/ChangePasswordModal.tsx` re-export. Map key default: `travel_agent` → `'agents'`, all others → `'groups'`. Agents tab visible to `travel_agent`, `admin`, `content_manager`. Click analytics suppressed for admin/content_manager (all clicks) and business_user (own POI only) — enforced both client-side (`App.tsx`) and server-side (`firestore.rules`).
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
- **isHomeMap field**: must be mapped in `snapshotToPois` (useFirestoreData.ts) — if missing, `mapPois.filter(p => p.isHomeMap)` always returns `[]` and home-map POIs never appear. This was a real bug fixed in this batch.
- **CSS keyframes for map markers**: `@keyframes poi-pulse` lives in `app/src/index.css` (global). NEVER put `<style>` tags or keyframe definitions inside frequently-rendered components like PoiMarker — hundreds of duplicate `<style>` tags get injected into DOM.
- **RTL + `flex-row-reverse` double-flip:** In an RTL document, flex already reverses item order. Adding `flex-row-reverse` reverses it back to LTR physical order. To force specific physical ordering in RTL, use `style={{ direction: "ltr" }}` on the flex container and `style={{ direction: "rtl" }}` on text children.
- **Filter persistence:** `selectedCategories` and `selectedSubcategories` are persisted to localStorage (`click-bateva:selectedCategories`, `click-bateva:selectedSubcategories`). On auth change (login/logout), filters are reset to empty. `hasVisited` flag (`click-bateva:hasVisited`) controls first-visit overlay — set in `handleCategoryToggle` and search `onInputCapture`, NOT in a useEffect (lint rule blocks setState in effects).
- **Map tab persistence:** `mapKey` persisted to `click-bateva:mapKey` in localStorage. Restored on mount and auth change via `resolveMapKey(role)` helper (module-level function in MapApp.tsx). Guards: rejects "agents" for users without `canSeeAgents`, validates against `VALID_MAP_KEYS` array, falls back to role-based default.
