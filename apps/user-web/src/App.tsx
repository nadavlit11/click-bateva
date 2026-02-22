import { useState, useMemo, lazy, Suspense } from "react";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "./lib/firebase";
import { reportError } from "./lib/errorReporting";
import { Sidebar } from "./components/Sidebar/Sidebar";
import { MapView } from "./components/MapView/MapView";
import { BottomSheet } from "./components/BottomSheet/BottomSheet";
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

  const filteredPois = useMemo(
    () => filterPois(pois, {
      selectedCategories,
      selectedSubcategories,
      searchQuery,
      subcategories,
    }),
    [pois, selectedCategories, selectedSubcategories, searchQuery, subcategories]
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
      <Sidebar
        className="hidden md:flex"
        categories={categories}
        subcategories={subcategories}
        selectedCategories={selectedCategories}
        selectedSubcategories={selectedSubcategories}
        searchQuery={searchQuery}
        filteredCount={filteredPois.length}
        onCategoryToggle={handleCategoryToggle}
        onSubcategoryToggle={handleSubcategoryToggle}
        onSearchChange={setSearchQuery}
        onClearAll={handleClearAll}
      />
      <main className="flex-1 h-full relative">
        <MapView
          pois={filteredPois}
          categories={categories}
          selectedPoiId={selectedPoi?.id ?? null}
          onPoiClick={handlePoiClick}
        />

        <BottomSheet
          className="md:hidden absolute bottom-0 left-0 right-0 z-20"
          expanded={sheetExpanded}
          onExpandedChange={setSheetExpanded}
          categories={categories}
          subcategories={subcategories}
          selectedCategories={selectedCategories}
          selectedSubcategories={selectedSubcategories}
          searchQuery={searchQuery}
          filteredCount={filteredPois.length}
          onCategoryToggle={handleCategoryToggle}
          onSubcategoryToggle={handleSubcategoryToggle}
          onSearchChange={setSearchQuery}
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
              category={categories.find(c => c.id === selectedPoi.categoryId)}
              onClose={() => setSelectedPoi(null)}
            />
          </Suspense>
        )}
      </main>
    </div>
  );
}
