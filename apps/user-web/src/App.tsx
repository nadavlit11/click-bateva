import { useState, useEffect, useMemo, useRef, useCallback, lazy, Suspense } from "react";
import { collection, addDoc, serverTimestamp, doc, getDoc } from "firebase/firestore";
import { db } from "./lib/firebase";
import { reportError } from "./lib/errorReporting";
import { Sidebar } from "./components/Sidebar/Sidebar";
import { MapView } from "./components/MapView/MapView";
import { EmptyMapOverlay } from "./components/MapView/EmptyMapOverlay";
import { BottomSheet } from "./components/BottomSheet/BottomSheet";
import { SubcategoryModal } from "./components/SubcategoryModal";
import { FloatingSearch } from "./components/FloatingSearch";
import { LoginModal } from "./components/LoginModal";
import { RegisterModal } from "./components/RegisterModal";
import { usePois, useCategories, useSubcategories } from "./hooks/useFirestoreData";
import { useAuth } from "./hooks/useAuth";
import { useMapSettings } from "./hooks/useMapSettings";
import { useTrip } from "./hooks/useTrip";
import { filterPois } from "./lib/filterPois";
import type { Poi, TripDoc } from "./types";
import type { MapKey } from "./hooks/useFirestoreData";

const PoiDetailPanel = lazy(() => import("./components/MapView/PoiDetailPanel").then(m => ({ default: m.PoiDetailPanel })));

const recentClicks = new Map<string, number>();
const CLICK_DEBOUNCE_MS = 3000;

