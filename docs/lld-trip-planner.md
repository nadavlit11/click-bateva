# LLD: "תכנן טיול" — Trip Planner Tab (Manual + AI)

> **Status**: Phase 1 implemented (2026-02-27) — travel_agent role, manual trip planning, share link
> **Started**: 2026-02-27
> **Prototype**: `/tmp/prototype-ai-trip-planner.html`

---

## Context

The trip planner is gated behind a new `travel_agent` role. Travel agents log into the user-web app, get a second "תכנן טיול" tab in the sidebar, build itineraries by adding POIs from the map, and share trips with clients via a read-only link (`/trip/:tripId`). Anonymous visitors browse the map without any account.

- **Phase 1 — Manual planning** (implemented): Agent adds POIs → trip panel shows day distribution → share with client via URL.
- **Phase 2 — AI planning** (planned): Natural-language chat to build/modify itinerary (Gemini + function calling).

---

## Firestore Data Model

**Collection**: `trips/{tripId}` (auto-ID — one agent can have multiple trips; `tripId` doubles as the share token)

```typescript
interface TripPoiEntry {
  poiId: string;
  addedAt: number; // ms timestamp for ordering
}

interface TripDoc {
  id: string;          // Firestore document ID (= share token)
  agentId: string;     // travel agent's uid
  clientName: string;  // label e.g. "משפחת לוי"
  pois: TripPoiEntry[];
  numDays: number;     // 1–5 (UI), default: 2
  isShared: boolean;   // false until agent clicks "שתף"
  createdAt: number;   // ms timestamp
  updatedAt: number;
}
```

**Security rules** (implemented in `firestore.rules`):
```
function isTravelAgent() {
  return isSignedIn() && userRole() == 'travel_agent';
}

match /trips/{tripId} {
  allow read, update, delete: if isTravelAgent() && resource.data.agentId == request.auth.uid;
  allow create: if isTravelAgent() && request.resource.data.agentId == request.auth.uid;
  allow read: if resource.data.isShared == true;  // public share link
}
```

Client writes directly — no Cloud Function needed for trip CRUD.

---

## Day Distribution Algorithm (pure function, `apps/user-web/src/lib/tripUtils.ts`)

```typescript
// Returns day numbers (1-indexed) for each item slot
export function distributeToDays(count: number, numDays: number): number[] {
  if (count === 0 || numDays === 0) return [];
  const perDay = Math.ceil(count / numDays);
  return Array.from({ length: count }, (_, i) => Math.floor(i / perDay) + 1);
}
```

Example: 7 POIs, 3 days → days = [1,1,1, 2,2,2, 3]

---

## TypeScript Types (`apps/user-web/src/types/index.ts`)

```typescript
export interface TripPoiEntry {
  poiId: string;
  addedAt: number; // ms timestamp for ordering
}

export interface TripDoc {
  id: string;          // Firestore document ID (= share token)
  agentId: string;     // travel agent's uid
  clientName: string;  // label e.g. "משפחת לוי"
  pois: TripPoiEntry[];
  numDays: number;     // 1–5 (UI), default: 2
  isShared: boolean;   // false until agent clicks "שתף"
  createdAt: number;   // ms timestamp
  updatedAt: number;
}

// Phase 2 (not needed for Phase 1):
export interface TripPlanItem { poiId: string; emoji: string; label: string; distanceNote?: string; }
export interface TripDay     { title: string; subtitle: string; emoji: string; items: TripPlanItem[]; }
export interface TripPlan    { days: TripDay[]; reply: string; totalBudget?: string; }
export interface AiMessage   { role: 'user' | 'ai'; content: string; plan?: TripPlan; }
```

---

## Phase 1: Manual Trip Planning

### 1A. New hook: `useTrip` (`apps/user-web/src/hooks/useTrip.ts`)

Real-time Firestore subscription: `query(collection("trips"), where("agentId", "==", uid), orderBy("updatedAt", "desc"), limit(1))` — fetches the agent's most recently updated trip (or null if none). Returns `trip: TripDoc | null` and helpers:

```typescript
function useTrip(uid: string | null) {
  // query trips where agentId==uid, orderBy updatedAt desc, limit 1
  // returns: { trip, addPoi, removePoi, setNumDays, setClientName, clearTrip, shareTrip, newTrip }
}

// addPoi: if no trip, createTrip() first; then arrayUnion({ poiId, addedAt: Date.now() })
// removePoi: arrayRemove exact entry (by poiId match)
// setNumDays: updateDoc { numDays }
// setClientName: updateDoc { clientName }
// clearTrip: updateDoc { pois: [] }
// shareTrip: updateDoc { isShared: true } → returns tripId for URL
// newTrip: addDoc with defaults → becomes the new active trip (latest updatedAt)
```

### 1B. Sidebar tabs (`apps/user-web/src/components/Sidebar/Sidebar.tsx`)

