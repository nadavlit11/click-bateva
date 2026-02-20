import { useState, useMemo } from "react";
import { Sidebar } from "./components/Sidebar/Sidebar";
import { MapView } from "./components/MapView/MapView";
import { DEFAULT_CATEGORIES, DEFAULT_TAGS, MOCK_POIS } from "./data/defaults";
import { filterPois } from "./lib/filterPois";
import type { Category, Tag } from "./types";

// Phase 4.2: mock data. Replace with usePois/useCategories/useTags hooks once Firestore has data.
const pois = MOCK_POIS;
const categories: Category[] = DEFAULT_CATEGORIES;
const tags: Tag[] = DEFAULT_TAGS;

export default function App() {
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");

  const filteredPois = useMemo(
    () => filterPois(pois, { selectedCategories, selectedTags, searchQuery }),
    [selectedCategories, selectedTags, searchQuery]
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
      <main className="flex-1 h-full">
        <MapView
          pois={filteredPois}
          categories={categories}
          onPoiClick={() => {}}
        />
      </main>
    </div>
  );
}
