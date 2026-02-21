import { useState, useMemo } from "react";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "./lib/firebase";
import { Sidebar } from "./components/Sidebar/Sidebar";
import { MapView } from "./components/MapView/MapView";
import { PoiDetailPanel } from "./components/MapView/PoiDetailPanel";
import { BottomSheet } from "./components/BottomSheet/BottomSheet";
import { usePois, useCategories, useTags, useSubcategories } from "./hooks/useFirestoreData";
import { filterPois } from "./lib/filterPois";
import { MOCK_POIS, MOCK_CATEGORIES, MOCK_TAGS, MOCK_SUBCATEGORIES } from "./data/mockData";
import type { Poi } from "./types";

export default function App() {
  const { pois, loading: poisLoading } = usePois();
  const categories = useCategories();
  const tags = useTags();
  const subcategories = useSubcategories();

  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const [selectedSubcategories, setSelectedSubcategories] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPoi, setSelectedPoi] = useState<Poi | null>(null);
  const [sheetExpanded, setSheetExpanded] = useState(false);
  const [showMocks, setShowMocks] = useState(false);

  const effectivePois          = showMocks ? [...pois, ...MOCK_POIS]                   : pois;
  const effectiveCategories    = showMocks ? [...categories, ...MOCK_CATEGORIES]       : categories;
  const effectiveTags          = showMocks ? [...tags, ...MOCK_TAGS]                   : tags;
  const effectiveSubcategories = showMocks ? [...subcategories, ...MOCK_SUBCATEGORIES] : subcategories;

  const filteredPois = useMemo(
    () => filterPois(effectivePois, {
      selectedCategories,
      selectedTags,
      selectedSubcategories,
      searchQuery,
      subcategories: effectiveSubcategories,
    }),
    [effectivePois, selectedCategories, selectedTags, selectedSubcategories, searchQuery, effectiveSubcategories]
  );

  function handleCategoryToggle(id: string) {
    const isCurrentlySelected = selectedCategories.has(id);
    setSelectedCategories(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
    if (isCurrentlySelected) {
      // Clear subcategories of this category when deselecting
      const catSubIds = effectiveSubcategories.filter(s => s.categoryId === id).map(s => s.id);
      setSelectedSubcategories(prev => {
        const next = new Set(prev);
        catSubIds.forEach(sid => next.delete(sid));
        return next;
      });
    }
  }

  function handleTagToggle(id: string) {
    setSelectedTags((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function handleSubcategoryToggle(id: string) {
    setSelectedSubcategories((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function handleClearAll() {
    setSelectedCategories(new Set());
    setSelectedTags(new Set());
    setSelectedSubcategories(new Set());
    setSearchQuery("");
  }

  function handlePoiClick(poi: Poi) {
    addDoc(collection(db, "clicks"), {
      poiId: poi.id,
      categoryId: poi.categoryId,
      timestamp: serverTimestamp(),
    }).catch((err) => console.error("Failed to log POI click:", err));
    setSelectedPoi(poi);
  }

  return (
    <div className="h-dvh w-screen flex overflow-hidden">
      <Sidebar
        className="hidden md:flex"
        categories={effectiveCategories}
        tags={effectiveTags}
        subcategories={effectiveSubcategories}
        selectedCategories={selectedCategories}
        selectedTags={selectedTags}
        selectedSubcategories={selectedSubcategories}
        searchQuery={searchQuery}
        filteredCount={filteredPois.length}
        onCategoryToggle={handleCategoryToggle}
        onTagToggle={handleTagToggle}
        onSubcategoryToggle={handleSubcategoryToggle}
        onSearchChange={setSearchQuery}
        onClearAll={handleClearAll}
      />
      <main className="flex-1 h-full relative">
        <MapView
          pois={filteredPois}
          categories={effectiveCategories}
          selectedPoiId={selectedPoi?.id ?? null}
          onPoiClick={handlePoiClick}
        />
        {import.meta.env.DEV && (
          <button
            onClick={() => setShowMocks(m => !m)}
            className="absolute top-4 right-4 z-30 px-3 py-1.5 rounded-full text-xs font-semibold shadow-lg transition-colors"
            style={{ background: showMocks ? "#4CAF50" : "#374151", color: "white" }}
          >
            {showMocks ? "✓ מוקים פעיל (200)" : "הצג מוקים"}
          </button>
        )}
        <BottomSheet
          className="md:hidden absolute bottom-0 left-0 right-0 z-20"
          expanded={sheetExpanded}
          onExpandedChange={setSheetExpanded}
          categories={effectiveCategories}
          tags={effectiveTags}
          subcategories={effectiveSubcategories}
          selectedCategories={selectedCategories}
          selectedTags={selectedTags}
          selectedSubcategories={selectedSubcategories}
          searchQuery={searchQuery}
          filteredCount={filteredPois.length}
          onCategoryToggle={handleCategoryToggle}
          onTagToggle={handleTagToggle}
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
          <PoiDetailPanel
            poi={selectedPoi}
            category={effectiveCategories.find(c => c.id === selectedPoi.categoryId)}
            tags={effectiveTags.filter(t => selectedPoi.tags.includes(t.id))}
            onClose={() => setSelectedPoi(null)}
          />
        )}
      </main>
    </div>
  );
}