Add a tab row (two tabs) between AppHeader and the scrollable content:

```
[🗂️ מסנן] [✈️ תכנן טיול]
```

- `activeTab: 'filter' | 'trip'` — local `useState`
- When `activeTab === 'filter'`: existing `CategoryGrid` + `SidebarFooter` (unchanged)
- When `activeTab === 'trip'`: show `<TripPanel>` (new component)
- Tab badge: show count of POIs in trip on the "תכנן טיול" tab (e.g. "✈️ תכנן טיול · 4")

Pass `trip` + helpers down from App.tsx via props.

### 1C. Trip panel (`apps/user-web/src/components/Sidebar/TripPanel.tsx`)

**Empty state** (no POIs yet):
```
✈️ (icon)
"הטיול שלך מחכה"
"פתח מקום במפה ולחץ 'הוסף לטיול'"
```

**With POIs** — two sections:

**Days selector row**:
```
מספר ימים:  [1] [2] [3] [4] [5]
```
Clicking a number calls `setNumDays(n)`.

**Trip plan** (scrollable):
- Day headers (teal gradient, same style as category day headers in prototype) with day title + emoji
- POI items: category icon + POI name + number badge + remove (×) button
- Clicking a POI item → highlights marker on map + opens detail panel

**Footer row** (fixed at bottom):
```
[🗑️ נקה הכל]    [📤 שתף]    [🧭 ניווט]
```

**Phase 2**: AI button intentionally omitted from Phase 1 — added only when Phase 2 is implemented.

### 1D. POI Detail Panel: "הוסף לטיול" button (`apps/user-web/src/components/MapView/PoiDetailPanel.tsx`)

Add a new action icon to the quick-action row (alongside call/navigate/WhatsApp):

- If POI **not** in trip: show "הוסף" icon (+ sign, using category color)
- If POI **already** in trip: show "הסר" icon (checkmark / trash, with green fill)
- On click: calls `addPoi(poi.id)` or `removePoi(poi.id)` from `useTrip`

Requires: `tripPoiIds: Set<string>` + `onAddToTrip` + `onRemoveFromTrip` props passed from App.tsx.

### 1E. Map — numbered markers + route (`apps/user-web/src/components/MapView/`)

**`PoiMarker.tsx`** — new props:
- `tripNumber?: number` — when set, render amber teardrop pin with the number instead of the standard colored pin
- `isDimmed?: boolean` — when trip plan is active but this POI is not in it, render at 30% opacity

**`MapView.tsx`** — new props:
- `orderedTripPoiIds: string[]` — flattened ordered list from trip (drives numbering + dimming)
- When non-empty: pass `tripNumber={i+1}` to matching markers, `isDimmed={true}` to others
- Render `<TripRouteOverlay>` (new component)

