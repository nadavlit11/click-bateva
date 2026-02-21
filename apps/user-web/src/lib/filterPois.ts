import type { Poi, Tag } from "../types";

export interface PoiFilter {
  selectedCategories: Set<string>;
  selectedTags: Set<string>;
  searchQuery: string;
  tags: Tag[]; // needed to resolve each selected tag's group
}

export function filterPois(pois: Poi[], filter: PoiFilter): Poi[] {
  const { selectedCategories, selectedTags, searchQuery, tags } = filter;

  // Build a map of group → selected tag IDs in that group
  const tagById = Object.fromEntries(tags.map(t => [t.id, t]));
  const selectedByGroup = new Map<string | null, Set<string>>();
  for (const tagId of selectedTags) {
    const group = tagById[tagId]?.group ?? null;
    if (!selectedByGroup.has(group)) selectedByGroup.set(group, new Set());
    selectedByGroup.get(group)!.add(tagId);
  }
  const groupFilters = Array.from(selectedByGroup.values());

  return pois.filter((poi) => {
    const matchesCategory =
      selectedCategories.size === 0 || selectedCategories.has(poi.categoryId);
    // AND across groups, OR within each group
    const matchesTags =
      selectedTags.size === 0 ||
      groupFilters.every(groupSet => poi.tags.some(t => groupSet.has(t)));
    const matchesSearch = !searchQuery || poi.name.includes(searchQuery);
    return matchesCategory && matchesTags && matchesSearch;
  });
}
