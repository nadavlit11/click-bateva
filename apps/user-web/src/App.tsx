import { useState, useMemo } from "react";
import { Sidebar } from "./components/Sidebar/Sidebar";
import { MapView } from "./components/MapView/MapView";
import { PoiDetailPanel } from "./components/MapView/PoiDetailPanel";
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

  return (
    <div className="h-screen w-screen flex overflow-hidden">
      <Sidebar
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
          onPoiClick={setSelectedPoi}
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