**`TripRouteOverlay.tsx`** — new component:
- Receives ordered `Poi[]` objects (looked up from `orderedTripPoiIds`)
- Renders a Google Maps `Polyline` (via `@vis.gl/react-google-maps`) connecting them in order
- Style: dashed amber (#F59E0B), 3px weight, animated stroke-dashoffset on mount
- Cleans up when trip is empty

### 1F. App.tsx changes

```typescript
const { trip, addPoi, removePoi, setNumDays, clearTrip } = useTrip(currentUser?.uid ?? null);

// Derived: ordered list of poiIds for map
const orderedTripPoiIds = useMemo(
  () => [...(trip?.pois ?? [])].sort((a, b) => a.addedAt - b.addedAt).map(p => p.poiId),
  [trip]
);
const tripPoiIdSet = useMemo(() => new Set(orderedTripPoiIds), [orderedTripPoiIds]);
```

Pass to `Sidebar`: `trip`, `orderedTripPoiIds`, `addPoi`, `removePoi`, `setNumDays`, `clearTrip`
Pass to `PoiDetailPanel`: `tripPoiIds={tripPoiIdSet}`, `onAddToTrip={addPoi}`, `onRemoveFromTrip={removePoi}`
Pass to `MapView`: `orderedTripPoiIds`

---

## Phase 2: AI Planning (future, same tab)

After Phase 1 ships, add to the bottom of `TripPanel`:

- Enable the "שפר עם AI" button → opens AI chat input in the same panel
- AI reads the current `trip.pois` + their full POI data
- AI can add/remove/reorder pois (same Firestore writes, just done via Cloud Function)
- User can also start fresh: "תכנן לי 2 לילות בגולן" → AI populates trip from scratch

### AI Architecture

**Provider**: Gemini 1.5 Flash via `firebase/ai` SDK (Firebase-native, no new vendor)
**Auth**: logged-in users only
**Rate limit**: 20 queries/day/user, tracked in Firestore `ai_usage/{uid}`

**New Cloud Function**: `planTrip` (`functions/src/ai.ts`)
- Input: `{ query: string, history: AiMessage[], userLocation?: { lat, lng } }`
- Tools available to LLM:
  - `searchPoisByRegion(regionName, categoryId?)` → hardcoded bbox lookup for named regions (גולן, גליל, כנרת, etc.) → Firestore geo query
  - `searchPoisNearRoute(originLat, originLng, destLat, destLng, categoryId?)` → Google Maps Directions API polyline → in-memory haversine filter within 10km corridor
  - `searchPoisByVector(query, topK?)` → Firestore `findNearest` on `embedding` field
- Output: `{ reply: string, plan?: TripPlan }`

**Why function calling + route-aware geo queries?**
A pure vector/semantic search fails for "restaurant on the way to Galil" when the user is in Beer Sheva — the restaurant needs to be near the *route*, not just near Galil. The LLM calls `searchPoisNearRoute(beerSheva, galil, "restaurant")` → backend uses Google Maps Directions API to get the polyline → finds POIs within 10km of that path.

**Vector search setup** (for `searchPoisByVector` tool):
- One-time batch: `scripts/generate-embeddings.mjs` — generates Gemini `text-embedding-004` vectors for all POIs, writes `embedding` field to Firestore
- `onPoiWrite` Cloud Function trigger — regenerates embedding when a POI is edited
- Firestore vector index on `points_of_interest.embedding`

**System prompt** (Hebrew, enforces JSON output):
- Role: expert travel guide for northern Israel
- Respond in Hebrew
- Output strict JSON: `{ "reply": "...", "plan": { "days": [...] } }`
- Each plan item must reference a real `poiId` from tool results

---

## Files to Create / Modify

### Phase 1

| File | Action |
|---|---|
| `firestore.rules` | Modify — add `trips/{userId}` rule |
| `apps/user-web/src/types/index.ts` | Modify — add `TripPoiEntry`, `TripDoc` |
| `apps/user-web/src/hooks/useTrip.ts` | **Create** — Firestore real-time trip hook |
| `apps/user-web/src/lib/tripUtils.ts` | **Create** — `distributeToDays` pure function |
| `apps/user-web/src/App.tsx` | Modify — `useTrip`, `orderedTripPoiIds`, pass props |
| `apps/user-web/src/components/Sidebar/Sidebar.tsx` | Modify — tab row, TripPanel rendering |
| `apps/user-web/src/components/Sidebar/TripPanel.tsx` | **Create** — trip plan UI |
| `apps/user-web/src/components/MapView/PoiDetailPanel.tsx` | Modify — "הוסף לטיול" button |
| `apps/user-web/src/components/MapView/MapView.tsx` | Modify — `orderedTripPoiIds` prop, route overlay |
| `apps/user-web/src/components/MapView/PoiMarker.tsx` | Modify — `tripNumber`, `isDimmed` props |
| `apps/user-web/src/components/MapView/TripRouteOverlay.tsx` | **Create** — amber polyline |
| `firestore-tests/src/firestore.rules.test.ts` | Modify — add trips collection tests |

### Phase 2 (additional)

| File | Action |
|---|---|
| `functions/src/ai.ts` | **Create** — `planTrip` + `onPoiWrite` |
| `functions/src/index.ts` | Modify — export new functions |
| `firestore.rules` | Modify — add `ai_usage` collection rule |
| `firestore.indexes.json` | Modify — vector index on `points_of_interest.embedding` |
| `scripts/generate-embeddings.mjs` | **Create** — one-time batch embedding script |
| `apps/user-web/src/types/index.ts` | Modify — add `TripPlan`, `TripDay`, `AiMessage` |
| `apps/user-web/src/components/Sidebar/TripPanel.tsx` | Modify — enable AI chat section |

---

## Verification

### Phase 1

1. `npm run dev` in `apps/user-web` — app loads without errors
2. Log in as a standard user
3. Sidebar shows two tabs: "מסנן" and "תכנן טיול"
4. "מסנן" tab: existing category filter works exactly as before
5. Click a POI on map → detail panel opens with "הוסף לטיול" button
6. Click "הוסף לטיול" → button changes to "הסר" → "תכנן טיול" tab badge shows count 1
7. Switch to "תכנן טיול" tab → POI appears in day 1
8. Add 4 more POIs → trip shows 5 items across 2 days (default)
9. Change days to 3 → items redistribute correctly
10. Numbered amber markers appear on map (1–5); other POIs dimmed
11. Amber dashed polyline connects markers in order
12. Click plan item → highlights on map
13. Remove a POI → list updates, map updates, Firestore updated
14. Refresh page → trip persists (loaded from Firestore)
15. Log out → trip data not accessible
16. `cd firestore-tests && npm test` — all 50 + new trips tests pass
17. `/code-review` skill must pass all 4 subagents before committing
