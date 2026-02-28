import { useState, useMemo, lazy, Suspense } from "react";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "./lib/firebase";
import { reportError } from "./lib/errorReporting";
import { Sidebar } from "./components/Sidebar/Sidebar";
import { MapView } from "./components/MapView/MapView";
import { BottomSheet } from "./components/BottomSheet/BottomSheet";
import { SubcategoryModal } from "./components/SubcategoryModal";
import { FloatingSearch } from "./components/FloatingSearch";
import { usePois, useCategories, useSubcategories } from "./hooks/useFirestoreData";
import { useMapSettings } from "./hooks/useMapSettings";
import { filterPois } from "./lib/filterPois";
import type { Poi } from "./types";

const PoiDetailPanel = lazy(() => import("./components/MapView/PoiDetailPanel").then(m => ({ default: m.PoiDetailPanel })));

const recentClicks = new Map<string, number>();
const CLICK_DEBOUNCE_MS = 3000;

export default function App() {
  const { pois, loading: poisLoading } = usePois();
  const categories = useCategories();
  const subcategories = useSubcategories();
  const pinSize = useMapSettings();

  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());
  const [selectedSubcategories, setSelectedSubcategories] = useState<Set<string>>(new Set());
  const [selectedPoi, setSelectedPoi] = useState<Poi | null>(null);
  const [focusLocation, setFocusLocation] = useState<{ lat: number; lng: number; zoom: number } | null>(null);
  const [sheetExpanded, setSheetExpanded] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [subcategoryModalCategoryId, setSubcategoryModalCategoryId] = useState<string | null>(null);

  const filteredPois = useMemo(
    () => filterPois(pois, {
      selectedCategories,
      selectedSubcategories,
      subcategories,
    }),
    [pois, selectedCategories, selectedSubcategories, subcategories]
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
      // Clear subcategories of this category when deselecting
      const catSubIds = subcategories.filter(s => s.categoryId === id).map(s => s.id);
      setSelectedSubcategories(prev => {
        const next = new Set(prev);
        catSubIds.forEach(sid => next.delete(sid));
        return next;
      });
    } else {
      // Auto-select all subcategories when enabling a category
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
      addDoc(collection(db, "clicks"), {
        poiId: poi.id,
        categoryId: poi.categoryId,
        timestamp: serverTimestamp(),
      }).catch((err) => reportError(err, { source: 'App.handlePoiClick' }));
    }
    setSelectedPoi(poi);
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
          focusLocation={focusLocation}
          onFocusConsumed={() => setFocusLocation(null)}
          pinSize={pinSize}
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
        <div className={`absolute top-3 z-10 end-3 ${!sidebarOpen ? "start-16" : "start-3"} md:start-auto md:w-80`}>
          <FloatingSearch
            pois={pois}
            mapsApiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY}
            onPoiSelect={handlePoiClick}
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
    </div>
  );
}