export default function App() {
  const { user, role, login, logout } = useAuth();
  const mapKey: MapKey = role === "travel_agent" ? "agents" : "groups";
  const { pois, loading: poisLoading } = usePois(mapKey);
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [registerModalOpen, setRegisterModalOpen] = useState(false);
  const categories = useCategories();
  const subcategories = useSubcategories();
  const pinSize = useMapSettings();

  // ── Trip share (client read-only view) ───────────────────────────────────
  const tripShareId = useMemo(() => {
    const match = window.location.pathname.match(/^\/trip\/([^/]+)$/);
    return match?.[1] ?? null;
  }, []);

  const [sharedTrip, setSharedTrip] = useState<TripDoc | null>(null);
  const [sharedTripNotFound, setSharedTripNotFound] = useState(false);
  useEffect(() => {
    if (!tripShareId) return;
    getDoc(doc(db, "trips", tripShareId)).then(snap => {
      if (snap.exists() && snap.data().isShared === true) {
        const d = snap.data();
        setSharedTrip({
          id: snap.id,
          ownerId: d.ownerId,
          clientName: d.clientName ?? "",
          pois: d.pois ?? [],
          numDays: d.numDays ?? 1,
          isShared: d.isShared ?? false,
          createdAt: d.createdAt ?? 0,
          updatedAt: d.updatedAt ?? 0,
        });
      } else {
        setSharedTripNotFound(true);
      }
    }).catch(err => {
      reportError(err, { source: "App.sharedTrip" });
      setSharedTripNotFound(true);
    });
  }, [tripShareId]);

  // ── Trip (all users — Firestore for logged-in, localStorage for anonymous) ─
  const { trip, addPoi, removePoi, movePoi, reorderPoi, addDay, setClientName, clearTrip, shareTrip, newTrip } = useTrip(
    user?.uid ?? null
  );

  // Which day new POIs are added to (1-indexed). Defaults to 1, switches to
  // the new day when the agent adds a day or clicks a day header.
  const [activeDayNumber, setActiveDayNumber] = useState(1);

  // Keep activeDayNumber in bounds whenever numDays changes
  const tripNumDays = trip?.numDays ?? 1;
  const clampedActiveDay = Math.min(activeDayNumber, tripNumDays);

  const handleAddDay = useCallback(async () => {
    await addDay();
    setActiveDayNumber(n => n + 1);
  }, [addDay]);

  const handleNewTrip = useCallback(async () => {
    await newTrip();
    setActiveDayNumber(1);
  }, [newTrip]);

  const handleClearTrip = useCallback(async () => {
    await clearTrip();
    setActiveDayNumber(1);
  }, [clearTrip]);

  const activeTrip = tripShareId ? sharedTrip : trip;

  const orderedTripPoiIds = useMemo(
    () => [...(activeTrip?.pois ?? [])]
      .sort((a, b) => {
        const dayDiff = (a.dayNumber ?? 1) - (b.dayNumber ?? 1);
        return dayDiff !== 0 ? dayDiff : a.addedAt - b.addedAt;
      })
      .map(p => p.poiId),
    [activeTrip]
  );
  const tripPoiIdSet = useMemo(() => new Set(orderedTripPoiIds), [orderedTripPoiIds]);

  // POI IDs for the active day only (for route rendering)
  const activeDayPoiIds = useMemo(() => {
    const dayPois = (activeTrip?.pois ?? [])
      .filter(p => (p.dayNumber ?? 1) === clampedActiveDay)
      .sort((a, b) => a.addedAt - b.addedAt)
      .map(p => p.poiId);
    return dayPois;
  }, [activeTrip, clampedActiveDay]);

  // ── Filter state ─────────────────────────────────────────────────────────
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());
  const [selectedSubcategories, setSelectedSubcategories] = useState<Set<string>>(new Set());
  const [selectedPoi, setSelectedPoi] = useState<Poi | null>(null);
  const [focusLocation, setFocusLocation] = useState<{ lat: number; lng: number; zoom?: number } | null>(null);
  const [sheetExpanded, setSheetExpanded] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [subcategoryModalCategoryId, setSubcategoryModalCategoryId] = useState<string | null>(null);

  // Reset UI state on login/logout (skip initial mount)
  const prevUid = useRef(user?.uid);
  useEffect(() => {
    if (prevUid.current === user?.uid) return;
    prevUid.current = user?.uid;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional reset on auth change (no cascading render)
    setSelectedCategories(new Set());
    setSelectedSubcategories(new Set());
    setSelectedPoi(null);
    setSubcategoryModalCategoryId(null);
    setFocusLocation(null);
    setLoginModalOpen(false);
    setRegisterModalOpen(false);
    setSheetExpanded(false);
  }, [user?.uid]);

  const filteredPois = useMemo(
    () => filterPois(pois, {
      selectedCategories,
      selectedSubcategories,
      subcategories,
    }),
    [pois, selectedCategories, selectedSubcategories, subcategories]
  );

  // Always show trip POIs on the map, even when their category isn't selected
  const displayPois = useMemo(() => {
    if (tripPoiIdSet.size === 0) return filteredPois;
    const filteredIds = new Set(filteredPois.map(p => p.id));
    const missingTripPois = pois.filter(p => tripPoiIdSet.has(p.id) && !filteredIds.has(p.id));
    return missingTripPois.length > 0 ? [...filteredPois, ...missingTripPois] : filteredPois;
  }, [filteredPois, pois, tripPoiIdSet]);

  const sortedCategories = useMemo(
    () => [...categories].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    [categories]
  );

  function handleCategoryToggle(id: string) {
    const isCurrentlySelected = selectedCategories.has(id);
    setSelectedCategories(prev => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      return next;
    });
    if (isCurrentlySelected) {
      const catSubIds = subcategories.filter(s => s.categoryId === id).map(s => s.id);
      setSelectedSubcategories(prev => {
        const next = new Set(prev);
        catSubIds.forEach(sid => next.delete(sid));
        return next;
      });
    } else {
      const catSubIds = subcategories.filter(s => s.categoryId === id).map(s => s.id);
      setSelectedSubcategories(prev => {
        const next = new Set(prev);
        catSubIds.forEach(sid => next.add(sid));
        return next;
      });
    }
  }

  function handleSubcategoryToggle(id: string) {
    setSelectedSubcategories((prev) => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      return next;
    });
  }

  function handleClearAll() {
    setSelectedCategories(new Set());
    setSelectedSubcategories(new Set());
  }

  function handleMapClick() {
    if (selectedPoi) setSelectedPoi(null);
  }

  function handlePoiClick(poi: Poi) {
    const now = Date.now();
    const lastClick = recentClicks.get(poi.id);
    if (!lastClick || now - lastClick > CLICK_DEBOUNCE_MS) {
      recentClicks.set(poi.id, now);

      // Also enforced server-side in firestore.rules (clicks collection)
      const suppressClick =
        role === "admin" ||
        role === "content_manager" ||
        (role === "business_user" && poi.businessId === user?.uid);

      if (!suppressClick) {
        addDoc(collection(db, "clicks"), {
          poiId: poi.id,
          categoryId: poi.categoryId,
          timestamp: serverTimestamp(),
        }).catch((err) => reportError(err, { source: 'App.handlePoiClick' }));
      }
    }
    setSelectedPoi(poi);
  }

  function handleSearchPoiSelect(poi: Poi) {
    handlePoiClick(poi);
    setFocusLocation({ lat: poi.location.lat, lng: poi.location.lng });
  }

  function handlePoiSelectFromTrip(poiId: string) {
    const poi = pois.find(p => p.id === poiId);
    if (poi) setSelectedPoi(poi);
  }

  // ── Client read-only view ─────────────────────────────────────────────────
  if (tripShareId) {
    if (sharedTripNotFound) {
      return (
        <div className="h-dvh w-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="text-3xl mb-3">🔍</div>
            <p className="text-gray-600 text-sm font-medium">הטיול לא נמצא</p>
            <p className="text-gray-400 text-xs mt-1">הקישור אינו תקין או שהטיול אינו משותף</p>
          </div>
        </div>
      );
    }
    if (!sharedTrip) {
      return (
        <div className="h-dvh w-screen flex items-center justify-center bg-gray-50">
          <div className="text-gray-400 text-sm">טוען טיול...</div>
        </div>
      );
    }
    return (
      <div className="h-dvh w-screen flex overflow-hidden">
        <aside
          className="w-80 h-full bg-white flex flex-col z-10 overflow-hidden shrink-0 hidden md:flex"
          style={{ boxShadow: "4px 0 20px rgba(0,0,0,0.08)" }}
        >
          <div className="p-5 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <img src="/icon-192.png" alt="קליק בטבע" className="w-10 h-10 rounded-xl object-contain shrink-0" />
              <div>
                <h1 className="text-lg font-bold text-gray-800">קליק בטבע</h1>
                <p className="text-xs text-gray-500">טיול מתוכנן עבורך ✈️</p>
              </div>
            </div>
            {sharedTrip.clientName && (
              <p className="mt-2 text-sm font-medium text-gray-700">{sharedTrip.clientName}</p>
            )}
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-4">
            <p className="text-xs text-gray-400 mb-3">{orderedTripPoiIds.length} מקומות בטיול</p>
            {orderedTripPoiIds.map((id, i) => {
              const poi = pois.find(p => p.id === id);
              const cat = sortedCategories.find(c => c.id === poi?.categoryId);
              if (!poi) return null;
              return (
                <div
                  key={id}
                  className="flex items-center gap-2 py-2 px-2 rounded-xl hover:bg-gray-50 cursor-pointer"
                  onClick={() => handlePoiSelectFromTrip(id)}
                >
                  <span className="w-5 h-5 rounded-full bg-amber-400 text-white text-xs flex items-center justify-center font-bold shrink-0">
                    {i + 1}
                  </span>
                  <span className="text-sm text-gray-700 font-medium truncate">{poi.name}</span>
                  {cat && <span className="text-xs text-gray-400 shrink-0">{cat.name}</span>}
                </div>
              );
            })}
          </div>
        </aside>
        <main className="flex-1 h-full relative">
          <MapView
            pois={pois}
            categories={sortedCategories}
            subcategories={subcategories}
            selectedPoiId={selectedPoi?.id ?? null}
            onPoiClick={handlePoiClick}
            onMapClick={handleMapClick}
            orderedTripPoiIds={orderedTripPoiIds}
          />
          {selectedPoi && (
            <Suspense fallback={null}>
              <PoiDetailPanel
                poi={selectedPoi}
                category={sortedCategories.find(c => c.id === selectedPoi.categoryId)}
                onClose={() => setSelectedPoi(null)}
              />
            </Suspense>
          )}
        </main>
      </div>
    );
  }

  return (
    <div className="h-dvh w-screen flex overflow-hidden">
      {sidebarOpen && (
        <Sidebar
          className="hidden md:flex"
          categories={sortedCategories}
          subcategories={subcategories}
          selectedCategories={selectedCategories}
          filteredCount={filteredPois.length}
          onCategoryToggle={handleCategoryToggle}
          onSubcategoryFilter={setSubcategoryModalCategoryId}
          onClearAll={handleClearAll}
          onClose={() => setSidebarOpen(false)}
          isLoggedIn={!!user}
          onLoginClick={() => setLoginModalOpen(true)}
          onRegisterClick={() => setRegisterModalOpen(true)}
          onLogout={logout}
          trip={trip}
          allPois={pois}
          orderedTripPoiIds={orderedTripPoiIds}
          activeDayNumber={clampedActiveDay}
          onSetActiveDayNumber={setActiveDayNumber}
          onRemovePoi={removePoi}
          onReorderPoi={reorderPoi}
          onAddDay={handleAddDay}
          onSetClientName={setClientName}
          onClearTrip={handleClearTrip}
          onShareTrip={shareTrip}
          onNewTrip={handleNewTrip}
          onPoiSelect={handlePoiSelectFromTrip}
        />
      )}
      <main className="flex-1 h-full relative">
        <MapView
          pois={displayPois}
          categories={sortedCategories}
          subcategories={subcategories}
          selectedPoiId={selectedPoi?.id ?? null}
          onPoiClick={handlePoiClick}
          onMapClick={handleMapClick}
          focusLocation={focusLocation}
          onFocusConsumed={() => setFocusLocation(null)}
          pinSize={pinSize}
          highlightPoi={selectedPoi}
          orderedTripPoiIds={orderedTripPoiIds}
          activeDayPoiIds={activeDayPoiIds}
        />

        {/* Floating sidebar toggle (desktop, when sidebar is closed) */}
        {!sidebarOpen && (
          <button
            onClick={() => setSidebarOpen(true)}
            className="hidden md:flex absolute top-3 start-3 z-20 w-10 h-10 bg-white rounded-xl shadow-lg items-center justify-center text-gray-600 hover:bg-gray-50 transition-colors"
            title="פתח תפריט"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        )}

        {/* Floating search — on mobile stretches full width; on desktop fixed-width on physical left (end in RTL) */}
        <div className={`absolute top-3 z-10 end-3 ${!sidebarOpen ? "start-16" : "start-3"} md:start-auto md:w-80`} onFocusCapture={() => setSelectedPoi(null)}>
          <FloatingSearch
            key={user?.uid ?? "anon"}
            pois={pois}
            categories={sortedCategories}
            subcategories={subcategories}
            mapsApiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY}
            onPoiSelect={handleSearchPoiSelect}
            onLocationSelect={setFocusLocation}
          />
        </div>

        <BottomSheet
          className="md:hidden absolute bottom-0 left-0 right-0 z-20"
          expanded={sheetExpanded}
          onExpandedChange={setSheetExpanded}
          categories={sortedCategories}
          subcategories={subcategories}
          selectedCategories={selectedCategories}
          selectedSubcategories={selectedSubcategories}
          filteredCount={filteredPois.length}
          onCategoryToggle={handleCategoryToggle}
          onSubcategoryFilter={setSubcategoryModalCategoryId}
          onClearAll={handleClearAll}
          isLoggedIn={!!user}
          onLoginClick={() => setLoginModalOpen(true)}
          onRegisterClick={() => setRegisterModalOpen(true)}
          onLogout={logout}
          trip={trip}
          allPois={pois}
          orderedTripPoiIds={orderedTripPoiIds}
          activeDayNumber={clampedActiveDay}
          onSetActiveDayNumber={setActiveDayNumber}
          onRemovePoi={removePoi}
          onReorderPoi={reorderPoi}
          onAddDay={handleAddDay}
          onSetClientName={setClientName}
          onClearTrip={handleClearTrip}
          onShareTrip={shareTrip}
          onNewTrip={handleNewTrip}
          onPoiSelect={handlePoiSelectFromTrip}
        />
        {!poisLoading && selectedCategories.size === 0 && tripPoiIdSet.size === 0 && <EmptyMapOverlay />}
        {poisLoading && (
          <div className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none">
            <div className="bg-white/80 rounded-xl px-5 py-3 shadow text-gray-500 text-sm font-medium">
              טוען...
            </div>
          </div>
        )}
        {selectedPoi && (
          <Suspense fallback={null}>
            <PoiDetailPanel
              poi={selectedPoi}
              category={sortedCategories.find(c => c.id === selectedPoi.categoryId)}
              onClose={() => setSelectedPoi(null)}
              tripPoiIds={tripPoiIdSet}
              onAddToTrip={(id) => addPoi(id, clampedActiveDay)}
              onRemoveFromTrip={removePoi}
            />
          </Suspense>
        )}
      </main>

      {subcategoryModalCategoryId && (
        <SubcategoryModal
          categoryId={subcategoryModalCategoryId}
          categories={sortedCategories}
          subcategories={subcategories}
          selectedSubcategories={selectedSubcategories}
          onToggle={handleSubcategoryToggle}
          onClose={() => setSubcategoryModalCategoryId(null)}
        />
      )}

      {loginModalOpen && (
        <LoginModal
          onLogin={login}
          onClose={() => setLoginModalOpen(false)}
        />
      )}

      {registerModalOpen && (
        <RegisterModal onClose={() => setRegisterModalOpen(false)} />
      )}
    </div>
  );
}
