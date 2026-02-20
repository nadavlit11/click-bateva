import type { Poi } from "../types";

export interface PoiFilter {
  selectedCategories: Set<string>;
  selectedTags: Set<string>;
  searchQuery: string;
}

export function filterPois(pois: Poi[], filter: PoiFilter): Poi[] {
  const { selectedCategories, selectedTags, searchQuery } = filter;
  return pois.filter((poi) => {
    const matchesCategory =
      selectedCategories.size === 0 || selectedCategories.has(poi.categoryId);
    const matchesTags =
      selectedTags.size === 0 || poi.tags.some((t) => selectedTags.has(t));
    const matchesSearch = !searchQuery || poi.name.includes(searchQuery);
    return matchesCategory && matchesTags && matchesSearch;
  });
}
