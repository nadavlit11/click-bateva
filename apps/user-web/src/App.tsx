import { useState, useMemo, lazy, Suspense } from "react";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "./lib/firebase";
import { reportError } from "./lib/errorReporting";
import { Sidebar } from "./components/Sidebar/Sidebar";
import { MapView } from "./components/MapView/MapView";
import { BottomSheet } from "./components/BottomSheet/BottomSheet";
import { SubcategoryModal } from "./components/SubcategoryModal";
import { usePois, useCategories, useSubcategories } from "./hooks/useFirestoreData";
import { filterPois } from "./lib/filterPois";
import type { Poi } from "./types";

const PoiDetailPanel = lazy(() => import("./components/MapView/PoiDetailPanel").then(m => ({ default: m.PoiDetailPanel })));

const recentClicks = new Map<string, number>();
const CLICK_DEBOUNCE_MS = 3000;

export default function App() {
  const { pois, loading: poisLoading } = usePois();
  const categories = useCategories();
  const subcategories = useSubcategories();

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

  return (
    <div className="h-dvh w-screen flex overflow-hidden">
      {sidebarOpen && (
        <Sidebar
          className="hidden md:flex"
          categories={sortedCategories}
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
        />

        {/* Floating sidebar toggle (desktop, when sidebar is closed) */}
        {!sidebarOpen && (
          <button
            onClick={() => setSidebarOpen(true)}
            className="hidden md:flex absolute top-3 right-3 z-10 w-10 h-10 bg-white rounded-xl shadow-lg items-center justify-center text-gray-600 hover:bg-gray-50 transition-colors"
            title="פתח תפריט"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        )}

        {/* Floating search */}
        <div className={`absolute top-3 left-3 z-10 ${!sidebarOpen ? "right-16 md:right-auto md:left-auto md:w-80" : "right-3 md:right-auto md:left-auto md:w-80"}`}>
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
