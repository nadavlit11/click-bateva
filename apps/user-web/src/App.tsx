import { useState, useMemo } from "react";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "./lib/firebase";
import { Sidebar } from "./components/Sidebar/Sidebar";
import { MapView } from "./components/MapView/MapView";
import { PoiDetailPanel } from "./components/MapView/PoiDetailPanel";
import { BottomSheet } from "./components/BottomSheet/BottomSheet";
import { usePois, useCategories, useTags } from "./hooks/useFirestoreData";
import { filterPois } from "./lib/filterPois";
import type { Poi } from "./types";

export default function App() {
  const { pois } = usePois();
  const categories = useCategories();
  const tags = useTags();

  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPoi, setSelectedPoi] = useState<Poi | null>(null);
  const [sheetExpanded, setSheetExpanded] = useState(false);

  const filteredPois = useMemo(
    () => filterPois(pois, { selectedCategories, selectedTags, searchQuery }),
    [pois, selectedCategories, selectedTags, searchQuery]
  );

  function handleCategoryToggle(id: string) {
    setSelectedCategories((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function handleTagToggle(id: string) {
    setSelectedTags((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function handleClearAll() {
    setSelectedCategories(new Set());
    setSelectedTags(new Set());
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
        categories={categories}
        tags={tags}
        selectedCategories={selectedCategories}
        selectedTags={selectedTags}
        searchQuery={searchQuery}
        filteredCount={filteredPois.length}
        onCategoryToggle={handleCategoryToggle}
        onTagToggle={handleTagToggle}
        onSearchChange={setSearchQuery}
        onClearAll={handleClearAll}
      />
      <main className="flex-1 h-full relative">
        <MapView
          pois={filteredPois}
          categories={categories}
          onPoiClick={handlePoiClick}
        />
        <BottomSheet
          className="md:hidden absolute bottom-0 left-0 right-0 z-20"
          expanded={sheetExpanded}
          onExpandedChange={setSheetExpanded}
          categories={categories}
          tags={tags}
          selectedCategories={selectedCategories}
          selectedTags={selectedTags}
          searchQuery={searchQuery}
          filteredCount={filteredPois.length}
          onCategoryToggle={handleCategoryToggle}
          onTagToggle={handleTagToggle}
          onSearchChange={setSearchQuery}
          onClearAll={handleClearAll}
        />
        {selectedPoi && (
          <PoiDetailPanel
            poi={selectedPoi}
            category={categories.find(c => c.id === selectedPoi.categoryId)}
            tags={tags.filter(t => selectedPoi.tags.includes(t.id))}
            onClose={() => setSelectedPoi(null)}
          />
        )}
      </main>
    </div>
  );
}
