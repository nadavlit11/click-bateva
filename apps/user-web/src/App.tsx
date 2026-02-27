import { useState, useMemo, useEffect, lazy, Suspense } from "react";
import { collection, addDoc, serverTimestamp, doc, getDoc } from "firebase/firestore";
import { onAuthStateChanged, signOut } from "firebase/auth";
import type { User } from "firebase/auth";
import { db, auth } from "./lib/firebase";
import { reportError } from "./lib/errorReporting";
import { Sidebar } from "./components/Sidebar/Sidebar";
import { MapView } from "./components/MapView/MapView";
import { BottomSheet } from "./components/BottomSheet/BottomSheet";
import { SubcategoryModal } from "./components/SubcategoryModal";
import { LoginModal } from "./components/Sidebar/LoginModal";
import { usePois, useCategories, useSubcategories } from "./hooks/useFirestoreData";
import { useTrip } from "./hooks/useTrip";
import { filterPois } from "./lib/filterPois";
import type { Poi, TripDoc } from "./types";

const PoiDetailPanel = lazy(() => import("./components/MapView/PoiDetailPanel").then(m => ({ default: m.PoiDetailPanel })));

const recentClicks = new Map<string, number>();
const CLICK_DEBOUNCE_MS = 3000;

export default function App() {
  const { pois, loading: poisLoading } = usePois();
  const categories = useCategories();
  const subcategories = useSubcategories();

  // ── Auth ────────────────────────────────────────────────────────────────
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loginModalOpen, setLoginModalOpen] = useState(false);

  useEffect(() => {
    return onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        const token = await user.getIdTokenResult();
        setUserRole((token.claims.role as string) ?? null);
      } else {
        setUserRole(null);
      }
    });
  }, []);

  const isTravelAgent = userRole === "travel_agent";

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
          agentId: d.agentId,
          clientName: d.clientName ?? "",
          pois: d.pois ?? [],
          numDays: d.numDays ?? 2,
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

  // ── Trip (agent editing) ─────────────────────────────────────────────────
  const { trip, addPoi, removePoi, setNumDays, setClientName, clearTrip, shareTrip, newTrip } = useTrip(
    isTravelAgent ? (currentUser?.uid ?? null) : null
  );

  const activeTrip = tripShareId ? sharedTrip : trip;

  const orderedTripPoiIds = useMemo(
    () => [...(activeTrip?.pois ?? [])].sort((a, b) => a.addedAt - b.addedAt).map(p => p.poiId),
    [activeTrip]
  );
  const tripPoiIdSet = useMemo(() => new Set(orderedTripPoiIds), [orderedTripPoiIds]);

  // ── Filter state ─────────────────────────────────────────────────────────
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());
  const [selectedSubcategories, setSelectedSubcategories] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPoi, setSelectedPoi] = useState<Poi | null>(null);
  const [sheetExpanded, setSheetExpanded] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [subcategoryModalCategoryId, setSubcategoryModalCategoryId] = useState<string | null>(null);

  const filteredPois = useMemo(
    () => filterPois(pois, {
      selectedCategories,
      selectedSubcategories,
      searchQuery,
      subcategories,
    }),
    [pois, selectedCategories, selectedSubcategories, searchQuery, subcategories]
  );

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
    setSearchQuery("");
  }

  function handleMapClick() {
    if (selectedPoi) setSelectedPoi(null);
  }

  function handlePoiClick(poi: Poi) {
    const now = Date.now();
    const lastClick = recentClicks.get(poi.id);
    if (!lastClick || now - lastClick > CLICK_DEBOUNCE_MS) {
      recentClicks.set(poi.id, now);
      addDoc(collection(db, "clicks"), {
        poiId: poi.id,
        categoryId: poi.categoryId,
        timestamp: serverTimestamp(),
      }).catch((err) => reportError(err, { source: 'App.handlePoiClick' }));
    }
    setSelectedPoi(poi);
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
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center shadow shrink-0">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
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
          currentUserEmail={currentUser?.email}
          isTravelAgent={isTravelAgent}
          onLoginClick={() => setLoginModalOpen(true)}
          onLogout={() => signOut(auth).catch(err => reportError(err, { source: 'App.signOut' }))}
          trip={trip}
          allPois={pois}
          orderedTripPoiIds={orderedTripPoiIds}
          onRemovePoi={removePoi}
          onSetNumDays={setNumDays}
          onSetClientName={setClientName}
          onClearTrip={clearTrip}
          onShareTrip={shareTrip}
          onNewTrip={newTrip}
          onPoiSelect={handlePoiSelectFromTrip}
        />
      )}
      <main className="flex-1 h-full relative">
        <MapView
          pois={filteredPois}
          categories={sortedCategories}
          subcategories={subcategories}
          selectedPoiId={selectedPoi?.id ?? null}
          onPoiClick={handlePoiClick}
          onMapClick={handleMapClick}
          orderedTripPoiIds={orderedTripPoiIds}
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

        {/* Floating search */}
        <div className={`absolute top-3 z-10 end-3 ${!sidebarOpen ? "start-16" : "start-3"} md:start-auto md:w-80`}>
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="חפש מקום..."
              className="w-full py-2.5 px-4 ps-10 bg-white border border-gray-200 rounded-xl text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-400 shadow-lg"
            />
            <svg className="w-4 h-4 text-gray-400 absolute start-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
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
        />
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
              tripPoiIds={isTravelAgent ? tripPoiIdSet : undefined}
              onAddToTrip={isTravelAgent ? addPoi : undefined}
              onRemoveFromTrip={isTravelAgent ? removePoi : undefined}
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
        <LoginModal onClose={() => setLoginModalOpen(false)} />
      )}
    </div>
  );
}
