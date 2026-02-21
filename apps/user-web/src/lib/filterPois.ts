import type { Poi, Subcategory } from "../types";

export interface PoiFilter {
  selectedCategories: Set<string>;
  selectedTags: Set<string>;           // location tag IDs only
  selectedSubcategories: Set<string>;  // category-scoped refinement IDs
  searchQuery: string;
  subcategories: Subcategory[];        // for categoryId + group lookup
}

export function filterPois(pois: Poi[], filter: PoiFilter): Poi[] {
  const { selectedCategories, selectedTags, selectedSubcategories, searchQuery, subcategories } = filter;

  // Build: category → group → selected subcategory IDs
  // AND-across-subcategory-groups, OR-within-group, scoped per category
  const subsByCategory = new Map<string, Map<string | null, Set<string>>>();
  for (const subId of selectedSubcategories) {
    const sub = subcategories.find(s => s.id === subId);
    if (!sub) continue;
    if (!subsByCategory.has(sub.categoryId)) subsByCategory.set(sub.categoryId, new Map());
    const groupMap = subsByCategory.get(sub.categoryId)!;
    const group = sub.group ?? null;
    if (!groupMap.has(group)) groupMap.set(group, new Set());
    groupMap.get(group)!.add(subId);
  }

  return pois.filter((poi) => {
    const matchesCategory =
      selectedCategories.size === 0 || selectedCategories.has(poi.categoryId);

    // Location tags: OR across all selected location tags
    const matchesLocation =
      selectedTags.size === 0 || poi.tags.some(t => selectedTags.has(t));

    // Subcategories: AND-across-groups, OR-within-group — scoped to this POI's category
    // Hike: subsByCategory has no entry for hike's categoryId → catGroups is undefined → passes
    const catGroups = subsByCategory.get(poi.categoryId);
    const matchesSubcategory =
      !catGroups ||
      Array.from(catGroups.values()).every(
        groupSet => (poi.subcategoryIds ?? []).some(s => groupSet.has(s))
      );

    const matchesSearch = !searchQuery || poi.name.includes(searchQuery);

    return matchesCategory && matchesLocation && matchesSubcategory && matchesSearch;
  });
}
